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
    Box,
    Typography,
} from '@mui/material';
import { createProjectSchema, CreateProjectFormData } from '@/validators/schemas';
import { ZodError } from 'zod';

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateProjectFormData) => void;
}

const STANDARD_TYPES = [
    { value: 'ISO 27001', label: 'ISO 27001 — 資訊安全管理' },
    { value: 'ISO 9001', label: 'ISO 9001 — 品質管理' },
    { value: 'ISO 14001', label: 'ISO 14001 — 環境管理' },
    { value: 'ISO 45001', label: 'ISO 45001 — 職安衛管理' },
    { value: 'ISO 22000', label: 'ISO 22000 — 食品安全管理' },
    { value: 'CUSTOM', label: '自訂標準' },
];

export default function ProjectDialog({ open, onClose, onSubmit }: ProjectDialogProps) {
    const [form, setForm] = useState<CreateProjectFormData>({
        name: '',
        description: '',
        standardType: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [customType, setCustomType] = useState('');

    const handleSubmit = () => {
        try {
            const data = {
                ...form,
                standardType: form.standardType === 'CUSTOM' ? customType : form.standardType,
            };
            const validated = createProjectSchema.parse(data);
            setErrors({});
            onSubmit(validated);
            setForm({ name: '', description: '', standardType: '' });
            setCustomType('');
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((e) => {
                    fieldErrors[e.path[0] as string] = e.message;
                });
                setErrors(fieldErrors);
            }
        }
    };

    const handleClose = () => {
        setForm({ name: '', description: '', standardType: '' });
        setCustomType('');
        setErrors({});
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    建立新專案
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
                <TextField
                    label="專案名稱"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={!!errors.name}
                    helperText={errors.name}
                    fullWidth
                    autoFocus
                    sx={{ mt: 1 }}
                />
                <TextField
                    label="專案描述"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    multiline
                    rows={3}
                    fullWidth
                />
                <TextField
                    label="驗證標準"
                    select
                    value={form.standardType}
                    onChange={(e) => setForm({ ...form, standardType: e.target.value })}
                    error={!!errors.standardType}
                    helperText={errors.standardType}
                    fullWidth
                >
                    {STANDARD_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                            {type.label}
                        </MenuItem>
                    ))}
                </TextField>
                {form.standardType === 'CUSTOM' && (
                    <TextField
                        label="自訂標準名稱"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        fullWidth
                    />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={handleClose} color="inherit">
                    取消
                </Button>
                <Button onClick={handleSubmit} variant="contained">
                    建立專案
                </Button>
            </DialogActions>
        </Dialog>
    );
}
