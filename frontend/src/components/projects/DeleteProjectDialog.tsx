'use client';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import { Project } from '@/types';

interface DeleteProjectDialogProps {
    open: boolean;
    project: Project | null;
    onClose: () => void;
    onConfirm: (id: string) => void;
}

export default function DeleteProjectDialog({
    open,
    project,
    onClose,
    onConfirm,
}: DeleteProjectDialogProps) {
    const [confirmName, setConfirmName] = useState('');

    // Reset input when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setConfirmName('');
        }
    }, [open]);

    const isMatch = confirmName === project?.name;

    const handleConfirm = () => {
        if (isMatch && project) {
            onConfirm(project.id);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <WarningAmber sx={{ color: 'error.main', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                    刪除專案
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
                    此操作<strong>不可逆</strong>，將會永久刪除：
                    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                        <li>所有文件階層結構</li>
                        <li>所有上傳的文件及版本歷史</li>
                        <li>所有對應的 Storage 實體檔案</li>
                    </Box>
                </Alert>

                {project && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            請輸入專案名稱 <strong style={{ color: '#FF6B6B' }}>{project.name}</strong> 以確認刪除：
                        </Typography>
                        <TextField
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={project.name}
                            fullWidth
                            autoFocus
                            size="small"
                            error={confirmName.length > 0 && !isMatch}
                            helperText={
                                confirmName.length > 0 && !isMatch
                                    ? '名稱不符'
                                    : ' '
                            }
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} color="inherit">
                    取消
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="error"
                    disabled={!isMatch}
                >
                    確認刪除
                </Button>
            </DialogActions>
        </Dialog>
    );
}
