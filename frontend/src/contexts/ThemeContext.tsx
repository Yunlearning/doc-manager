'use client';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';
import { createAppTheme } from '@/lib/theme';

interface ThemeContextType {
    mode: PaletteMode;
    toggleMode: () => void;
    setMode: (mode: PaletteMode | 'system') => void;
    effectiveMode: PaletteMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemMode(): PaletteMode {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreference] = useState<PaletteMode | 'system'>('system');
    const [systemMode, setSystemMode] = useState<PaletteMode>('dark');

    // Load preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('theme-mode') as PaletteMode | 'system' | null;
        if (saved) {
            setPreference(saved);
        }
        setSystemMode(getSystemMode());

        // Listen for system theme changes
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const effectiveMode: PaletteMode = preference === 'system' ? systemMode : preference;

    const theme = useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);

    const toggleMode = () => {
        const next: PaletteMode = effectiveMode === 'dark' ? 'light' : 'dark';
        setPreference(next);
        localStorage.setItem('theme-mode', next);
    };

    const setMode = (mode: PaletteMode | 'system') => {
        setPreference(mode);
        localStorage.setItem('theme-mode', mode);
    };

    const value = useMemo(
        () => ({ mode: preference === 'system' ? systemMode : preference, toggleMode, setMode, effectiveMode }),
        [preference, systemMode, effectiveMode],
    );

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
}

export function useThemeMode() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeProvider');
    }
    return context;
}
