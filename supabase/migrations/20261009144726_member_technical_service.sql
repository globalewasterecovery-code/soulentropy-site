create table public.technical_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id),
 title text not null check(char_length(title) between 3 and 120),
 service text not null check(service in ('installation','repair','automation','development','authorized_security','industrial')),
 environment text not null check(char_length(environment) between 2 and 1000),
 description text not null check(char_length(description) between 20 and 6000),
 acceptance text not null check(char_length(acceptance) between 5 and 2000),
 budget numeric(12,2) check(budget>=0), currency text not null check(currency in ('USD','VND','CNY','USDT')),
 authorization_confirmed boolean not null check(authorization_confirmed),
 privacy_consent boolean not null check(privacy_consent),
 client_request_id uuid not null, created_at timestamptz not null default now(), unique(user_id,client_request_id)
);
create index technical_requests_user_created on public.technical_requests(user_id,created_at desc);
alter table public.technical_requests enable row level security;
revoke all on public.technical_requests from anon, authenticated;
grant select on public.technical_requests to authenticated;
grant insert(title,service,environment,description,acceptance,budget,currency,authorization_confirmed,privacy_consent,client_request_id) on public.technical_requests to authenticated;
grant all on public.technical_requests to service_role;
create policy technical_submit on public.technical_requests for insert to authenticated with check (
 user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy technical_read on public.technical_requests for select to authenticated using (
 user_id=(select auth.uid()) or (select auth.jwt())->>'email'='htfyapp@gmail.com');
create table public.technical_progress (
 request_id uuid primary key references public.technical_requests(id),
 status text not null default 'submitted' check(status in ('submitted','assessing','awaiting_information','quoted','accepted','working','testing','awaiting_payment','delivered','declined')),
 host_name text not null default '炁 · 技术管家', customer_note text not null default '已收到需求，等待技术评估。未报价、未扣款。',
 quote numeric(12,2) check(quote>=0), quote_currency text check(quote_currency in ('USD','VND','CNY','USDT')),
 payment_confirmed boolean not null default false,
 updated_at timestamptz not null default now(),
 check(status<>'delivered' or payment_confirmed)
);
alter table public.technical_progress enable row level security;
revoke all on public.technical_progress from anon,authenticated;
grant select on public.technical_progress to authenticated;
grant update(status,customer_note,quote,quote_currency,payment_confirmed,updated_at) on public.technical_progress to authenticated;
grant all on public.technical_progress to service_role;
create policy progress_read on public.technical_progress for select to authenticated using (
 exists(select 1 from public.technical_requests r where r.id=request_id and r.user_id=(select auth.uid()))
 or (select auth.jwt())->>'email'='htfyapp@gmail.com');
create policy progress_operator on public.technical_progress for update to authenticated using (
 (select auth.jwt())->>'email'='htfyapp@gmail.com') with check((select auth.jwt())->>'email'='htfyapp@gmail.com');
create schema if not exists technical_internal;
revoke all on schema technical_internal from public,anon,authenticated;
create function technical_internal.queue_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.technical_requests where user_id=new.user_id and created_at>now()-interval '1 hour')>5 then
 raise exception '每小时最多提交5个需求，请稍后再试'; end if;
 insert into public.technical_progress(request_id) values(new.id); return new;
end; $$;
revoke all on function technical_internal.queue_request() from public,anon,authenticated;
create trigger queue_technical_request after insert on public.technical_requests for each row execute function technical_internal.queue_request();
