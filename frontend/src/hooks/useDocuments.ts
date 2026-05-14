import useSWR from 'swr';
import api from '@/lib/api';
import { TreeNode, DocumentItem, ApiResponse } from '@/types';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useDocumentTree(projectId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<TreeNode[]>>(
        projectId ? `/projects/${projectId}/tree` : null,
        fetcher,
    );

    return {
        tree: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}

export function useDocuments(tierId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<DocumentItem[]>>(
        tierId ? `/documents?tierId=${tierId}` : null,
        fetcher,
    );

    return {
        documents: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}
