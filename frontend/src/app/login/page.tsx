'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    InputAdornment,
    IconButton,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockOutlined,
    FolderSpecial,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, register } = useAuth();

    const [tab, setTab] = useState(0); // 0 = login, 1 = register
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || '登入失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await register(email, password, name);
            setSuccess('註冊成功！請使用帳號登入。');
            setTab(0);
            setName('');
        } catch (err: any) {
            setError(err.response?.data?.message || '註冊失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0A0E1A 0%, #131B2E 50%, #0A0E1A 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background decoration */}
            <Box
                sx={{
                    position: 'absolute',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
                    top: -100,
                    right: -100,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,217,166,0.1) 0%, transparent 70%)',
                    bottom: -100,
                    left: -100,
                }}
            />

            <Paper
                elevation={0}
                sx={{
                    width: 420,
                    p: 4,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <FolderSpecial
                        sx={{
                            fontSize: 48,
                            background: 'linear-gradient(135deg, #6C63FF 0%, #00D9A6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    />
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #6C63FF 0%, #00D9A6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mt: 1,
                        }}
                    >
                        四階文件管理系統
                    </Typography>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }}
                    variant="fullWidth"
                    sx={{ mb: 3 }}
                >
                    <Tab label="登入" />
                    <Tab label="註冊" />
                </Tabs>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                {/* Login form */}
                {tab === 0 && (
                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="密碼"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            sx={{ mb: 3 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <LockOutlined />}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? '登入中...' : '登入'}
                        </Button>
                    </Box>
                )}

                {/* Register form */}
                {tab === 1 && (
                    <Box component="form" onSubmit={handleRegister}>
                        <TextField
                            fullWidth
                            label="姓名"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="密碼"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            helperText="至少 8 碼，含大小寫字母、數字與特殊字元"
                            sx={{ mb: 3 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? '註冊中...' : '建立帳號'}
                        </Button>
                    </Box>
                )}

                {/* Demo accounts info */}
                <Box
                    sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(108, 99, 255, 0.06)',
                        border: '1px solid rgba(108, 99, 255, 0.15)',
                    }}
                >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                        測試帳號
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        管理員: admin@docmgr.com / Admin@123
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        一般用戶: user@docmgr.com / User@123
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
}
