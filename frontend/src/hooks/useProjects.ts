import useSWR from 'swr';
import api from '@/lib/api';
import { Project, ApiResponse } from '@/types';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useProjects() {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<Project[]>>(
        '/projects',
        fetcher,
    );

    return {
        projects: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}

export function useProject(id: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<Project>>(
        id ? `/projects/${id}` : null,
        fetcher,
    );

    return {
        project: data?.data,
        isLoading,
        isError: error,
        mutate,
    };
}
