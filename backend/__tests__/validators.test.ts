import { createProjectSchema, createTierSchema, uploadDocumentSchema } from '../src/validators/schemas';

describe('Validation Schemas', () => {
    describe('createProjectSchema', () => {
        it('should validate valid project input', () => {
            const result = createProjectSchema.safeParse({
                name: 'ISO 27001 Certification',
                description: 'For ISMS',
                standardType: 'ISO 27001',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = createProjectSchema.safeParse({
                name: '',
                standardType: 'ISO 27001',
            });
            expect(result.success).toBe(false);
        });

        it('should reject missing standardType', () => {
            const result = createProjectSchema.safeParse({
                name: 'Test',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createTierSchema', () => {
        it('should validate valid tier input', () => {
            const result = createTierSchema.safeParse({
                projectId: '550e8400-e29b-41d4-a716-446655440000',
                name: '品質手冊',
                tierLevel: 1,
            });
            expect(result.success).toBe(true);
        });

        it('should reject tier level > 4', () => {
            const result = createTierSchema.safeParse({
                projectId: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                tierLevel: 5,
            });
            expect(result.success).toBe(false);
        });

        it('should reject tier level < 1', () => {
            const result = createTierSchema.safeParse({
                projectId: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                tierLevel: 0,
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid projectId', () => {
            const result = createTierSchema.safeParse({
                projectId: 'not-a-uuid',
                name: 'Test',
                tierLevel: 1,
            });
            expect(result.success).toBe(false);
        });

        it('should allow null parentId', () => {
            const result = createTierSchema.safeParse({
                projectId: '550e8400-e29b-41d4-a716-446655440000',
                parentId: null,
                name: 'Test',
                tierLevel: 1,
            });
            expect(result.success).toBe(true);
        });
    });

    describe('uploadDocumentSchema', () => {
        it('should validate valid upload input', () => {
            const result = uploadDocumentSchema.safeParse({
                tierId: '550e8400-e29b-41d4-a716-446655440000',
                title: 'Quality Manual v1',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty title', () => {
            const result = uploadDocumentSchema.safeParse({
                tierId: '550e8400-e29b-41d4-a716-446655440000',
                title: '',
            });
            expect(result.success).toBe(false);
        });
    });
});
