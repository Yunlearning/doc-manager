'use client';
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    Typography,
} from '@mui/material';

interface TierDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; tierLevel: number; parentId: string | null; projectId: string }) => void;
    projectId: string;
    parentId: string | null;
    tierLevel: number;
}

const TIER_LABELS: Record<number, string> = {
    1: '一階 — 品質手冊',
    2: '二階 — 程序書',
    3: '三階 — 作業指導書',
    4: '四階 — 表單/紀錄',
};

export default function TierDialog({
    open,
    onClose,
    onSubmit,
    projectId,
    parentId,
    tierLevel,
}: TierDialogProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) {
            setError('名稱為必填');
            return;
        }
        setError('');
        onSubmit({ name: name.trim(), tierLevel, parentId, projectId });
        setName('');
    };

    const handleClose = () => {
        setName('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    新增 {TIER_LABELS[tierLevel] || `第 ${tierLevel} 階`} 節點
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    層級：{TIER_LABELS[tierLevel] || `第 ${tierLevel} 階`}
                </Typography>
                <TextField
                    label="節點名稱"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={!!error}
                    helperText={error}
                    fullWidth
                    autoFocus
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={handleClose} color="inherit">
                    取消
                </Button>
                <Button onClick={handleSubmit} variant="contained">
                    新增
                </Button>
            </DialogActions>
        </Dialog>
    );
}
