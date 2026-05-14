import { z } from 'zod';

export const createProjectSchema = z.object({
    name: z.string().min(1, '專案名稱為必填').max(255, '專案名稱最多 255 字'),
    description: z.string().optional(),
    standardType: z.string().min(1, '標準類型為必填').max(100),
});

export const createTierSchema = z.object({
    projectId: z.string().uuid(),
    parentId: z.string().uuid().nullable().optional(),
    name: z.string().min(1, '階層名稱為必填').max(255),
    tierLevel: z.number().int().min(1).max(4),
    sortOrder: z.number().int().min(0).optional().default(0),
});

export const uploadDocumentSchema = z.object({
    tierId: z.string().uuid(),
    title: z.string().min(1, '文件標題為必填').max(500),
    version: z.string().max(20).optional().default('v1.0'),
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
export type CreateTierFormData = z.infer<typeof createTierSchema>;
export type UploadDocumentFormData = z.infer<typeof uploadDocumentSchema>;
