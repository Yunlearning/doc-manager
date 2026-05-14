'use client';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    FormControlLabel,
    Checkbox,
    Box,
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import { TreeNode } from '@/types';

interface TierDeleteDialogProps {
    open: boolean;
    tier: TreeNode | null;
    onClose: () => void;
    onConfirm: (id: string) => void;
}

export default function TierDeleteDialog({
    open,
    tier,
    onClose,
    onConfirm,
}: TierDeleteDialogProps) {
    const [confirmChecked, setConfirmChecked] = useState(false);

    useEffect(() => {
        if (open) {
            setConfirmChecked(false);
        }
    }, [open]);

    if (!tier) return null;

    const hasChildren = (tier.children && tier.children.length > 0) || (tier.documents && tier.documents.length > 0);

    const handleConfirm = () => {
        if (hasChildren && !confirmChecked) return;
        onConfirm(tier.id);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                <WarningAmber />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    刪除節點
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body1">
                    確定要刪除節點 <strong>{tier.name}</strong> 嗎？
                </Typography>

                {hasChildren && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 1, border: '1px solid', borderColor: 'error.light' }}>
                        <Typography variant="body2" color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
                            警告：此節點包含子節點或文件
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            刪除此節點將會<strong>一併刪除所有附屬的子節點與文件資料</strong>，且無法復原。
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                    color="error"
                                />
                            }
                            label="我了解並同意刪除此節點下的所有子節點與文件"
                            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
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
                    color="error" 
                    variant="contained"
                    disabled={hasChildren && !confirmChecked}
                >
                    確認刪除
                </Button>
            </DialogActions>
        </Dialog>
    );
}
