'use client';
import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Chip,
    SelectChangeEvent,
    IconButton,
    Tooltip,
    CircularProgress,
    Avatar,
    Menu,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    projects: Project[];
    selectedProjectId: string | null;
    onProjectChange: (projectId: string) => void;
    onCreateProject: () => void;
    onGoHome?: () => void;
    isLoading?: boolean;
    showProjectControls?: boolean;
}

export default function Header({
    projects,
    selectedProjectId,
    onProjectChange,
    onCreateProject,
    onGoHome,
    isLoading,
    showProjectControls = true,
}: HeaderProps) {
    const { user, logout, hasPermission } = useAuth();
    const { effectiveMode, toggleMode } = useThemeMode();
    const router = useRouter();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleChange = (event: SelectChangeEvent<string>) => {
        onProjectChange(event.target.value);
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
        router.push('/login');
    };

    return (
        <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar sx={{ gap: 2 }}>
                <FolderSpecialIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography
                    variant="h6"
                    noWrap
                    sx={{
                        background: 'linear-gradient(135deg, #6C63FF 0%, #00D9A6 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        if (onGoHome) {
                            onGoHome();
                        } else {
                            router.push('/');
                        }
                    }}
                >
                    四階文件管理系統
                </Typography>

                <Box sx={{ flexGrow: 1 }} />

                {/* Project selector */}
                {showProjectControls && (
                    <>
                        {isLoading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <FormControl size="small" sx={{ minWidth: 260 }}>
                                <InputLabel id="project-select-label">切換專案</InputLabel>
                                <Select
                                    labelId="project-select-label"
                                    id="project-select"
                                    value={selectedProjectId || ''}
                                    label="切換專案"
                                    onChange={handleChange}
                                    sx={{
                                        '& .MuiSelect-select': {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        },
                                    }}
                                >
                                    {projects.map((project) => (
                                        <MenuItem key={project.id} value={project.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                                    {project.name}
                                                </Typography>
                                                <Chip
                                                    label={project.standardType}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem', height: 22 }}
                                                />
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Create project button (permission-gated) */}
                        {hasPermission('CREATE_PROJECT') && (
                            <Tooltip title="建立新專案">
                                <IconButton
                                    onClick={onCreateProject}
                                    sx={{
                                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)',
                                        color: 'white',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #5A52E0 0%, #7B73FF 100%)',
                                        },
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                )}

                {/* Theme toggle */}
                <Tooltip title={effectiveMode === 'dark' ? '切換為亮色模式' : '切換為暗色模式'}>
                    <IconButton
                        onClick={toggleMode}
                        sx={{
                            color: effectiveMode === 'dark' ? '#FFD54F' : '#1a1a2e',
                            bgcolor: effectiveMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            '&:hover': {
                                bgcolor: effectiveMode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)',
                            },
                        }}
                    >
                        {effectiveMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                </Tooltip>

                {/* User menu */}
                {user && (
                    <>
                        <Tooltip title={`${user.name} (${user.role})`}>
                            <IconButton onClick={handleMenuOpen} size="small">
                                <Avatar
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            PaperProps={{ sx: { minWidth: 200, mt: 1 } }}
                        >
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="subtitle2">{user.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user.email}
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                        label={user.role === 'ADMIN' ? '管理員' : '一般用戶'}
                                        size="small"
                                        color={user.role === 'ADMIN' ? 'secondary' : 'default'}
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                    />
                                </Box>
                            </Box>
                            <Divider />
                            <MenuItem onClick={() => { handleMenuClose(); router.push('/profile'); }}>
                                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>個人資料</ListItemText>
                            </MenuItem>
                            {user.role === 'ADMIN' && (
                                <MenuItem onClick={() => { handleMenuClose(); router.push('/admin'); }}>
                                    <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>用戶管理</ListItemText>
                                </MenuItem>
                            )}
                            <Divider />
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>登出</ListItemText>
                            </MenuItem>
                        </Menu>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
}
