# Lumière Beauty / Nail Salon Operating System

手機優先、可 SaaS 化、可部署到 Vercel 的美甲美容行業營運 OS 基礎專案。目標服務美甲店、美睫店、美容工作室、霧眉 / 半永久、美體 SPA、個人工作室與多店品牌。

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

- Next.js App Router + React + TypeScript
- Tailwind CSS 手機優先設計
- Supabase / PostgreSQL schema + Row Level Security
- Vitest 核心流程測試
- Vercel 部署設定與 GitHub Actions CI


## Package manager and registry

This repository uses npm, pinned by `packageManager` in `package.json`. The project `.npmrc` intentionally points to the public npm registry:

```bash
npm config get registry
# https://registry.npmjs.org/
```

No private registry is required. If a corporate/cloud proxy injects `HTTP_PROXY`, `HTTPS_PROXY`, `npm_config_http_proxy`, or `npm_config_https_proxy`, ensure that proxy allows `registry.npmjs.org`; otherwise `npm install` can fail before the project configuration is reached.

## 快速開始

```bash
npm install
cp .env.example .env.local
npm run dev
```

開啟 <http://localhost:3000>。若尚未設定 Supabase，系統會使用 Demo Data 呈現完整營運流程。

## 環境變數

請參考 `.env.example`：

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_DEMO_MODE`

## 資料庫

套用 Supabase migration：

```bash
supabase db push
```

Schema 核心資料表：

- `workspaces`, `workspace_members`
- `service_categories`, `services`
- `customers`
- `appointments`, `appointment_services`
- `orders`, `order_lines`
- `inventory_items`, `inventory_movements`
- `shifts`

RLS 透過 `is_workspace_member(workspace_id)` 與 `current_workspace_role(workspace_id)` 實作 workspace 隔離與管理權限基礎。

## 測試與驗證

```bash
npm run typecheck
npm test
npm run build
```

涵蓋：

- 同技師重複時段預約衝突。
- 服務 + 加購時間計算。
- 訂單小計、折扣、小費與待收金額。
- 角色權限基礎規則。

## 部署

1. 在 Supabase 建立專案並套用 migration。
2. 在 Vercel 匯入 repository。
3. 設定 `.env.example` 對應環境變數。
4. 執行 `npm run build`，Vercel 會使用 `vercel.json` 的設定部署。

## 下一步建議

- 將 Demo Data 替換為 Supabase query / mutation server actions。
- 補上完整 Auth callback、邀請員工與 workspace onboarding flow。
- 建立預約日曆拖拉互動與多技師排程視圖。
- 串接金流、收據列印、LINE 通知與照片儲存 bucket。
- 擴充 E2E 測試與 RLS integration tests。
