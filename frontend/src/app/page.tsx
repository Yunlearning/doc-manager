'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Container,
  Toolbar,
  Snackbar,
  Alert,
} from '@mui/material';
import Header from '@/components/layout/Header';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectDialog from '@/components/projects/ProjectDialog';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import DocumentTree from '@/components/tree/DocumentTree';
import TierDialog from '@/components/tree/TierDialog';
import TierEditDialog from '@/components/tree/TierEditDialog';
import TierDeleteDialog from '@/components/tree/TierDeleteDialog';
import UploadDialog from '@/components/documents/UploadDialog';
import DocumentTable from '@/components/documents/DocumentTable';
import { useProjects } from '@/hooks/useProjects';
import { useDocumentTree, useDocuments } from '@/hooks/useDocuments';
import { CreateProjectFormData } from '@/validators/schemas';
import { TreeNode, DocumentItem, Project } from '@/types';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Add,
  AccountTree,
  Description,
} from '@mui/icons-material';
import { Button, Paper, Chip, IconButton, Tooltip } from '@mui/material';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();
  const { projects, isLoading: loadingProjects, mutate: mutateProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TreeNode | null>(null);

  // Dialog states
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tierEditOpen, setTierEditOpen] = useState(false);
  const [tierDeleteOpen, setTierDeleteOpen] = useState(false);
  const [tierToEdit, setTierToEdit] = useState<TreeNode | null>(null);
  const [tierToDelete, setTierToDelete] = useState<TreeNode | null>(null);
  
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [tierDialogParentId, setTierDialogParentId] = useState<string | null>(null);
  const [tierDialogLevel, setTierDialogLevel] = useState(1);
  const [uploadTierId, setUploadTierId] = useState('');
  const [versionUploadDoc, setVersionUploadDoc] = useState<DocumentItem | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { tree, isLoading: loadingTree, mutate: mutateTree } = useDocumentTree(selectedProjectId);
  const { documents, isLoading: loadingDocuments, mutate: mutateDocuments } = useDocuments(
    selectedTier?.id || null,
  );

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handlers
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTier(null);
  };

  const handleCreateProject = async (data: CreateProjectFormData) => {
    try {
      await api.post('/projects', data);
      await mutateProjects();
      setProjectDialogOpen(false);
      showSnackbar('專案建立成功');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '建立失敗', 'error');
    }
  };

  const handleSelectTier = (tier: TreeNode) => {
    setSelectedTier(tier);
  };

  const handleAddTier = (parentTier: TreeNode | null, tierLevel: number) => {
    setTierDialogParentId(parentTier?.id || null);
    setTierDialogLevel(tierLevel);
    setTierDialogOpen(true);
  };

  const handleCreateTier = async (data: {
    name: string;
    tierLevel: number;
    parentId: string | null;
    projectId: string;
  }) => {
    try {
      await api.post('/tiers', data);
      await mutateTree();
      setTierDialogOpen(false);
      showSnackbar('節點建立成功');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '建立失敗', 'error');
    }
  };

  const handleEditTier = (tier: TreeNode) => {
    setTierToEdit(tier);
    setTierEditOpen(true);
  };

  const handleUpdateTier = async (id: string, name: string) => {
    try {
      await api.put(`/tiers/${id}`, { name });
      await mutateTree();
      if (selectedTier?.id === id) {
        setSelectedTier(prev => prev ? { ...prev, name } : null);
      }
      setTierEditOpen(false);
      showSnackbar('節點已重新命名');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '重新命名失敗', 'error');
    }
  };

  const handleDeleteTier = (tier: TreeNode) => {
    setTierToDelete(tier);
    setTierDeleteOpen(true);
  };

  const handleConfirmDeleteTier = async (id: string) => {
    try {
      await api.delete(`/tiers/${id}`);
      await mutateTree();
      if (selectedTier?.id === id) {
        setSelectedTier(null);
      }
      setTierDeleteOpen(false);
      showSnackbar('節點已刪除');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '刪除失敗', 'error');
    }
  };

  const handleUpload = (tierId: string) => {
    setUploadTierId(tierId);
    setVersionUploadDoc(null);
    setUploadDialogOpen(true);
  };

  const handleUploaded = () => {
    mutateTree();
    mutateDocuments();
    showSnackbar('文件上傳成功');
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      mutateDocuments();
      mutateTree();
      showSnackbar('文件已刪除');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '刪除失敗', 'error');
    }
  };

  const handleOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      // If the deleted project was currently selected, go back to dashboard
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
        setSelectedTier(null);
      }
      await mutateProjects();
      showSnackbar('專案已刪除');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '刪除失敗', 'error');
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Dashboard view (no project selected)
  const renderDashboard = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          儀表板
        </Typography>
        <Typography variant="body1" color="text.secondary">
          選擇專案以管理四階文件結構，或建立新的專案。
        </Typography>
      </Box>

      {loadingProjects ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <AccountTree sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            尚未建立任何專案
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {hasPermission('CREATE_PROJECT')
              ? '點擊右上角的 + 按鈕建立您的第一個專案'
              : '請聯繫管理員建立專案或授予建立權限'
            }
          </Typography>
          {hasPermission('CREATE_PROJECT') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setProjectDialogOpen(true)}
            >
              建立專案
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
              <ProjectCard
                project={project}
                onSelect={handleProjectChange}
                onDelete={hasPermission('CREATE_PROJECT') ? handleOpenDeleteDialog : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );

  // Project view (project selected)
  const renderProjectView = () => (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Left panel: Tree */}
      <Paper
        sx={{
          width: 360,
          minWidth: 360,
          borderRadius: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTree sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              文件結構
            </Typography>
          </Box>
          {hasPermission('CREATE_PROJECT') && (
            <Tooltip title="新增一階節點">
              <IconButton
                size="small"
                onClick={() => handleAddTier(null, 1)}
                sx={{
                  bgcolor: 'rgba(108, 99, 255, 0.1)',
                  '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.2)' },
                }}
              >
                <Add sx={{ fontSize: 18, color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <DocumentTree
            tree={tree}
            isLoading={loadingTree}
            onSelectTier={handleSelectTier}
            onAddTier={hasPermission('CREATE_PROJECT') ? handleAddTier : undefined}
            onEditTier={hasPermission('CREATE_PROJECT') ? handleEditTier : undefined}
            onDeleteTier={hasPermission('CREATE_PROJECT') ? handleDeleteTier : undefined}
            onUpload={hasPermission('UPLOAD') ? handleUpload : undefined}
            selectedTierId={selectedTier?.id}
          />
        </Box>
      </Paper>

      {/* Right panel: Documents */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {selectedTier ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedTier.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={`階層 ${selectedTier.tierLevel}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem' }}
                  />
                  <Chip
                    label={`${documents.length} 個文件`}
                    size="small"
                    sx={{ height: 22, fontSize: '0.7rem', bgcolor: 'rgba(148, 163, 184, 0.1)' }}
                  />
                </Box>
              </Box>
              {hasPermission('UPLOAD') && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleUpload(selectedTier.id)}
                >
                  上傳文件
                </Button>
              )}
            </Box>
            <DocumentTable
              documents={documents}
              isLoading={loadingDocuments}
              onDelete={hasPermission('DELETE_DOCUMENT') ? handleDeleteDocument : undefined}
              canDownload={hasPermission('DOWNLOAD')}
              canUpload={hasPermission('UPLOAD')}
              onUploadNewVersion={(doc) => {
                setVersionUploadDoc(doc);
                setUploadTierId(selectedTier!.id);
                setUploadDialogOpen(true);
              }}
              onVersionReverted={() => mutateDocuments()}
            />
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
            <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              選擇左側節點以查看文件
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
        onCreateProject={() => setProjectDialogOpen(true)}
        onGoHome={() => {
          setSelectedProjectId(null);
          setSelectedTier(null);
        }}
        isLoading={loadingProjects}
      />
      <Toolbar /> {/* Spacer for fixed AppBar */}

      {selectedProjectId ? renderProjectView() : renderDashboard()}

      {/* Dialogs */}
      <ProjectDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        onSubmit={handleCreateProject}
      />

      <DeleteProjectDialog
        open={deleteDialogOpen}
        project={projectToDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
      />

      {selectedProjectId && (
        <TierDialog
          open={tierDialogOpen}
          onClose={() => setTierDialogOpen(false)}
          onSubmit={handleCreateTier}
          projectId={selectedProjectId}
          parentId={tierDialogParentId}
          tierLevel={tierDialogLevel}
        />
      )}

      {uploadTierId && (
        <UploadDialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setVersionUploadDoc(null);
          }}
          tierId={uploadTierId}
          onUploaded={handleUploaded}
          existingDocument={versionUploadDoc}
        />
      )}

      <TierEditDialog
        open={tierEditOpen}
        tier={tierToEdit}
        onClose={() => {
          setTierEditOpen(false);
          setTierToEdit(null);
        }}
        onSubmit={handleUpdateTier}
      />

      <TierDeleteDialog
        open={tierDeleteOpen}
        tier={tierToDelete}
        onClose={() => {
          setTierDeleteOpen(false);
          setTierToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTier}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
