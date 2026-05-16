# Lumière Beauty / Nail Salon Operating System

手機優先、可 SaaS 化、可部署到 Vercel 的美甲美容行業營運 OS 基礎專案。目標服務美甲店、美睫店、美容工作室、霧眉 / 半永久、美體 SPA、個人工作室與多店品牌。

正式 repository：`Johnnie1266789/beauty-os`。

> `src/lib/seed.ts` 內資料為 **Demo Data**，用於本機展示與測試。正式環境請連接 Supabase/PostgreSQL 並套用 `supabase/migrations/0001_initial_beauty_nail_os.sql`。

## 已建立模組

- 登入 / 註冊 / 角色權限：店主、管理員、技師、櫃台、員工。
- Workspace / 店鋪資料隔離：資料模型以 `workspace_id` 分租戶，migration 內啟用 RLS policy。
- Dashboard：今日預約、今日營收、本月營收、技師業績、熱門服務、新客 / 回訪客、待付款、取消率 / 未到率。
- 預約系統：客戶、服務、技師、日期時間、狀態、來源、備註、列表 / 日曆入口、同技師時段衝突邏輯。
- 服務項目管理：美甲、美睫、SPA、霧眉與加購項目。
- 客戶 CRM：電話、生日、LINE、偏好、禁忌、會員等級、回訪提醒、標籤。
- 訂單 / 結帳：預約轉訂單的 schema、折扣、小費、付款方式、訂單狀態、收款計算。
- 技師工作台：只呈現指定技師今日工作、客戶注意事項、服務紀錄與照片欄位。
- P1：庫存、員工 / 班表 / 業績、報表、設定頁、部署與 CI。

## 技術棧
