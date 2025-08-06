import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Divider
} from '@mui/material';
import {
  Download,
  Create,
  CheckCircle,
  Schedule,
  Person
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Common/Loading';

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
  signatures: Array<{
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    userName: string;
    signatureData: string;
    signedAt: string;
    ipAddress: string;
  }>;
  createdAt: string;
  completionPercentage: number;
}

const DocumentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  const [openSignDialog, setOpenSignDialog] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  // Fetch document
  const { data: document, isLoading: documentLoading } = useQuery<Document>(
    ['document', id],
    async () => {
      const response = await axios.get(`/documents/${id}`);
      return response.data.data.document;
    },
    {
      enabled: !!id
    }
  );

  // Sign document mutation
  const signMutation = useMutation(
    async (signatureData: string) => {
      const response = await axios.post(`/documents/${id}/sign`, {
        signatureData
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['document', id]);
        setOpenSignDialog(false);
        enqueueSnackbar('Document signed successfully!', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to sign document',
          { variant: 'error' }
        );
      }
    }
  );

  const handleSign = () => {
    if (!signatureRef.current?.isEmpty()) {
      const signatureData = signatureRef.current?.toDataURL();
      if (signatureData) {
        signMutation.mutate(signatureData);
      }
    } else {
      enqueueSnackbar('Please provide a signature', { variant: 'warning' });
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleDownload = () => {
    window.open(`/api/documents/${id}/download`, '_blank');
  };

  if (documentLoading) {
    return <Loading message="Loading document..." />;
  }

  if (!document) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" gutterBottom>
          Document not found
        </Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

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

  const hasUserSigned = document.signatures.some(
    sig => sig.userId._id === user?.id
  );

  const canUserSign = document.requiredSignatures.some(
    req => req._id === user?.id
  ) && !hasUserSigned;

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                {document.title}
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                {document.description || 'No description provided'}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip
                label={document.status}
                color={getStatusColor(document.status) as any}
                size="medium"
              />
              <Chip
                label={document.priority}
                color={getPriorityColor(document.priority) as any}
                size="medium"
                variant="outlined"
              />
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                <strong>Uploaded by:</strong>
              </Typography>
              <Typography variant="body2">
                {document.uploadedBy.firstName} {document.uploadedBy.lastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                <strong>File:</strong>
              </Typography>
              <Typography variant="body2">
                {document.originalName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                <strong>Size:</strong>
              </Typography>
              <Typography variant="body2">
                {(document.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                <strong>Created:</strong>
              </Typography>
              <Typography variant="body2">
                {new Date(document.createdAt).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownload}
                  size="large"
                >
                  Download
                </Button>
                
                {canUserSign && (
                  <Button
                    variant="contained"
                    startIcon={<Create />}
                    onClick={() => setOpenSignDialog(true)}
                    size="large"
                    color="primary"
                  >
                    Sign Document
                  </Button>
                )}
                
                {hasUserSigned && (
                  <Chip
                    label="You have signed this document"
                    color="success"
                    icon={<CheckCircle />}
                    size="medium"
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Signature Progress
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {document.signatures.length} of {document.requiredSignatures.length} signatures completed ({document.completionPercentage}%)
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Required Signatures
              </Typography>
              <List>
                {document.requiredSignatures.map((required) => {
                  const hasSigned = document.signatures.some(
                    sig => sig.userId._id === required._id
                  );
                  const signature = document.signatures.find(
                    sig => sig.userId._id === required._id
                  );
                  
                  return (
                    <ListItem key={required._id}>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: hasSigned ? 'success.main' : 'grey.300',
                          color: hasSigned ? 'white' : 'grey.600'
                        }}>
                          {hasSigned ? <CheckCircle /> : <Person />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${required.firstName} ${required.lastName}`}
                        secondary={
                          hasSigned
                            ? `Signed on ${new Date(signature!.signedAt).toLocaleDateString()}`
                            : 'Pending signature'
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Signatures */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Signatures ({document.signatures.length})
              </Typography>
              
              {document.signatures.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
                  No signatures yet
                </Typography>
              ) : (
                <List>
                  {document.signatures.map((signature, index) => (
                    <ListItem key={index} divider={index < document.signatures.length - 1}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          {signature.userName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={signature.userName}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {new Date(signature.signedAt).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              IP: {signature.ipAddress}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Signature Dialog */}
      <Dialog
        open={openSignDialog}
        onClose={() => setOpenSignDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Sign Document</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please draw your signature in the box below:
          </Typography>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mt: 2,
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2
            }}
          >
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                width: 500,
                height: 200,
                className: 'signature-canvas',
                style: { border: '1px solid #ccc', borderRadius: '4px', width: '100%' }
              }}
            />
          </Paper>
          <Box mt={2} display="flex" justifyContent="space-between">
            <Button variant="outlined" onClick={clearSignature}>
              Clear
            </Button>
            <Typography variant="body2" color="textSecondary">
              Draw your signature above
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSignDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            variant="contained"
            disabled={signMutation.isLoading}
          >
            {signMutation.isLoading ? 'Signing...' : 'Sign Document'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentView;