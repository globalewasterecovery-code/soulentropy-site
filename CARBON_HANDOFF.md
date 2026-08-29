DATE=2026-08-29
AI_WORKER=Claude
PROJECT=SoulEntropy (soulentropy.org)
BRANCH=main
LAST_COMMIT=6c8966c
COMPLETED=
- P0 (社区功能上线闭环): SPAM_SCOPE_FIX/CROSS_SITE_POST/SAME_SITE_REPEAT/DIFFERENT_USER_SIMILAR 全部 PASS（上一轮已确认，未改动）。SoulEntropy/VietChipHub/VNGO 三仓库均确认 FAST_FORWARD（本地 HEAD 的父提交与 origin/main 当前 HEAD SHA 完全一致）。push 仍被环境阻塞（见 BLOCKERS），未新增改动，等待 OpenClaw 本机心跳完成。
- P1 (SoulEntropy 多语言底座): 建立了可复用的 i18n 构建框架（非硬编码）：
  - i18n-src/registry.json — 语言注册表（15种：zh-CN简中[默认]/zh-TW繁中/en/vi/id/ar[RTL]/ja/ko/th/ms/es/pt/fr/de/hi）
  - i18n-src/strings.json — 每语言的首页文案（专业翻译，品牌词"灵熵 · Qi"在所有语言保持不变，未做机械翻译）
  - i18n-src/template-home.html — 首页模板（token 占位符）
  - i18n-src/build.js — 构建脚本：读取 registry+strings+template，生成 site/index.html（默认 zh-CN，保留原路径）+ site/<code>/index.html（其余14种语言子路径）+ site/js/i18n-data.js（运行时数据），并给 site/sitemap.xml 注入 hreflang alternate 链接。脚本是幂等的（重复运行不会产生重复 sitemap 条目）。
  - site/js/i18n.js — 通用运行时（与站点内容解耦，可直接复制给 VNGO/VietnamZiChan/VietChipHub 复用）：语言选择器下拉框、基于 navigator.languages 的"建议切换"横幅（非强制跳转）、localStorage+cookie 记忆用户选择、仅在访问根路径且无已存偏好信号时才依据存储的偏好自动跳转，直接访问任何 /xx/ 路径永远尊重原样。
  - site/css/i18n.css — 语言切换 UI + RTL 样式（[dir=rtl] 镜像布局，阿拉伯语首页已验证 dir="rtl" 正确输出）。
  - 已验证：15个生成页面 HTML 均可被解析器正常解析、sitemap.xml 是合法 XML、zh-CN 首页标题/H1 与原文件逐字节比对一致（无内容回归）、i18n-data.js 内容抽查正常。
  - 范围说明（诚实边界）：本阶段只完成了首页（/、/zh-TW/、/en/ 等15个首页）的多语言化。二级页面（events/resources/contact/signup/login/manifesto/radar 等）暂未本地化，非默认语言首页上的导航/CTA链接目前指向的是原有的纯中文二级页面（不是虚构的 /en/events/ 等不存在路径），避免出现"看起来支持却404"的半成品体验。二级页面的本地化是下一阶段任务（见 NEXT_ACTION）。
NOT_TESTED=
- 未做真实浏览器渲染截图验证（无 GUI 浏览器可用于该 Mac 会话），仅做了 HTML 解析器校验 + 文本级 diff 校验，建议 push+部署后用真实浏览器过一遍15个首页和语言切换横幅/下拉框交互。
- 语言自动建议横幅的实际触发效果（依赖真实浏览器 navigator.languages）未做端到端测试。
- Netlify 是否会正确按新增的 site/<code>/ 子目录生成对应的 /<code>/ 路由（应该会，因为 publish=site 是纯静态目录发布，无需额外 redirects 规则，但未经真实部署验证）。
NOT_DONE_YET (P1 剩余/P2)=
- 二级页面（events/resources/contact/signup/login/manifesto/radar）的多语言模板化。
- P2：把 i18n-src/build.js + site/js/i18n.js + site/css/i18n.css 抽象为四站共享组件规范，应用到 VNGO/VietnamZiChan/VietChipHub（各站启用不同语言重点，机制统一）。
BLOCKERS=
- git push 仍被当前云端沙箱环境阻塞（device_bash 出口代理对 github.com 返回 403 blocked-by-allowlist；SSH DNS 不通）。这是沙箱级别的强制限制，非临时故障，重试无意义。曾在 vietchiphub 仓库发现 OpenClaw 本机 safe_git_push 脚本自己的失败日志（"Could not resolve host: github.com"，08-27 20:30 和 08-28 09:05 各一次），但 origin/main 在那之后又出现了更新的常规内容提交，说明本机网络是间歇性可用，不是永久失效——下一次 OpenClaw 心跳成功执行 push 时会自动带上本次改动（本地领先 origin/main 正好1个 commit，且是干净的 fast-forward，无冲突风险）。
FILES_CHANGED=
site/index.html (regenerated, zh-CN 内容逐字节一致，新增 i18n 相关 head 标签/switcher/banner/script)
site/sitemap.xml (新增 hreflang alternate 链接，15语言首页 URL)
site/zh-TW/index.html, site/en/index.html, site/vi/index.html, site/id/index.html, site/ar/index.html, site/ja/index.html, site/ko/index.html, site/th/index.html, site/ms/index.html, site/es/index.html, site/pt/index.html, site/fr/index.html, site/de/index.html, site/hi/index.html (新建)
site/js/i18n.js, site/js/i18n-data.js (新建)
site/css/i18n.css (新建)
i18n-src/ 整个目录（新建，构建工具，不发布到线上，registry.json/strings.json/template-home.html/build.js + 原始 index.html 和 sitemap.xml 的改动前备份）
DATABASE_CHANGES=
无（本阶段未改动 Supabase 数据库；上一阶段的 posts_spam_check() site-scope 修复已完成并测试通过，未再改动）
ROLLBACK=
1) git revert 本次 commit（或 git checkout 到本次改动前的 commit）即可完全回滚，因为 index.html/sitemap.xml 都在 git 历史中有完整旧版本，且 i18n-src/index.html.pre-i18n-backup 和 i18n-src/sitemap.xml.pre-i18n-backup 保留了改动前的原始快照可直接核对。
2) 若只想临时下线多语言而不回滚代码：可以在 netlify.toml 或 CDN 层面直接 404 /zh-TW/ /en/ 等子路径，不影响根路径 zh-CN 首页。
NEXT_ACTION=
1. 等待/推动 push 完成（见 BLOCKERS），确认 GitHub main 包含本次 commit，等待 Netlify 部署，然后用真实浏览器过一遍15个语言首页 + 语言切换器 + RTL 阿拉伯语页面。
2. 二级页面（events/resources/contact/signup/login/manifesto/radar）套用同一套 i18n-src 框架模板化。
3. 把 i18n-src/build.js、site/js/i18n.js、site/css/i18n.css 三个通用文件原样复制到 VNGO/VietnamZiChan/VietChipHub 仓库，每站只需新建自己的 registry.json（选择该站的语言重点子集）+ strings.json（该站首页文案翻译）+ template-home.html（套用该站现有首页结构），即完成 P2。
4. 完成后再进入 P3（VNGO 转化优化）。
SAFE_TO_CONTINUE=yes
