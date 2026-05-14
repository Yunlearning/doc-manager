'use client';
import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    Chip,
    Grid,
    IconButton,
    Tooltip,
} from '@mui/material';
import { FolderOpen, ArrowForward, DeleteOutline } from '@mui/icons-material';
import { Project } from '@/types';

interface ProjectCardProps {
    project: Project;
    onSelect: (id: string) => void;
    onDelete?: (project: Project) => void;
}

const STANDARD_COLORS: Record<string, string> = {
    'ISO 27001': '#6C63FF',
    'ISO 9001': '#00D9A6',
    'ISO 14001': '#FFB84D',
    'ISO 45001': '#FF6B6B',
    'ISO 22000': '#4FC3F7',
};

export default function ProjectCard({ project, onSelect, onDelete }: ProjectCardProps) {
    const accentColor = STANDARD_COLORS[project.standardType] || '#6C63FF';

    return (
        <Card
            sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 40px ${accentColor}20`,
                    '& .card-glow': {
                        opacity: 1,
                    },
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
                },
            }}
            onClick={() => onSelect(project.id)}
        >
            <Box
                className="card-glow"
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(ellipse at top, ${accentColor}08 0%, transparent 70%)`,
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    pointerEvents: 'none',
                }}
            />
            <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: `${accentColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FolderOpen sx={{ color: accentColor, fontSize: 24 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                            label={project.standardType}
                            size="small"
                            sx={{
                                bgcolor: `${accentColor}15`,
                                color: accentColor,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                border: `1px solid ${accentColor}30`,
                            }}
                        />
                        {onDelete && (
                            <Tooltip title="刪除專案">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(project);
                                    }}
                                    sx={{
                                        color: 'text.secondary',
                                        opacity: 0.5,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            color: 'error.main',
                                            opacity: 1,
                                            bgcolor: 'rgba(255, 107, 107, 0.08)',
                                        },
                                    }}
                                >
                                    <DeleteOutline sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {project.name}
                </Typography>

                {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.5 }}>
                        {project.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Chip
                        label={`${project._count?.tiers || 0} 個節點`}
                        size="small"
                        sx={{ height: 22, fontSize: '0.7rem', bgcolor: 'rgba(148, 163, 184, 0.1)' }}
                    />
                </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                    size="small"
                    endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                    sx={{
                        color: accentColor,
                        fontWeight: 600,
                        '&:hover': { bgcolor: `${accentColor}10` },
                    }}
                >
                    開啟專案
                </Button>
            </CardActions>
        </Card>
    );
}

