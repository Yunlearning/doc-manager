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
} from '@mui/material';
import { TreeNode } from '@/types';

interface TierEditDialogProps {
    open: boolean;
    tier: TreeNode | null;
    onClose: () => void;
    onSubmit: (id: string, newName: string) => void;
}

export default function TierEditDialog({
    open,
    tier,
    onClose,
    onSubmit,
}: TierEditDialogProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (tier) {
            setName(tier.name);
        } else {
            setName('');
        }
        setError('');
    }, [tier, open]);

    const handleSubmit = () => {
        if (!name.trim()) {
            setError('名稱為必填');
            return;
        }
        if (!tier) return;

        setError('');
        onSubmit(tier.id, name.trim());
    };

    const handleClose = () => {
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    重新命名節點
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="節點名稱"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={!!error}
                    helperText={error}
                    fullWidth
                    autoFocus
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={handleClose} color="inherit">
                    取消
                </Button>
                <Button onClick={handleSubmit} variant="contained">
                    儲存
                </Button>
            </DialogActions>
        </Dialog>
    );
}
