import { z } from 'zod';

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required').max(255),
    description: z.string().optional(),
    standardType: z.string().min(1, 'Standard type is required').max(100),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    standardType: z.string().min(1).max(100).optional(),
});

export const createTierSchema = z.object({
    projectId: z.string().uuid('Invalid project ID'),
    parentId: z.string().uuid('Invalid parent ID').nullable().optional(),
    name: z.string().min(1, 'Tier name is required').max(255),
    tierLevel: z.number().int().min(1).max(4),
    sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateTierSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const uploadDocumentSchema = z.object({
    tierId: z.string().uuid('Invalid tier ID'),
    title: z.string().min(1, 'Document title is required').max(500),
    version: z.string().max(20).optional().default('v1.0'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTierInput = z.infer<typeof createTierSchema>;
export type UpdateTierInput = z.infer<typeof updateTierSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
