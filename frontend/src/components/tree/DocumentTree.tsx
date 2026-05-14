'use client';
import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    Collapse,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Chip,
    CircularProgress,
    Paper,
} from '@mui/material';
import {
    ExpandMore,
    ChevronRight,
    Folder,
    FolderOpen,
    Description,
    Add,
    CloudUpload,
    Edit,
    Delete,
} from '@mui/icons-material';
import { TreeNode, DocumentItem } from '@/types';

interface DocumentTreeProps {
    tree: TreeNode[];
    isLoading: boolean;
    onSelectTier: (tier: TreeNode) => void;
    onAddTier?: (parentTier: TreeNode | null, tierLevel: number) => void;
    onEditTier?: (tier: TreeNode) => void;
    onDeleteTier?: (tier: TreeNode) => void;
    onUpload?: (tierId: string) => void;
    selectedTierId?: string | null;
}

const TIER_LABELS: Record<number, string> = {
    1: '一階',
    2: '二階',
    3: '三階',
    4: '四階',
};

const TIER_COLORS: Record<number, string> = {
    1: '#6C63FF',
    2: '#00D9A6',
    3: '#FFB84D',
    4: '#4FC3F7',
};

function TreeItem({
    node,
    depth,
    onSelectTier,
    onAddTier,
    onEditTier,
    onDeleteTier,
    onUpload,
    selectedTierId,
}: {
    node: TreeNode;
    depth: number;
    onSelectTier: (tier: TreeNode) => void;
    onAddTier?: (parentTier: TreeNode | null, tierLevel: number) => void;
    onEditTier?: (tier: TreeNode) => void;
    onDeleteTier?: (tier: TreeNode) => void;
    onUpload?: (tierId: string) => void;
    selectedTierId?: string | null;
}) {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const hasDocuments = node.documents && node.documents.length > 0;
    const isSelected = selectedTierId === node.id;
    const tierColor = TIER_COLORS[node.tierLevel] || '#94A3B8';

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
    };

    return (
        <>
            <ListItemButton
                onClick={() => onSelectTier(node)}
                selected={isSelected}
                sx={{
                    pl: 2 + depth * 2.5,
                    py: 0.8,
                    borderRadius: 1.5,
                    mx: 1,
                    mb: 0.3,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                        bgcolor: `${tierColor}15`,
                        borderLeft: `3px solid ${tierColor}`,
                        '&:hover': {
                            bgcolor: `${tierColor}20`,
                        },
                    },
                    '&:hover': {
                        bgcolor: 'rgba(148, 163, 184, 0.06)',
                    },
                }}
            >
                {hasChildren || hasDocuments ? (
                    <IconButton size="small" onClick={handleToggle} sx={{ mr: 0.5, p: 0.3 }}>
                        {open ? (
                            <ExpandMore sx={{ fontSize: 18, color: tierColor }} />
                        ) : (
                            <ChevronRight sx={{ fontSize: 18, color: tierColor }} />
                        )}
                    </IconButton>
                ) : (
                    <Box sx={{ width: 30 }} />
                )}

                <ListItemIcon sx={{ minWidth: 32 }}>
                    {open && (hasChildren || hasDocuments) ? (
                        <FolderOpen sx={{ color: tierColor, fontSize: 20 }} />
                    ) : (
                        <Folder sx={{ color: tierColor, fontSize: 20 }} />
                    )}
                </ListItemIcon>

                <ListItemText
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                                {node.name}
                            </Typography>
                            <Chip
                                label={TIER_LABELS[node.tierLevel] || `L${node.tierLevel}`}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    bgcolor: `${tierColor}20`,
                                    color: tierColor,
                                    border: `1px solid ${tierColor}40`,
                                }}
                            />
                            {hasDocuments && (
                                <Chip
                                    label={`${node.documents.length} 文件`}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.6rem',
                                        bgcolor: 'rgba(148, 163, 184, 0.1)',
                                        color: 'text.secondary',
                                    }}
                                />
                            )}
                        </Box>
                    }
                />

                {(onAddTier || onUpload || onEditTier || onDeleteTier) && (
                    <Box sx={{ display: 'flex', gap: 0.3, opacity: 0, transition: 'opacity 0.2s', '.MuiListItemButton-root:hover &': { opacity: 1 } }}
                        className="tree-actions"
                    >
                        {onAddTier && node.tierLevel < 4 && (
                            <Tooltip title={`新增${TIER_LABELS[node.tierLevel + 1]}節點`}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddTier(node, node.tierLevel + 1);
                                    }}
                                    sx={{ p: 0.3 }}
                                >
                                    <Add sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onUpload && (
                            <Tooltip title="上傳文件">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpload(node.id);
                                    }}
                                    sx={{ p: 0.3 }}
                                >
                                    <CloudUpload sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onEditTier && (
                            <Tooltip title="重新命名">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTier(node);
                                    }}
                                    sx={{ p: 0.3 }}
                                >
                                    <Edit sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onDeleteTier && (
                            <Tooltip title="刪除節點">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTier(node);
                                    }}
                                    sx={{ p: 0.3 }}
                                >
                                    <Delete sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
            </ListItemButton>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <List disablePadding>
                    {node.children?.map((child) => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            onSelectTier={onSelectTier}
                            onAddTier={onAddTier}
                            onEditTier={onEditTier}
                            onDeleteTier={onDeleteTier}
                            onUpload={onUpload}
                            selectedTierId={selectedTierId}
                        />
                    ))}
                    {node.documents?.map((doc) => (
                        <ListItemButton
                            key={doc.id}
                            sx={{
                                pl: 2 + (depth + 1) * 2.5 + 3.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                mx: 1,
                                mb: 0.2,
                                '&:hover': {
                                    bgcolor: 'rgba(148, 163, 184, 0.06)',
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <Description sx={{ fontSize: 16, color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {doc.title}
                                    </Typography>
                                }
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Collapse>
        </>
    );
}

export default function DocumentTree({
    tree,
    isLoading,
    onSelectTier,
    onAddTier,
    onEditTier,
    onDeleteTier,
    onUpload,
    selectedTierId,
}: DocumentTreeProps) {
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (tree.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                <Folder sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                    尚無文件結構
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    點擊上方按鈕新增一階節點
                </Typography>
            </Box>
        );
    }

    return (
        <List
            dense
            sx={{
                py: 1,
                '& .MuiListItemButton-root:hover .tree-actions': {
                    opacity: '1 !important',
                },
            }}
        >
            {tree.map((node) => (
                <TreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelectTier={onSelectTier}
                    onAddTier={onAddTier}
                    onEditTier={onEditTier}
                    onDeleteTier={onDeleteTier}
                    onUpload={onUpload}
                    selectedTierId={selectedTierId}
                />
            ))}
        </List>
    );
}
