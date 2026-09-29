-- 학습 진도 클라우드 백업 스키마 (Supabase SQL Editor 에서 1회 실행)
-- 랭킹과 동일하게 world_quiz_ 프리픽스 사용, 익명 인증(auth.uid()) 기준
-- 흐름: 저장 = 본인 uid 로 upsert(코드는 서버가 1회 발급) / 복원 = 코드로 RPC 조회

-- 1) 테이블
create table if not exists public.world_quiz_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- 2) RLS — 정책을 두지 않아 직접 접근은 전부 차단. 아래 security definer RPC 로만 접근한다.
--    (코드만 알면 남의 백업을 읽을 수 있으므로 select 를 열어두면 안 된다)
alter table public.world_quiz_backups enable row level security;

-- 3) 코드 발급 — 헷갈리는 글자(0/O/1/I) 제외한 32자 알파벳 8자리
--    코드를 아는 사람은 누구나 그 백업을 복원할 수 있으므로 예측 가능한 random() 대신
--    암호학적 난수(gen_random_bytes)를 쓴다. 256 % 32 = 0 이라 mod 편향도 없다.
create extension if not exists pgcrypto;

create or replace function public.world_quiz_gen_backup_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(8);
  result text := '';
  i int;
begin
  for i in 0..7 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return result;
end $$;

-- 4) RPC — 백업 저장. 코드는 최초 1회만 발급하고 이후 저장에서는 유지한다.
create or replace function public.world_quiz_save_backup(p_payload jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select code into v_code from public.world_quiz_backups where user_id = v_uid;

  if v_code is null then
    -- unique 충돌 시 재시도 (확률상 거의 없지만 무한 루프는 막는다)
    for i in 1..5 loop
      begin
        v_code := public.world_quiz_gen_backup_code();
        insert into public.world_quiz_backups(user_id, code, payload, updated_at)
        values (v_uid, v_code, p_payload, now());
        return v_code;
      exception when unique_violation then
        v_code := null;
      end;
    end loop;
    raise exception 'CODE_GEN_FAILED';
  end if;

  update public.world_quiz_backups
     set payload = p_payload, updated_at = now()
   where user_id = v_uid;
  return v_code;
end $$;

-- 5) RPC — 코드로 복원. 남의 백업을 가져오는 동작이라 로그인은 요구하되 소유자 검사는 하지 않는다.
create or replace function public.world_quiz_restore_backup(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select payload into v_payload
    from public.world_quiz_backups
   where code = upper(trim(p_code));
  return v_payload; -- 없으면 null
end $$;

-- 6) RPC — 내 백업 정보(코드·시각). 마이 화면 표시용
create or replace function public.world_quiz_my_backup()
returns table(code text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select code, updated_at from public.world_quiz_backups where user_id = auth.uid();
$$;

grant execute on function public.world_quiz_save_backup(jsonb) to anon, authenticated;
grant execute on function public.world_quiz_restore_backup(text) to anon, authenticated;
grant execute on function public.world_quiz_my_backup() to anon, authenticated;
