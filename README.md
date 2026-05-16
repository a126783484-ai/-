# Lumière Beauty / Nail Salon Operating System

手機優先、可 SaaS 化、可部署到 Vercel 的美甲美容行業營運 OS 基礎專案。目標服務美甲店、美睫店、美容工作室、霧眉 / 半永久、美體 SPA、個人工作室與多店品牌。

正式 repository：`Johnnie1266789/beauty-os`。正式部署鏈：GitHub Organization → CI → Vercel Production → Supabase。

> `src/lib/seed.ts` 內資料為 **Demo Data**，用於本機展示與測試。正式環境請連接 Supabase/PostgreSQL 並套用 `supabase/migrations/0001_initial_beauty_nail_os.sql`。

## 已建立模組

- 登入 / 註冊 / 角色權限：店主、管理員、技師、櫃台、員工。
- Workspace / 店鋪資料隔離：資料模型以 `workspace_id` 分租戶，migration 內啟用 RLS policy。