import {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    updateProfileSchema,
    createProjectSchema,
    createTierSchema,
    uploadDocumentSchema,
} from '../src/validators/schemas';

// ═════════════════════════════════════════════════════
// Auth Schemas
// ═════════════════════════════════════════════════════
describe('Auth Schemas', () => {
    describe('registerSchema', () => {
        it('should validate valid registration input', () => {
            const result = registerSchema.safeParse({
                email: 'test@example.com',
                password: 'StrongP@ss1',
                name: 'Test User',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid email', () => {
            const result = registerSchema.safeParse({
                email: 'not-an-email',
                password: 'StrongP@ss1',
                name: 'Test',
            });
            expect(result.success).toBe(false);
        });

        it('should reject password shorter than 8 chars', () => {
            const result = registerSchema.safeParse({
                email: 'a@b.com',
                password: 'short',
                name: 'Test',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty name', () => {
            const result = registerSchema.safeParse({
                email: 'a@b.com',
                password: 'StrongP@ss1',
                name: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject name longer than 100 chars', () => {
            const result = registerSchema.safeParse({
                email: 'a@b.com',
                password: 'StrongP@ss1',
                name: 'A'.repeat(101),
            });
            expect(result.success).toBe(false);
        });
    });

    describe('loginSchema', () => {
        it('should validate valid login input', () => {
            const result = loginSchema.safeParse({
                email: 'user@test.com',
                password: 'anypassword',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid email', () => {
            const result = loginSchema.safeParse({
                email: 'bad',
                password: 'pass',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const result = loginSchema.safeParse({
                email: 'a@b.com',
                password: '',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('changePasswordSchema', () => {
        it('should validate valid password change', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'OldPass@1',
                newPassword: 'NewPass@2',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty current password', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: '',
                newPassword: 'NewPass@2',
            });
            expect(result.success).toBe(false);
        });

        it('should reject new password shorter than 8 chars', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'OldPass@1',
                newPassword: 'short',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('updateProfileSchema', () => {
        it('should validate valid name', () => {
            const result = updateProfileSchema.safeParse({ name: 'New Name' });
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = updateProfileSchema.safeParse({ name: '' });
            expect(result.success).toBe(false);
        });
    });
});

// ═════════════════════════════════════════════════════
// Project Schemas
// ═════════════════════════════════════════════════════
describe('Project Schemas', () => {
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
});

// ═════════════════════════════════════════════════════
// Tier Schemas
// ═════════════════════════════════════════════════════
describe('Tier Schemas', () => {
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
});

// ═════════════════════════════════════════════════════
// Document Schemas
// ═════════════════════════════════════════════════════
describe('Document Schemas', () => {
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

        it('should reject invalid tierId', () => {
            const result = uploadDocumentSchema.safeParse({
                tierId: 'not-uuid',
                title: 'Test',
            });
            expect(result.success).toBe(false);
        });

        it('should reject missing tierId', () => {
            const result = uploadDocumentSchema.safeParse({
                title: 'Test',
            });
            expect(result.success).toBe(false);
        });
    });
});
