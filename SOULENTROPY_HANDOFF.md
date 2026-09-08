# SoulEntropy / 灵熵炁 · Cloudflare Pages Migration HANDOFF

DATE=2026-09-08
PROJECT=SoulEntropy (soulentropy.xyz)
MIGRATION=PASS

## 真实仓库
- REPO_PATH=/Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/soulentropy-site
- REMOTE=https://github.com/globalewasterecovery-code/soulentropy-site.git
- BRANCH=main（生产分支，与 origin/main 同步）
- 发布目录=`site/`（纯静态，无 build step）

## Cloudflare Pages
- CLOUDFLARE_ACCOUNT_ID=3f47f20d527fdb899e293960c61d28d2
- ZONE soulentropy.xyz=205534b4ee5029e3c487ef952e516cc9
- PAGES_PROJECT=soulentropy-site
- 生产 URL=https://soulentropy-site.pages.dev
- 自定义域名：soulentropy.xyz、www.soulentropy.xyz（均 active，Google Trust Services 证书）
- 部署方式：wrangler 直传（direct-upload，未连 GitHub 构建）

## 动态功能（迁移时已识别，非 Netlify 依赖）
- 社区发帖/登录全部走浏览器端 Supabase（project rpfccljejzfixohgwtpr，公开 anon/publishable key 写在 site/js/supabase-client.js）
- Supabase schema：supabase/001~004_*.sql（posts 公共读、RLS 写权限、风控触发器、admin 审核，已在生产库执行）
- 联系渠道为 Telegram（无 Netlify Forms、无服务端函数、无自建 API）

## 部署命令（重新部署生产）
```
cd /Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/soulentropy-site
npx --yes wrangler@latest pages deploy site --project-name=soulentropy-site --branch=main
```
部署后立即出现在 https://soulentropy-site.pages.dev，随后自动覆盖 soulentropy.xyz/www。

## 公网健康检查
- 首页：curl -s -o /dev/null -w '%{http_code}' https://soulentropy.xyz/  → 200
- www：同上 https://www.soulentropy.xyz/ → 200
- 代表页面：/manifesto/ /events/ /board/ /contact/ /en/ /vi/ /zh-TW/ → 200
- robots.txt /sitemap.xml → 200
- 社区数据：Supabase `posts?select=id&site=eq.soulentropy&status=eq.active&limit=1` → 200
- 证书：`openssl s_client -connect soulentropy.xyz:443`（Google Trust Services WE1，90 天自动续）

## DNS（仅 soulentropy.xyz 区域两条，均已切 Pages）
- a4dd5160ab47fdd0ee43bbb309ceef65  CNAME soulentropy.xyz → soulentropy-site.pages.dev (proxied)
- a95787440044032ac3d0a2ff02304189  CNAME www.soulentropy.xyz → soulentropy-site.pages.dev (proxied)

## 回滚
- 回滚源备份目录：/Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/work/soulentropy-migration-backup-20260908-1550
  - soulentropy-site-git-all.bundle（完整 git 历史）
  - soulentropy-site-source-c7b541b.tar.gz
  - soulentropy-xyz-dns-records-before.json（旧 DNS 记录）
  - soulentropy-xyz-http-before.txt / www-soulentropy-xyz-http-before.txt
  - netlify-site-before.json / netlify-deploys-before.json
- 回滚 DNS：把上述两条 CNAME content 改回 soulentropy-site.netlify.app 与 soulentropy.xyz（proxied）
- 回滚部署：用 git bundle 还原 commit c7b541b（或后续任意 commit）后重新 pages deploy

## 禁止触碰
- 不改写 soulentropy.xyz 的 MX/TXT/SPF/DKIM（当前区域无这些记录，未来出现也禁止碰）
- 不碰其他站点 DNS（brdiag.com / globalewasterecovery.com / vietchiphub.com / vngo.io / vietnamzichan.com / soulentropy.com / soulentropy.org）
- 站点文案、设计、canonical/hreflang/sitemap 里的 soulentropy.org 是原样内容，禁止为“迁移”批量改写
- 禁止 force push / 改写历史 / 合并无关历史
- Netlify 账号（site d5d721dc-49a8-47d1-8c66-bad5e34ce52f）保留未删除，仅作回滚，不要继续作为生产源

## 已知残留（后续可选，不在本次范围）
- soulentropy.org 与 soulentropy.com 仍 CNAME 到 Netlify（soulentropy-site.netlify.app），Netlify 处于 usage_exceeded（503）。本次按指示只切 soulentropy.xyz/www；若后续要把 .org/.com 也切 Pages，先确认站点内容 canonical 是否需要同步。
- Netlify 上的历史旧记录与已发布 deploy 已备份，未做任何删除。

## 后续自动维护入口
- 仓库自身 AGENTS.md 说明本工作区为 Agent home；memory/YYYY-MM-DD.md 记录每日会话
- Cloudflare 登录：wrangler OAuth（globalewasterecovery@gmail.com）；DNS API token 仅存在于本机 zsh_history 的 CF_API_TOKEN 环境变量，勿外传
- GitHub：gh 已登录 globalewasterecovery-code；push 用 git remote origin
