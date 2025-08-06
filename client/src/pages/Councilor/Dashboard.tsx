import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  Button,
  LinearProgress
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  Visibility
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
  signatures: any[];
  requiredSignatures: any[];
}

const CouncilorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>(
    'councilorDocuments',
    async () => {
      const response = await axios.get('/documents');
      return response.data.data.documents;
    }
  );

  if (documentsLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  // Calculate statistics
  const totalDocuments = documents?.length || 0;
  const completedDocuments = documents?.filter(doc => 
    doc.signatures.some(sig => sig.userId)
  ).length || 0;
  const pendingDocuments = documents?.filter(doc => 
    !doc.signatures.some(sig => sig.userId) && doc.status !== 'completed'
  ).length || 0;
  const urgentDocuments = documents?.filter(doc => 
    doc.priority === 'urgent' && !doc.signatures.some(sig => sig.userId)
  ).length || 0;

  // Get recent documents
  const recentDocuments = documents?.slice(0, 5) || [];

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h3" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Councilor Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to your document portal. Review and sign documents assigned to you.
      </Typography>

      {/* Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Document Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={totalDocuments}
            icon={<Assignment />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={completedDocuments}
            icon={<CheckCircle />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Signature"
            value={pendingDocuments}
            icon={<Schedule />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Urgent"
            value={urgentDocuments}
            icon={<Warning />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Recent Documents */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" gutterBottom>
                  Recent Documents
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/councilor/documents')}
                >
                  View All
                </Button>
              </Box>
              
              {recentDocuments.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
                  No documents assigned to you yet.
                </Typography>
              ) : (
                <List>
                  {recentDocuments.map((document) => {
                    const hasUserSigned = document.signatures.some(sig => sig.userId);
                    
                    return (
                      <ListItem 
                        key={document._id} 
                        divider
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/documents/${document._id}`)}
                          >
                            View
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: hasUserSigned ? 'success.main' : 'warning.main' }}>
                            {hasUserSigned ? <CheckCircle /> : <Assignment />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body1" fontWeight="medium">
                                {document.title}
                              </Typography>
                              <Chip
                                label={document.priority}
                                size="small"
                                color={getPriorityColor(document.priority) as any}
                                variant="outlined"
                              />
                              {hasUserSigned && (
                                <Chip
                                  label="Signed"
                                  size="small"
                                  color="success"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                {document.description || 'No description available'}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Created: {new Date(document.createdAt).toLocaleDateString()}
                              </Typography>
                              <Box mt={1}>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                  Progress: {document.completionPercentage}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={document.completionPercentage}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CouncilorDashboard;