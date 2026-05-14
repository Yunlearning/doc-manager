'use client';
import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, Paper, TextField, Button, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Toolbar, CircularProgress, Divider, Grid,
} from '@mui/material';
import {
    Person, Lock, History, Shield, Save,
} from '@mui/icons-material';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginLog, Permission } from '@/types';
import api from '@/lib/api';

const PERMISSION_LABELS: Record<Permission, string> = {
    UPLOAD: '上傳文件',
    DOWNLOAD: '下載文件',
    CREATE_PROJECT: '建立專案 / 管理階層',
    DELETE_DOCUMENT: '刪除文件',
};

export default function ProfilePage() {
    const { user, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [msg, setMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            setName(user.name);
            // Fetch login logs
            api.get('/auth/login-logs')
                .then((res) => setLoginLogs(res.data.data))
                .catch(() => { })
                .finally(() => setLoadingLogs(false));
        }
    }, [user]);

    const handleSaveName = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await api.put('/auth/profile', { name });
            await refreshProfile();
            setMsg({ text: '姓名已更新', severity: 'success' });
        } catch (err: any) {
            setMsg({ text: err.response?.data?.message || '更新失敗', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangingPw(true);
        setMsg(null);
        try {
            await api.put('/auth/password', { currentPassword, newPassword });
            setMsg({ text: '密碼已更新', severity: 'success' });
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            setMsg({ text: err.response?.data?.message || '密碼變更失敗', severity: 'error' });
        } finally {
            setChangingPw(false);
        }
    };

    if (authLoading || !user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Header projects={[]} selectedProjectId={null} onProjectChange={() => { }} onCreateProject={() => { }} showProjectControls={false} />
            <Toolbar />
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
                    個人資料
                </Typography>

                {msg && (
                    <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
                        {msg.text}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Profile info */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Person color="primary" />
                                <Typography variant="h6">基本資訊</Typography>
                            </Box>
                            <TextField
                                fullWidth
                                label="Email"
                                value={user.email}
                                disabled
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="姓名"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">角色：</Typography>
                                <Chip
                                    label={user.role === 'ADMIN' ? '管理員' : '一般用戶'}
                                    color={user.role === 'ADMIN' ? 'secondary' : 'default'}
                                    size="small"
                                />
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveName}
                                disabled={saving || name === user.name}
                            >
                                {saving ? '儲存中...' : '儲存變更'}
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Change password */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Lock color="primary" />
                                <Typography variant="h6">變更密碼</Typography>
                            </Box>
                            <Box component="form" onSubmit={handleChangePassword}>
                                <TextField
                                    fullWidth
                                    label="目前密碼"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="新密碼"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    helperText="至少 8 碼，含大小寫字母、數字與特殊字元"
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={changingPw || !currentPassword || !newPassword}
                                >
                                    {changingPw ? '變更中...' : '變更密碼'}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Permissions */}
                    <Grid size={12}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Shield color="primary" />
                                <Typography variant="h6">我的權限</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {user.role === 'ADMIN' ? (
                                    <Chip label="管理員 — 擁有所有權限" color="secondary" />
                                ) : user.permissions.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        僅有唯讀權限（瀏覽文件列表）
                                    </Typography>
                                ) : (
                                    user.permissions.map((p) => (
                                        <Chip key={p} label={PERMISSION_LABELS[p] || p} color="primary" variant="outlined" />
                                    ))
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Login history */}
                    <Grid size={12}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <History color="primary" />
                                <Typography variant="h6">最近登入紀錄</Typography>
                            </Box>
                            {loadingLogs ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>時間</TableCell>
                                                <TableCell>IP 位址</TableCell>
                                                <TableCell>位置</TableCell>
                                                <TableCell>狀態</TableCell>
                                                <TableCell>瀏覽器</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {loginLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                        {new Date(log.loginAt).toLocaleString('zh-TW')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                            {log.ipAddress}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{log.location || '-'}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={log.success ? '成功' : '失敗'}
                                                            color={log.success ? 'success' : 'error'}
                                                            size="small"
                                                            sx={{ height: 22 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <Typography variant="caption">{log.userAgent}</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {loginLogs.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">
                                                        <Typography variant="body2" color="text.secondary">無登入紀錄</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
