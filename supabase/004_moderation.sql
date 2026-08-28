-- 内容风控 / 人工审核。运行方式同前：Supabase 控制台 -> SQL Editor -> New query -> 粘贴 -> Run。
-- 已在生产环境 (rpfccljejzfixohgwtpr) 于 2026-08-28 执行并验证通过，此文件是补记的版本控制存档，
-- 便于以后换项目/环境时可以重放，也方便看清现有风控逻辑的全貌。

-- 1) 给 posts 加一个字段，记录"为什么被自动屏蔽"，方便人工审核时看清楚原因。
alter table public.posts add column if not exists flag_reason text;

-- 2) 垃圾/重复内容检测：同一用户或跨用户重复发相同正文达到 3 次（含）以上时，
--    第 3 条起自动置为 status='hidden'（沿用现有的 hidden 状态，SELECT 策略已经让
--    非 active 的帖子对公众不可见，所以这里不需要改 RLS 就能"自动屏蔽"）。
--    不会跟已有的 posts_rate_limit_trigger（10 分钟内发帖数限制）冲突，两个触发器各管各的。
create or replace function public.posts_spam_check()
returns trigger
language plpgsql
security definer
as $function$
declare
  same_user_dupe_count int;
  cross_user_dupe_count int;
  trimmed_body text;
begin
  trimmed_body := trim(new.body);

  if trimmed_body is null or length(trimmed_body) = 0 then
    return new;
  end if;

  select count(*) into same_user_dupe_count
  from public.posts
  where user_id = new.user_id
    and trim(body) = trimmed_body;

  select count(*) into cross_user_dupe_count
  from public.posts
  where user_id <> new.user_id
    and trim(body) = trimmed_body;

  if same_user_dupe_count >= 2 then
    new.status := 'hidden';
    new.flag_reason := 'auto: duplicate content from same user (' || same_user_dupe_count || ' prior matches), pending manual review';
  elsif cross_user_dupe_count >= 2 then
    new.status := 'hidden';
    new.flag_reason := 'auto: identical content shared across multiple accounts (' || cross_user_dupe_count || ' matches), pending manual review';
  end if;

  return new;
end;
$function$;

drop trigger if exists posts_spam_check_trigger on public.posts;
create trigger posts_spam_check_trigger
  before insert on public.posts
  for each row
  execute function public.posts_spam_check();

-- 3) 管理员（人工审核）权限：只给指定的管理员账号开放"查看/放行/删除所有帖子"的权限，
--    包括被隐藏的帖子（普通用户的 SELECT 策略只能看到自己的隐藏帖）。
--    管理员账号 = y13701637353@gmail.com（Supabase Auth 里的真实 Google 登录用户）。
--    如果以后要换管理员账号，把下面三处 UUID 换成新账号的 auth.users.id 即可。
drop policy if exists "Admin can view all posts" on public.posts;
create policy "Admin can view all posts" on public.posts
  for select
  using (auth.uid() = '12accc72-68ff-4b51-91e3-0c288a367d86'::uuid);

drop policy if exists "Admin can update any post" on public.posts;
create policy "Admin can update any post" on public.posts
  for update
  using (auth.uid() = '12accc72-68ff-4b51-91e3-0c288a367d86'::uuid);

drop policy if exists "Admin can delete any post" on public.posts;
create policy "Admin can delete any post" on public.posts
  for delete
  using (auth.uid() = '12accc72-68ff-4b51-91e3-0c288a367d86'::uuid);

-- 审核后台页面：site/admin/review/index.html（noindex，仅管理员账号登录后可见/可操作）。
