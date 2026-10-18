-- 세계 상식 퀴즈 랭킹 패치 (2026-10-18) — Supabase SQL Editor 에서 1회 실행
-- ranking.sql 을 이미 실행한 프로젝트용. ranking.sql 본문에도 같은 내용이 반영돼 있다.
--  1) 닉네임 검증: ja·zh·fr·es 생성 닉네임이 전부 거부되던 정규식 수정
--  2) world_quiz_delete_me: 앱에서 내 랭킹 정보(닉네임·점수·익명 계정) 삭제

-- 2-1) 닉네임 서버 검증 — 앱에서 생성한 랜덤 형식만 허용(비속어·어뷰징 차단)
--      형식: "낱말(공백 낱말 최대 3개 더)#숫자4자리" (예: 용감한 호랑이#1024, 勇敢なトラ#1024, Tigre courageux#1024)
--      글자: 한글 · 라틴(악센트 포함) · 히라가나 · 가타카나 · 한자 — 6개 언어 생성기 낱말 전부 통과 (40자 이내)
create or replace function public.world_quiz_validate_nickname()
returns trigger language plpgsql as $$
begin
  new.nickname := trim(new.nickname);
  if char_length(new.nickname) > 40
     or new.nickname !~ '^[가-힣A-Za-zÀ-ÖØ-öø-ÿ\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+( [가-힣A-Za-zÀ-ÖØ-öø-ÿ\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+){0,3}#[0-9]{4}$' then
    raise exception 'NICK_FORMAT_INVALID';
  end if;
  return new;
end $$;

-- 8) RPC — 내 랭킹 정보 삭제 (설정 > 데이터 초기화 > 랭킹 정보)
--    익명 계정(auth.users)을 지우면 프로필 → 점수 → 주간 점수가 on delete cascade 로 함께 지워진다.
--    익명 계정만 지운다 — 다른 방식으로 로그인한 계정은 이 함수로 지우지 않는다.
create or replace function public.world_quiz_delete_me()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from public.world_quiz_profiles where id = auth.uid();
  delete from auth.users where id = auth.uid() and is_anonymous;
end; $$;

revoke execute on function public.world_quiz_delete_me() from public, anon;
grant execute on function public.world_quiz_delete_me() to authenticated;
