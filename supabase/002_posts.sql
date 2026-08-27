-- 轻社区 V1：留言/评论 + 资源交换 + AI灵魂案例，全部复用同一张表，不建新的复杂结构。
-- 运行方式和 001_profiles.sql 一样：Supabase 控制台 -> SQL Editor -> New query -> 粘贴 -> Run。
-- 依赖 001_profiles.sql 已经跑过（需要 auth.users / public.profiles 已存在）。

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  kind text not null check (kind in ('comment', 'board', 'resource_offer', 'resource_need', 'resource_trade', 'case')),
  target text,
  title text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_kind_created_idx on public.posts (kind, created_at desc);
create index if not exists posts_target_idx on public.posts (target);

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Authenticated users can create their own posts" on public.posts;
create policy "Authenticated users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);
