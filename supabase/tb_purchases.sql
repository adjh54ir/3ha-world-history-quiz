-- 인앱 구매 기록 공용 테이블 (여러 앱이 공유, app_id = 번들 ID 로 구분)
-- Supabase 에 이미 만들어져 있는 스키마 그대로다. 없을 때만 만든다 — 기존 테이블은 건드리지 않는다.
-- 쓰기/읽기는 Edge Function(worldquiz-purchase, service_role)만 한다.

create table if not exists public.tb_purchases (
  app_id          text not null,
  transaction_id  text not null,
  user_id         uuid references auth.users(id) on delete cascade,
  product_id      text not null,
  platform        text not null check (platform in ('ios', 'android')),
  purchase_token  text,
  purchased_at    timestamptz default now(),
  updated_at      timestamptz default now(),
  primary key (app_id, transaction_id)
);

-- 구독 만료일 (평생·소모품은 null). 이미 있는 테이블에 컬럼만 덧붙인다
alter table public.tb_purchases add column if not exists expires_at timestamptz;


-- updated_at 자동 갱신 (소유권 이관 upsert 시점 추적). 여러 번 실행해도 안전
create or replace function public.tb_purchases_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tb_purchases_touch_trg on public.tb_purchases;
create trigger tb_purchases_touch_trg
  before update on public.tb_purchases
  for each row execute function public.tb_purchases_touch();
