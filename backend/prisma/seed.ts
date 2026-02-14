import { PrismaClient, Role, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// ── Sample Markdown Content ────────────────────────────

const sampleDocs = {
    tier1: {
        title: '品質手冊 — 資訊安全管理系統概述',
        fileName: 'quality-manual.md',
        content: `# 品質手冊 — 資訊安全管理系統概述

## 1. 目的
本文件為組織資訊安全管理系統（ISMS）之最高階文件，依據 ISO 27001:2022 標準建立。

## 2. 適用範圍
適用於本組織所有部門之資訊資產管理，包含但不限於：
- 電子資料
- 紙本文件
- 人員安全
- 實體環境安全

## 3. 資訊安全政策
本組織承諾：
1. 保障資訊之機密性、完整性與可用性
2. 符合法規與合約要求
3. 持續改善資訊安全管理系統

## 4. 組織架構
| 角色 | 職責 |
|------|------|
| 管理代表 | 督導 ISMS 運作 |
| 資安長 | 制定安全策略 |
| 部門主管 | 執行安全措施 |
`,
    },
    tier2: {
        title: '存取控制程序書',
        fileName: 'access-control-procedure.md',
        content: `# 存取控制程序書

## 1. 目的
規範組織資訊系統之存取控制機制，確保僅授權人員可存取相關資訊資產。

## 2. 程序內容

### 2.1 帳號管理
- 新進人員由主管申請系統帳號
- 離職人員需於 **最後工作日前** 停用帳號
- 每季進行帳號審查

### 2.2 密碼政策
- 最少 8 碼，含大小寫英文、數字與特殊字元
- 每 90 天強制變更
- 不可重複使用最近 5 次密碼

### 2.3 權限分級
| 等級 | 說明 | 審核者 |
|------|------|--------|
| L1 | 唯讀存取 | 部門主管 |
| L2 | 讀寫存取 | 部門主管 |
| L3 | 管理權限 | 資安長 |

## 3. 紀錄
所有存取變更須留存紀錄至少 3 年。
`,
    },
    tier3: {
        title: '文件管理系統操作說明',
        fileName: 'doc-system-instructions.md',
        content: `# 文件管理系統操作說明

## 1. 登入系統
1. 開啟瀏覽器，輸入系統網址
2. 輸入帳號（Email）與密碼
3. 點擊「登入」按鈕

## 2. 上傳文件
1. 選擇目標專案
2. 展開文件樹，定位至目標階層
3. 點擊上傳按鈕（或拖曳檔案）
4. 填寫文件標題與版本號
5. 確認上傳

## 3. 下載文件
1. 在文件列表中找到目標文件
2. 點擊下載圖示
3. 檔案將自動下載至本機

## 4. 注意事項
- 上傳文件大小上限：50MB
- 支援格式：PDF、DOC、DOCX、XLS、XLSX、MD
- 文件刪除後 **無法復原**
`,
    },
    tier4: {
        title: '文件變更申請表',
        fileName: 'change-request-form.md',
        content: `# 文件變更申請表

## 申請資訊

| 欄位 | 內容 |
|------|------|
| 申請日期 | 2024-01-15 |
| 申請人 | 王小明 |
| 部門 | 資訊部 |
| 文件編號 | DOC-2024-001 |

## 變更內容

### 原始內容
存取控制程序書 v1.0，第 2.2 節密碼政策

### 變更後內容
更新密碼強度要求：最少 12 碼，增加 MFA 雙因素驗證要求

### 變更原因
配合最新安全稽核建議，強化密碼安全政策

## 審核

| 階段 | 審核者 | 日期 | 結果 |
|------|--------|------|------|
| 初審 | 李主管 | 2024-01-16 | 通過 |
| 複審 | 張資安長 | 2024-01-17 | 通過 |

## 備註
本變更自 2024-02-01 起生效。
`,
    },
};

// ── Main Seed ──────────────────────────────────────────

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@docmgr.com' },
        update: {},
        create: {
            email: 'admin@docmgr.com',
            password: adminPassword,
            name: '系統管理員',
            role: Role.ADMIN,
        },
    });
    console.log(`  ✅ Admin: ${admin.email} (Admin@123)`);

    // 2. Create regular user (read only — no permissions)
    const userPassword = await bcrypt.hash('User@123', BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
        where: { email: 'user@docmgr.com' },
        update: {},
        create: {
            email: 'user@docmgr.com',
            password: userPassword,
            name: '一般使用者',
            role: Role.USER,
        },
    });
    console.log(`  ✅ User:  ${user.email} (User@123) — read only`);

    // 3. Create sample ISO 27001 project
    const project = await prisma.project.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'ISO 27001 資訊安全管理系統',
            description: '符合 ISO 27001:2022 標準之資訊安全管理系統文件',
            standardType: 'ISO 27001',
        },
    });
    console.log(`  ✅ Project: ${project.name}`);

    // 4. Create four-tier structure
    const tier1 = await prisma.documentTier.upsert({
        where: { id: '10000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '10000000-0000-0000-0000-000000000001',
            projectId: project.id,
            name: '品質手冊',
            tierLevel: 1,
            sortOrder: 0,
        },
    });

    const tier2 = await prisma.documentTier.upsert({
        where: { id: '10000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
            id: '10000000-0000-0000-0000-000000000002',
            projectId: project.id,
            parentId: tier1.id,
            name: '程序書',
            tierLevel: 2,
            sortOrder: 0,
        },
    });

    const tier3 = await prisma.documentTier.upsert({
        where: { id: '10000000-0000-0000-0000-000000000003' },
        update: {},
        create: {
            id: '10000000-0000-0000-0000-000000000003',
            projectId: project.id,
            parentId: tier2.id,
            name: '作業指導書',
            tierLevel: 3,
            sortOrder: 0,
        },
    });

    const tier4 = await prisma.documentTier.upsert({
        where: { id: '10000000-0000-0000-0000-000000000004' },
        update: {},
        create: {
            id: '10000000-0000-0000-0000-000000000004',
            projectId: project.id,
            parentId: tier3.id,
            name: '表單與紀錄',
            tierLevel: 4,
            sortOrder: 0,
        },
    });

    console.log('  ✅ Four-tier structure created');

    // 5. Create sample markdown files on disk + DB records
    const storagePath = path.resolve(__dirname, '..', 'storage', 'documents');
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    const tiers = [
        { tier: tier1, doc: sampleDocs.tier1 },
        { tier: tier2, doc: sampleDocs.tier2 },
        { tier: tier3, doc: sampleDocs.tier3 },
        { tier: tier4, doc: sampleDocs.tier4 },
    ];

    for (const { tier, doc } of tiers) {
        const filePath = path.join(storagePath, doc.fileName);
        fs.writeFileSync(filePath, doc.content, 'utf-8');

        await prisma.document.upsert({
            where: { id: `20000000-0000-0000-0000-00000000000${tiers.indexOf({ tier, doc }) + 1}` },
            update: {},
            create: {
                tierId: tier.id,
                title: doc.title,
                fileName: doc.fileName,
                filePath,
                mimeType: 'text/markdown',
                fileSize: Buffer.byteLength(doc.content, 'utf-8'),
                currentVersion: 1,
                changelog: 'Initial version',
            },
        });

        console.log(`  📄 ${doc.title}`);
    }

    console.log('\n✨ Seed completed!');
    console.log('\n📋 Test accounts:');
    console.log('  Admin: admin@docmgr.com / Admin@123');
    console.log('  User:  user@docmgr.com  / User@123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
