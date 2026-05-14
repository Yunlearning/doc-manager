'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Permission, ApiResponse } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    hasPermission: (perm: Permission) => boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
            // Verify token is still valid
            api.get<ApiResponse<User>>('/auth/me')
                .then((res) => {
                    setUser(res.data.data);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                    delete api.defaults.headers.common['Authorization'];
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
            email,
            password,
        });
        const { token: newToken, user: newUser } = res.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }, []);

    const register = useCallback(async (email: string, password: string, name: string) => {
        await api.post('/auth/register', { email, password, name });
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
    }, []);

    const hasPermission = useCallback(
        (perm: Permission) => {
            if (!user) return false;
            if (user.role === 'ADMIN') return true;
            return user.permissions.includes(perm);
        },
        [user],
    );

    const refreshProfile = useCallback(async () => {
        if (!token) return;
        const res = await api.get<ApiResponse<User>>('/auth/me');
        setUser(res.data.data);
    }, [token]);

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: !!user,
            isLoading,
            login,
            register,
            logout,
            hasPermission,
            refreshProfile,
        }),
        [user, token, isLoading, login, register, logout, hasPermission, refreshProfile],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
