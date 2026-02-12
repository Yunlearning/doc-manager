# 四階文件管理系統 (Four-Tier Document Management System)

一個支援 ISO 27001、ISO 9001 等多種驗證標準的四階文件管理平台。

## 功能特色

- 🏢 **多專案管理** — 可建立不同驗證標準的專案（ISO 27001、ISO 9001 等）
- 🌳 **四階樹狀結構** — 視覺化的四階文件層級（品質手冊 → 程序書 → 作業指導書 → 表單/紀錄）
- 📤 **非同步上傳** — 透過 BullMQ + Redis 佇列實現非阻塞檔案上傳
- 📥 **串流下載** — 使用 Node.js Stream 實現非阻塞檔案下載
- 🔄 **即時切換** — Dashboard 快速切換不同專案
- ✅ **表單驗證** — 前後端皆使用 Zod 進行資料驗證

## 技術堆疊

| 層面 | 技術 |
|------|------|
| **後端** | Node.js + TypeScript + Express |
| **資料庫** | PostgreSQL 15 + Prisma ORM |
| **佇列** | BullMQ + Redis 7 |
| **前端** | Next.js 14 + TypeScript + Material UI |
| **驗證** | Zod (前後端共用) |
| **測試** | Jest + Supertest |
| **容器** | Docker Compose |

## 快速開始

### 1. 啟動 PostgreSQL & Redis

```bash
docker-compose up -d
```

### 2. 設定後端

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

後端啟動於 http://localhost:3001

### 3. 設定前端

```bash
cd frontend
npm install
npm run dev
```

前端啟動於 http://localhost:3000

## API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/projects` | 取得所有專案 |
| POST | `/api/projects` | 建立專案 |
| GET | `/api/projects/:id` | 取得專案詳情 |
| PUT | `/api/projects/:id` | 更新專案 |
| DELETE | `/api/projects/:id` | 刪除專案 |
| GET | `/api/projects/:id/tree` | 取得四階樹狀結構 |
| GET | `/api/tiers?projectId=` | 取得階層列表 |
| POST | `/api/tiers` | 建立階層節點 |
| PUT | `/api/tiers/:id` | 更新階層節點 |
| DELETE | `/api/tiers/:id` | 刪除階層節點 |
| POST | `/api/documents/upload` | 上傳文件（非同步） |
| GET | `/api/documents/jobs/:jobId` | 查詢上傳進度 |
| GET | `/api/documents/:id/download` | 下載文件（串流） |
| DELETE | `/api/documents/:id` | 刪除文件 |

## 測試

```bash
cd backend
npm test
```

## 專案結構

```
doc-manger/
├── docker-compose.yml
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/          # DB & Redis 設定
│   │   ├── routes/          # API 路由
│   │   ├── controllers/     # 請求處理
│   │   ├── services/        # 業務邏輯
│   │   ├── queues/          # BullMQ 佇列
│   │   ├── jobs/            # 非同步工作
│   │   ├── middlewares/     # 中介層
│   │   └── validators/      # Zod 驗證
│   ├── storage/documents/   # 本地檔案儲存
│   └── __tests__/           # Jest 測試
└── frontend/
    └── src/
        ├── app/             # Next.js 頁面
        ├── components/      # React 元件
        ├── hooks/           # SWR 資料 Hook
        ├── lib/             # API 客戶端
        ├── types/           # TypeScript 型別
        └── validators/      # Zod 驗證
```
