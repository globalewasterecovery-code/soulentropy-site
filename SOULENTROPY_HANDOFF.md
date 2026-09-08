# SoulEntropy / 灵熵炁 · 三域名角色模型 HANDOFF

DATE=2026-09-08
PROJECT=SoulEntropy
DOMAIN_MODEL=PASS

## 三域名最终角色（Owner 已确认）

- PRIMARY_DOMAIN=soulentropy.org
  - 正式品牌主域名 / canonical 主站
  - Cloudflare Pages 项目 `soulentropy-site` 自定义域名 active
  - `www.soulentropy.org` 同 Pages 项目 active（200，可直接访问）
- COMMERCIAL_REDIRECT=soulentropy.com → soulentropy.org
  - apex + www 均为 Cloudflare Worker `soulentropy-com-redirect`，返回 308
  - 保留路径与 query string，例如 `soulentropy.com/zh-TW/?a=1` → `soulentropy.org/zh-TW/?a=1`
  - 不使用 JS 前端跳转
- YOUTH_GEEK_DOMAIN=soulentropy.xyz
  - 保留作为年轻极客 / 实验性 / 备用入口
  - 当前内容与原 .org 主站内容完全重复 → 不参与独立 SEO
  - 全站 canonical / hreflang / sitemap / robots 已指向 https://soulentropy.org/
  - 严禁再把 .xyz 当作唯一主站

## 真实仓库

- REPO_PATH=/Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/soulentropy-site
- REMOTE=https://github.com/globalewasterecovery-code/soulentropy-site.git
- BRANCH=main
- 发布目录=`site/`（纯静态，无 build step）

## Cloudflare Pages

- CLOUDFLARE_ACCOUNT_ID=3f47f20d527fdb899e293960c61d28d2
- PAGES_PROJECT=soulentropy-site
- 生产 URL=https://soulentropy-site.pages.dev
- 自定义域名（均 active，Google Trust Services 证书）：
  - soulentropy.org
  - www.soulentropy.org
  - soulentropy.xyz
  - www.soulentropy.xyz
- 部署方式：wrangler 直传（direct-upload，未连 GitHub 构建）

## Cloudflare Worker

- `soulentropy-com-redirect`：308 永久跳转到 https://soulentropy.org/，保留路径与 query
  - routes：soulentropy.com/*、www.soulentropy.com/*（zone 724b8bb4685babb74bc1eb312ba9a34c）
- `soulentropy-org-proxy`：仅作为迁移过渡方案保留脚本；当前已移除 routes，不拦截流量
  - 不要依赖该 Worker 作为 .org 主服务；.org 直接由 Cloudflare Pages 自定义域名提供服务

## DNS（2026-09-08 修改后）

- soulentropy.org zone 02943385cf4c18b855197c4072a654b4
  - soulentropy.org CNAME → soulentropy-site.pages.dev (proxied)
  - www.soulentropy.org CNAME → soulentropy-site.pages.dev (proxied)
- soulentropy.com zone 724b8bb4685babb74bc1eb312ba9a34c
  - soulentropy.com CNAME → soulentropy-site.pages.dev (proxied)
  - www.soulentropy.com CNAME → soulentropy-site.pages.dev (proxied)
  - 实际请求由 `soulentropy-com-redirect` Worker 返回 308
- soulentropy.xyz zone 205534b4ee5029e3c487ef952e516cc9
  - soulentropy.xyz CNAME → soulentropy-site.pages.dev (proxied)
  - www.soulentropy.xyz CNAME → soulentropy-site.pages.dev (proxied)
- 只改动 Web CNAME；未触碰 MX / SPF / DKIM / DMARC / TXT

## DNS 与 Pages 状态备份

备份目录：/Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/work/soulentropy-domain-model-backup-20260908

- 三个 zone 修改前/后的 dns-records JSON
- Pages 自定义域名 after 状态 JSON

## 健康检查

- https://soulentropy.org/ → 200，canonical=https://soulentropy.org/
- https://www.soulentropy.org/ → 200
- https://soulentropy.com/ → 308 → https://soulentropy.org/
- https://www.soulentropy.com/ → 308 → https://soulentropy.org/
- https://soulentropy.xyz/ → 200（备用/实验入口，canonical 指向 .org）
- https://www.soulentropy.xyz/ → 200
- robots.txt / sitemap.xml → 200，均指向 soulentropy.org

## 部署命令（重新部署生产）

```
cd /Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/soulentropy-site
npx --yes wrangler@latest pages deploy site --project-name=soulentropy-site --branch=main
```

部署后同时覆盖 soulentropy.org、www.soulentropy.org、soulentropy.xyz、www.soulentropy.xyz。

## 回滚

1. 仓库：仓库内保留完整 git 历史，回滚用普通 `git revert` / checkout 后重新 pages deploy。
2. DNS：回滚备份见上面的备份目录，把三个 zone 的 CNAME 改回修改前 content 即可（.org/.com 修改前指向 soulentropy-site.netlify.app；.xyz 指向 soulentropy-site.pages.dev）。
3. .com 跳转：`soulentropy-com-redirect` Worker 的代码位于
   /Users/shangdizhishou/Documents/Codex/2026-08-17/referenced-chatgpt-conversation-this-is-an-5/work/soulentropy-domain-workers/com-redirect
   需要时重新 `npx wrangler deploy`，或改 routes 为空以移除。
4. Netlify 旧站点仍保留（site d5d721dc-49a8-47d1-8c66-bad5e34ce52f），仅作极端回滚参考，不作为生产源。

## 自动维护入口

- 仓库 AGENTS.md 说明本工作区为 Agent home；memory/YYYY-MM-DD.md 记录每日会话
- Cloudflare 登录：wrangler OAuth（globalewasterecovery@gmail.com）
- DNS API token：本机 zsh_history 中的 `CF_API_TOKEN` 环境变量（勿外传、勿提交）
- Pages 域名/项目管理：wrangler OAuth token 调用 Pages API，或 `wrangler pages deploy`
- GitHub：gh 已登录 globalewasterecovery-code；push 使用 `git -c credential.helper='!gh auth git-credential' push origin main`
- 禁止 force push、禁止改写历史、禁止把 soulentropy.xyz 当作唯一主站

## 后续注意

- 如果未来给 .xyz 建真正的独立年轻极客内容，可改为 self-canonical；届时页面必须明显标注 Youth/Geek/Experimental，并与 .org 使用不同 title/meta/SEO 词，避免重复竞争。
- 如果未来删除 .com 的 Worker，需先配置等效的 Cloudflare 永久跳转，再移除。
