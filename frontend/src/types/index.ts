export interface Project {
    id: string;
    name: string;
    description: string | null;
    standardType: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        tiers: number;
    };
}

export interface DocumentTier {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    tierLevel: number;
    sortOrder: number;
    createdAt: string;
    children: DocumentTier[];
    documents: DocumentItem[];
    _count?: {
        documents: number;
        children: number;
    };
}

export interface DocumentItem {
    id: string;
    tierId?: string;
    title: string;
    fileName: string;
    mimeType: string;
    fileSize: string;
    currentVersion: number;
    changelog?: string;
    uploadedAt: string;
    updatedAt?: string;
    uploadedBy?: {
        id: string;
        name: string;
        email: string;
    } | null;
}

export interface DocumentVersion {
    id: string;
    documentId: string;
    versionNumber: number;
    title: string;
    fileName: string;
    fileSize: string;
    changelog?: string;
    uploadedAt: string;
    uploadedBy?: {
        id: string;
        name: string;
        email: string;
    } | null;
}

export interface TreeNode extends DocumentTier {
    children: TreeNode[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface UploadJobStatus {
    jobId: string;
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: number;
    result?: {
        documentId: string;
        fileName: string;
        fileSize: number;
    };
    failedReason?: string;
}

// ── Auth Types ──────────────────────────────────

export type Permission = 'UPLOAD' | 'DOWNLOAD' | 'CREATE_PROJECT' | 'DELETE_DOCUMENT';
export type Role = 'ADMIN' | 'USER';

export interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    permissions: Permission[];
    createdAt?: string;
}

export interface LoginLog {
    id: string;
    ipAddress: string;
    userAgent: string;
    location: string | null;
    loginAt: string;
    success: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AdminUser extends User {
    isActive: boolean;
    _count?: { loginLogs: number };
}
