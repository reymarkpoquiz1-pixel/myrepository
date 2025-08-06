import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  LinearProgress
} from '@mui/material';
import {
  Upload,
  Visibility,
  Edit,
  Delete,
  Download,
  Add
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import Loading from '../../components/Common/Loading';

interface Document {
  _id: string;
  title: string;
  description: string;
  filename: string;
  originalName: string;
  size: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  uploadedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  requiredSignatures: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  signatures: any[];
  createdAt: string;
  completionPercentage: number;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const AdminDocuments: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    requiredSignatures: [] as User[],
    file: null as File | null
  });

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>(
    'adminDocuments',
    async () => {
      const response = await axios.get('/documents');
      return response.data.data.documents;
    }
  );

  // Fetch users for signature selection
  const { data: users } = useQuery<User[]>(
    'users',
    async () => {
      const response = await axios.get('/users');
      return response.data.data.users.filter((user: User) => user.role === 'councilor');
    }
  );

  // Upload mutation
  const uploadMutation = useMutation(
    async (formData: FormData) => {
      const response = await axios.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminDocuments');
        setOpenUpload(false);
        setUploadForm({
          title: '',
          description: '',
          priority: 'medium',
          requiredSignatures: [],
          file: null
        });
        enqueueSnackbar('Document uploaded successfully', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Upload failed',
          { variant: 'error' }
        );
      }
    }
  );

  // File drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadForm({ ...uploadForm, file: acceptedFiles[0] });
      }
    }
  });

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      enqueueSnackbar('Please provide a title and select a file', { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('document', uploadForm.file);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('priority', uploadForm.priority);
    formData.append('requiredSignatures', JSON.stringify(
      uploadForm.requiredSignatures.map(user => user._id)
    ));

    uploadMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (documentsLoading) {
    return <Loading message="Loading documents..." />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Document Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Upload and manage documents for councilor signatures
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setOpenUpload(true)}
          size="large"
        >
          Upload Document
        </Button>
      </Box>

      {/* Documents List */}
      <Grid container spacing={3}>
        {documents?.map((document) => (
          <Grid item xs={12} md={6} lg={4} key={document._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom noWrap>
                  {document.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {document.description || 'No description'}
                </Typography>
                
                <Box mb={2}>
                  <Chip
                    label={document.status}
                    color={getStatusColor(document.status) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={document.priority}
                    color={getPriorityColor(document.priority) as any}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Progress: {document.completionPercentage}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={document.completionPercentage}
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" color="textSecondary">
                  Signatures: {document.signatures.length} / {document.requiredSignatures.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  File: {document.originalName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Size: {(document.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </CardContent>
              
              <Box p={2} pt={0}>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => window.open(`/documents/${document._id}`, '_blank')}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => {
                      window.open(`/api/documents/${document._id}/download`, '_blank');
                    }}
                  >
                    <Download />
                  </IconButton>
                  <IconButton size="small" color="warning">
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upload Dialog */}
      <Dialog
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload New Document</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Document Title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={uploadForm.priority}
                  label="Priority"
                  onChange={(e) => setUploadForm({ ...uploadForm, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={users || []}
                getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
                value={uploadForm.requiredSignatures}
                onChange={(_, newValue) => {
                  setUploadForm({ ...uploadForm, requiredSignatures: newValue });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Required Signatures"
                    placeholder="Select councilors"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                {...getRootProps()}
                className={`file-drop-zone ${isDragActive ? 'active' : ''}`}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'primary.light' : 'background.paper'
                }}
              >
                <input {...getInputProps()} />
                {uploadForm.file ? (
                  <Box>
                    <Typography variant="h6" color="primary">
                      Selected File:
                    </Typography>
                    <Typography variant="body1">
                      {uploadForm.file.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Drop files here or click to select
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Supported: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT (Max 10MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploadMutation.isLoading || !uploadForm.file || !uploadForm.title.trim()}
          >
            {uploadMutation.isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocuments;