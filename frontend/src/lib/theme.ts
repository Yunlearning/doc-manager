'use client';
import { createTheme, PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
    const isDark = mode === 'dark';

    return createTheme({
        palette: {
            mode,
            primary: {
                main: '#6C63FF',
                light: '#8B83FF',
                dark: '#4A42CC',
            },
            secondary: {
                main: '#00D9A6',
                light: '#33E3BB',
                dark: '#00A67D',
            },
            background: {
                default: isDark ? '#0A0E1A' : '#F5F7FA',
                paper: isDark ? '#111827' : '#FFFFFF',
            },
            error: { main: '#FF6B6B' },
            warning: { main: '#FFB84D' },
            info: { main: '#4FC3F7' },
            success: { main: '#00D9A6' },
            text: {
                primary: isDark ? '#F1F5F9' : '#1E293B',
                secondary: isDark ? '#94A3B8' : '#64748B',
            },
            divider: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: { fontWeight: 700, letterSpacing: '-0.02em' },
            h5: { fontWeight: 600, letterSpacing: '-0.01em' },
            h6: { fontWeight: 600 },
            subtitle1: { fontWeight: 500 },
            body2: { color: isDark ? '#94A3B8' : '#64748B' },
        },
        shape: { borderRadius: 12 },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 10,
                        padding: '8px 20px',
                    },
                    containedPrimary: {
                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)',
                        boxShadow: '0 4px 14px rgba(108, 99, 255, 0.4)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5A52E0 0%, #7B73FF 100%)',
                            boxShadow: '0 6px 20px rgba(108, 99, 255, 0.5)',
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        background: isDark
                            ? 'linear-gradient(145deg, rgba(17, 24, 39, 0.9) 0%, rgba(17, 24, 39, 0.7) 100%)'
                            : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                        boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.06)',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        background: isDark
                            ? 'linear-gradient(180deg, #0F1629 0%, #111827 100%)'
                            : 'linear-gradient(180deg, #FAFBFC 0%, #F5F7FA 100%)',
                        borderRight: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        background: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                        boxShadow: isDark ? '0 4px 30px rgba(0, 0, 0, 0.2)' : '0 1px 8px rgba(0, 0, 0, 0.05)',
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { fontWeight: 500 },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        background: isDark
                            ? 'linear-gradient(145deg, #111827 0%, #0F1629 100%)'
                            : 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
                        border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                        boxShadow: isDark
                            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
                            : '0 20px 60px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 10,
                        },
                    },
                },
            },
        },
    });
}

// Default export for backward compatibility
const theme = createAppTheme('dark');
export default theme;
