import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Visibility,
  Assignment,
  CheckCircle,
  Search,
  FilterList
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loading from '../../components/Common/Loading';

interface Document {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completionPercentage: number;
  createdAt: string;
  signatures: Array<{
    userId: string;
    userName: string;
    signedAt: string;
  }>;
  requiredSignatures: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  originalName: string;
  size: number;
}

const CouncilorDocuments: React.FC = () => {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all'
  });

  const { data: documents, isLoading: documentsLoading } = useQuery(
    ['councilorDocuments', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      
      const response = await axios.get(`/documents?${params}`);
      return response.data.data.documents;
    }
  );

  if (documentsLoading) {
    return <Loading message="Loading documents..." />;
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

  const hasUserSigned = (document: Document) => {
    return document.signatures.some(sig => sig.userId);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        My Documents
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Review and sign documents assigned to you
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  label="Priority"
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents?.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Documents Found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No documents match your current filter criteria.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {documents?.map((document: Document) => {
            const userSigned = hasUserSigned(document);
            
            return (
              <Grid item xs={12} key={document._id}>
                <Card sx={{ 
                  border: userSigned ? '2px solid' : '1px solid',
                  borderColor: userSigned ? 'success.main' : 'divider'
                }}>
                  <CardContent>
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} md={8}>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Avatar sx={{ 
                            bgcolor: userSigned ? 'success.main' : 'warning.main',
                            width: 48,
                            height: 48
                          }}>
                            {userSigned ? <CheckCircle /> : <Assignment />}
                          </Avatar>
                          <Box flexGrow={1}>
                            <Typography variant="h6" gutterBottom>
                              {document.title}
                            </Typography>
                            <Box display="flex" gap={1} mb={1}>
                              <Chip
                                label={document.status}
                                color={getStatusColor(document.status) as any}
                                size="small"
                              />
                              <Chip
                                label={document.priority}
                                color={getPriorityColor(document.priority) as any}
                                size="small"
                                variant="outlined"
                              />
                              {userSigned && (
                                <Chip
                                  label="Signed by You"
                                  color="success"
                                  size="small"
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {document.description || 'No description available'}
                        </Typography>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            Progress: {document.completionPercentage}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={document.completionPercentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              <strong>File:</strong> {document.originalName}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Size:</strong> {(document.size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Created:</strong> {new Date(document.createdAt).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Signatures:</strong> {document.signatures.length} / {document.requiredSignatures.length}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Box display="flex" flexDirection="column" gap={2} height="100%">
                          <Button
                            variant="contained"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/documents/${document._id}`)}
                            fullWidth
                            size="large"
                          >
                            {userSigned ? 'View Document' : 'Review & Sign'}
                          </Button>
                          
                          {document.signatures.length > 0 && (
                            <Box>
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                Recent Signatures:
                              </Typography>
                              <List dense>
                                {document.signatures.slice(0, 2).map((signature, index) => (
                                  <ListItem key={index} sx={{ px: 0 }}>
                                    <ListItemAvatar>
                                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                        {signature.userName.charAt(0)}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={signature.userName}
                                      secondary={new Date(signature.signedAt).toLocaleDateString()}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                      secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default CouncilorDocuments;