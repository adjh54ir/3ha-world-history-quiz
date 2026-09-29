-- 세계 상식 퀴즈 랭킹 스키마 (Supabase SQL Editor 에서 1회 실행)
-- 다른 프로젝트와 섞이지 않도록 world_quiz_ 프리픽스 사용 (public 스키마)
-- 전체 점수 / 타임챌린지 최고점 / 주간 누적 점수 랭킹 + 익명 인증

-- 1) 테이블
create table if not exists public.world_quiz_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  character_key text,
  updated_at timestamptz default now()
);

create table if not exists public.world_quiz_scores (
  user_id uuid primary key references public.world_quiz_profiles(id) on delete cascade,
  total_score int default 0,
  time_best int default 0,
  updated_at timestamptz default now()
);

create table if not exists public.world_quiz_weekly_scores (
  user_id uuid references public.world_quiz_profiles(id) on delete cascade,
  week_start date not null,
  score int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, week_start)
);

-- 2) RLS (읽기 전체 허용 / 프로필 쓰기 본인만, 점수 쓰기는 아래 RPC 로만)
alter table public.world_quiz_profiles enable row level security;
alter table public.world_quiz_scores enable row level security;
alter table public.world_quiz_weekly_scores enable row level security;

create policy "kq_profiles read" on public.world_quiz_profiles for select using (true);
create policy "kq_profiles insert" on public.world_quiz_profiles for insert with check (id = auth.uid());
create policy "kq_profiles update" on public.world_quiz_profiles for update using (id = auth.uid());
create policy "kq_scores read" on public.world_quiz_scores for select using (true);
create policy "kq_weekly read" on public.world_quiz_weekly_scores for select using (true);

-- 2-1) 닉네임 서버 검증 — 앱에서 생성한 랜덤 형식만 허용(비속어·어뷰징 차단)
--      형식: "수식어 명사#숫자4자리" (예: 용감한 호랑이#1024), 한글/영문/숫자/공백만
create or replace function public.world_quiz_validate_nickname()
returns trigger language plpgsql as $$
begin
  new.nickname := trim(new.nickname);
  if new.nickname !~ '^[가-힣a-zA-Z]+ [가-힣a-zA-Z]+#[0-9]{4}$' then
    raise exception 'NICK_FORMAT_INVALID';
  end if;
  return new;
end $$;

drop trigger if exists trg_world_quiz_nickname on public.world_quiz_profiles;
create trigger trg_world_quiz_nickname
before insert or update on public.world_quiz_profiles
for each row execute function public.world_quiz_validate_nickname();

-- 3) RPC — 점수 제출(최고값만 반영)
create or replace function public.world_quiz_submit_scores(p_total int, p_time_best int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.world_quiz_scores(user_id, total_score, time_best, updated_at)
  values (auth.uid(), greatest(coalesce(p_total,0),0), greatest(coalesce(p_time_best,0),0), now())
  on conflict (user_id) do update
    set total_score = greatest(public.world_quiz_scores.total_score, excluded.total_score),
        time_best   = greatest(public.world_quiz_scores.time_best, excluded.time_best),
        updated_at  = now();
end; $$;

-- 4) RPC — 주간 누적(증가분 더하기)
create or replace function public.world_quiz_add_weekly(p_week date, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_delta,0) <= 0 then return; end if;
  insert into public.world_quiz_weekly_scores(user_id, week_start, score, updated_at)
  values (auth.uid(), p_week, p_delta, now())
  on conflict (user_id, week_start) do update
    set score = public.world_quiz_weekly_scores.score + excluded.score, updated_at = now();
end; $$;

-- 5) RPC — 리더보드(top N)
create or replace function public.world_quiz_leaderboard(p_type text, p_week date, p_limit int)
returns table(user_id uuid, nickname text, score int, rank bigint)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id as user_id, p.nickname,
      case p_type
        when 'total'  then coalesce(s.total_score,0)
        when 'time'   then coalesce(s.time_best,0)
        when 'weekly' then coalesce(w.score,0)
        else 0
      end as score
    from public.world_quiz_profiles p
    left join public.world_quiz_scores s on s.user_id = p.id
    left join public.world_quiz_weekly_scores w on w.user_id = p.id and w.week_start = p_week
  )
  select user_id, nickname, score, rank() over (order by score desc) as rank
  from base
  where score > 0
  order by score desc
  limit greatest(coalesce(p_limit,100),1);
$$;

-- 6) RPC — 내 순위
create or replace function public.world_quiz_my_rank(p_type text, p_week date)
returns table(rank bigint, score int)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id as user_id,
      case p_type
        when 'total'  then coalesce(s.total_score,0)
        when 'time'   then coalesce(s.time_best,0)
        when 'weekly' then coalesce(w.score,0)
        else 0
      end as score
    from public.world_quiz_profiles p
    left join public.world_quiz_scores s on s.user_id = p.id
    left join public.world_quiz_weekly_scores w on w.user_id = p.id and w.week_start = p_week
  )
  select (select count(*) + 1 from base b2 where b2.score > b1.score) as rank, b1.score
  from base b1 where b1.user_id = auth.uid();
$$;

-- 7) RPC — 내 랭킹 기록 초기화 (설정 > 초기화에서 호출)
--    점수/주간 점수 행을 삭제한다. 닉네임(프로필)은 유지되며, 점수가 없으면 리더보드에서 제외된다.
create or replace function public.world_quiz_reset_scores()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.world_quiz_weekly_scores where user_id = auth.uid();
  delete from public.world_quiz_scores where user_id = auth.uid();
end; $$;

grant execute on function public.world_quiz_submit_scores(int,int) to anon, authenticated;
grant execute on function public.world_quiz_reset_scores() to anon, authenticated;
grant execute on function public.world_quiz_add_weekly(date,int) to anon, authenticated;
grant execute on function public.world_quiz_leaderboard(text,date,int) to anon, authenticated;
grant execute on function public.world_quiz_my_rank(text,date) to anon, authenticated;
