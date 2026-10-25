# Family tracing MVP 0.1 — 2026-10-25

Architecture: existing static site/ on Cloudflare Pages soulentropy-site, direct upload. Baseline 43f03be; previous production 9b332d72-56ae-4ca2-b3cc-1bee3bf48794. Existing auth, technical service, DNS, Workers and Carbon untouched. Zero new paid services, databases, models or scheduled jobs.

Scope: /family/, home navigation/promotion, sitemap. Deterministic local checklist, not an AI or kinship diagnosis. No network calls, storage or third-party scripts in new page. Optional existing signup/login. No private family data written to public posts or service orders. Visitor manually sends minimal application via existing Telegram contact; page does not claim receipt. Adult pilot only. Clear/export available; external clipboard, files, platform backups and previously sent messages require separate deletion. Hosting access logs disclosed.

Future acceptance gates — UNIMPLEMENTED:
- Dedicated owner-isolated family tables. Anonymous and cross-account denial tests, operator permissions, export/deletion. Never put family records into public community posts.
- Private photo bucket, short-lived signed URLs, type/size validation, per-purpose authorization, no training or biometric comparisons by default. Test withdrawal, file/derivative deletion and defined backup retention before enabling upload.
- Private graph: each relationship stores source, uncertainty and conflicts. Two-party consent: pending -> both approved -> selected exchange; refusal, expiry or withdrawal revokes access. Pending invitations reveal no other party information. No public locations or contacts. Minors require a separate verified guardian workflow.
- Archives: source collection, page, date, usage rights, transcription/original distinction and cross-source review. No assertion that a matching name identifies a person.
- DNA: only future voluntary referral after provider/region/terms/pricing/privacy verification. No selected provider, raw DNA intake, testing or interpretation here.

Open-source preflight: reviewed Gramps (https://github.com/gramps-project/gramps) and GEDCOM (https://gedcom.io/specifications/FamilySearchGEDCOMv7.html). Full genealogy stack exceeds this static pilot; consider established data model and interchange in next phase, respecting licensing.

Validation: node syntax; local browser at 319px width; clue generation, literal script-text display, clear; missing consent blocked; application generation and clear; hosted preview loads; internal route/asset validation; live home equals baseline; all tracked existing files unchanged except homepage and sitemap. No real application sent or user account created. Export/copy and real-device coverage remain limited unless separately verified.

Rollback: redeploy site/ at 43f03be or roll back recorded Pages deployment; no DNS changes required.
