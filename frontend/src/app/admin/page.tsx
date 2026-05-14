'use client';
import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, Paper, Toolbar, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, IconButton, Tooltip, Switch, FormControlLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Checkbox,
    FormGroup, Alert,
} from '@mui/material';
import {
    AdminPanelSettings, Edit, History, Block, CheckCircle,
} from '@mui/icons-material';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminUser, Permission, LoginLog } from '@/types';
import api from '@/lib/api';

const ALL_PERMISSIONS: { key: Permission; label: string }[] = [
    { key: 'UPLOAD', label: '上傳文件' },
    { key: 'DOWNLOAD', label: '下載文件' },
    { key: 'CREATE_PROJECT', label: '建立專案 / 管理階層' },
    { key: 'DELETE_DOCUMENT', label: '刪除文件' },
];

export default function AdminPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

    // Permission dialog
    const [permDialogOpen, setPermDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editPerms, setEditPerms] = useState<Permission[]>([]);
    const [savingPerms, setSavingPerms] = useState(false);

    // Login logs dialog
    const [logsDialogOpen, setLogsDialogOpen] = useState(false);
    const [logsUser, setLogsUser] = useState<AdminUser | null>(null);
    const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, user, router]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data.data);
        } catch {
            setMsg({ text: '載入用戶列表失敗', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchUsers();
        }
    }, [user]);

    const handleToggleUser = async (u: AdminUser) => {
        try {
            await api.patch(`/admin/users/${u.id}/toggle`);
            await fetchUsers();
            setMsg({ text: `${u.name} 已${u.isActive ? '停用' : '啟用'}`, severity: 'success' });
        } catch (err: any) {
            setMsg({ text: err.response?.data?.message || '操作失敗', severity: 'error' });
        }
    };

    const handleOpenPerms = (u: AdminUser) => {
        setEditingUser(u);
        setEditPerms([...u.permissions]);
        setPermDialogOpen(true);
    };

    const handleSavePerms = async () => {
        if (!editingUser) return;
        setSavingPerms(true);
        try {
            await api.put(`/admin/users/${editingUser.id}/permissions`, { permissions: editPerms });
            await fetchUsers();
            setPermDialogOpen(false);
            setMsg({ text: `${editingUser.name} 的權限已更新`, severity: 'success' });
        } catch (err: any) {
            setMsg({ text: err.response?.data?.message || '更新失敗', severity: 'error' });
        } finally {
            setSavingPerms(false);
        }
    };

    const handleViewLogs = async (u: AdminUser) => {
        setLogsUser(u);
        setLoadingLogs(true);
        setLogsDialogOpen(true);
        try {
            const res = await api.get(`/admin/users/${u.id}/login-logs`);
            setLoginLogs(res.data.data);
        } catch {
            setLoginLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const togglePerm = (perm: Permission) => {
        setEditPerms((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
        );
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
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <AdminPanelSettings color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        用戶管理
                    </Typography>
                </Box>

                {msg && (
                    <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
                        {msg.text}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>姓名</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>角色</TableCell>
                                        <TableCell>權限</TableCell>
                                        <TableCell>狀態</TableCell>
                                        <TableCell align="center">操作</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id} sx={{ opacity: u.isActive ? 1 : 0.5 }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {u.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                    {u.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.role === 'ADMIN' ? '管理員' : '一般用戶'}
                                                    color={u.role === 'ADMIN' ? 'secondary' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {u.role === 'ADMIN' ? (
                                                    <Chip label="全部" color="secondary" size="small" variant="outlined" />
                                                ) : u.permissions.length === 0 ? (
                                                    <Typography variant="caption" color="text.secondary">唯讀</Typography>
                                                ) : (
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {u.permissions.map((p) => (
                                                            <Chip key={p} label={p} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                                                        ))}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.isActive ? '啟用' : '停用'}
                                                    color={u.isActive ? 'success' : 'error'}
                                                    size="small"
                                                    sx={{ height: 22 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    {u.role !== 'ADMIN' && (
                                                        <>
                                                            <Tooltip title="編輯權限">
                                                                <IconButton size="small" onClick={() => handleOpenPerms(u)}>
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title={u.isActive ? '停用帳號' : '啟用帳號'}>
                                                                <IconButton size="small" onClick={() => handleToggleUser(u)}>
                                                                    {u.isActive ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    <Tooltip title="登入紀錄">
                                                        <IconButton size="small" onClick={() => handleViewLogs(u)}>
                                                            <History fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </Container>

            {/* Permission dialog */}
            <Dialog open={permDialogOpen} onClose={() => setPermDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>編輯權限 — {editingUser?.name}</DialogTitle>
                <DialogContent>
                    <FormGroup>
                        {ALL_PERMISSIONS.map(({ key, label }) => (
                            <FormControlLabel
                                key={key}
                                control={
                                    <Checkbox
                                        checked={editPerms.includes(key)}
                                        onChange={() => togglePerm(key)}
                                    />
                                }
                                label={label}
                            />
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermDialogOpen(false)}>取消</Button>
                    <Button variant="contained" onClick={handleSavePerms} disabled={savingPerms}>
                        {savingPerms ? '儲存中...' : '儲存'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Login logs dialog */}
            <Dialog open={logsDialogOpen} onClose={() => setLogsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>登入紀錄 — {logsUser?.name}</DialogTitle>
                <DialogContent>
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
                                        <TableCell>IP</TableCell>
                                        <TableCell>位置</TableCell>
                                        <TableCell>狀態</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loginLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.loginAt).toLocaleString('zh-TW')}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{log.ipAddress}</TableCell>
                                            <TableCell>{log.location || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.success ? '成功' : '失敗'}
                                                    color={log.success ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {loginLogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                <Typography variant="body2" color="text.secondary">無紀錄</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLogsDialogOpen(false)}>關閉</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
