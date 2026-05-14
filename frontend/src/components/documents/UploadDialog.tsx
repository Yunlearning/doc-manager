'use client';
import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    LinearProgress,
    Chip,
    Alert,
} from '@mui/material';
import { CloudUpload, InsertDriveFile, UploadFile } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import { DocumentItem } from '@/types';

interface UploadDialogProps {
    open: boolean;
    onClose: () => void;
    tierId: string;
    onUploaded: () => void;
    /** When provided, the dialog uploads a new version of this document */
    existingDocument?: DocumentItem | null;
}

export default function UploadDialog({ open, onClose, tierId, onUploaded, existingDocument }: UploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [changelog, setChangelog] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [jobStatus, setJobStatus] = useState<string | null>(null);

    const isNewVersion = !!existingDocument;

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            setFile(selectedFile);
            if (!title && !isNewVersion) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
            }
        }
    }, [title, isNewVersion]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024,
    });

    const pollJob = async (jobId: string) => {
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds

        while (attempts < maxAttempts) {
            try {
                const res = await api.get(`/documents/jobs/${jobId}`);
                const job = res.data.data;

                setProgress(typeof job.progress === 'number' ? job.progress : 0);
                setJobStatus(job.state);

                if (job.state === 'completed') {
                    setUploading(false);
                    onUploaded();
                    handleClose();
                    return;
                }

                if (job.state === 'failed') {
                    setError(job.failedReason || '上傳失敗');
                    setUploading(false);
                    return;
                }
            } catch {
                // Continue polling
            }
            attempts++;
            await new Promise((r) => setTimeout(r, 500));
        }

        setError('上傳超時');
        setUploading(false);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('請選擇檔案');
            return;
        }

        const uploadTitle = isNewVersion ? existingDocument!.title : title.trim();
        if (!uploadTitle) {
            setError('請輸入文件標題');
            return;
        }

        setError('');
        setUploading(true);
        setProgress(0);
        setJobStatus('waiting');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tierId', tierId);
            formData.append('title', uploadTitle);

            // If uploading new version, pass documentId and changelog
            if (isNewVersion && existingDocument) {
                formData.append('documentId', existingDocument.id);
                if (changelog.trim()) {
                    formData.append('changelog', changelog.trim());
                }
            }

            const res = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { jobId } = res.data.data;
            await pollJob(jobId);
        } catch (err: any) {
            setError(err.response?.data?.message || '上傳失敗');
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return;
        setFile(null);
        setTitle('');
        setChangelog('');
        setError('');
        setProgress(0);
        setJobStatus(null);
        onClose();
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isNewVersion ? <UploadFile color="primary" /> : <CloudUpload color="primary" />}
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {isNewVersion ? '上傳新版本' : '上傳文件'}
                    </Typography>
                </Box>
                {isNewVersion && existingDocument && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {existingDocument.title}
                        </Typography>
                        <Chip
                            label={`目前 v${existingDocument.currentVersion}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            → v{existingDocument.currentVersion + 1}
                        </Typography>
                    </Box>
                )}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
                {error && (
                    <Alert severity="error" onClose={() => setError('')} sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}

                {/* Dropzone */}
                <Box
                    {...getRootProps()}
                    sx={{
                        mt: 1,
                        p: 4,
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        bgcolor: isDragActive ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'rgba(108, 99, 255, 0.04)',
                        },
                    }}
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <InsertDriveFile sx={{ color: 'primary.main' }} />
                            <Box>
                                <Typography variant="body2">{file.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatFileSize(file.size)}
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
                            <Typography variant="body2" color="text.secondary">
                                {isDragActive ? '放開以上傳檔案' : '拖放檔案至此處，或點擊選擇檔案'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                最大 50MB
                            </Typography>
                        </>
                    )}
                </Box>

                {/* Title — editable only for new uploads */}
                {!isNewVersion && (
                    <TextField
                        label="文件標題"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                )}

                {/* Changelog — only for new version */}
                {isNewVersion && (
                    <TextField
                        label="版本更新說明"
                        value={changelog}
                        onChange={(e) => setChangelog(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="描述此版本的主要變更..."
                    />
                )}

                {uploading && (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {jobStatus === 'waiting' ? '排隊中...' : jobStatus === 'active' ? '處理中...' : '上傳中...'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {progress}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(108, 99, 255, 0.15)',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #6C63FF, #00D9A6)',
                                    borderRadius: 3,
                                },
                            }}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={handleClose} color="inherit" disabled={uploading}>
                    取消
                </Button>
                <Button onClick={handleUpload} variant="contained" disabled={uploading || !file}>
                    {uploading ? '上傳中...' : isNewVersion ? '上傳新版本' : '上傳'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
