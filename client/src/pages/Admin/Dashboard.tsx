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
  Chip
} from '@mui/material';
import {
  Description,
  People,
  CheckCircle,
  Schedule,
  Warning,
  Person
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import Loading from '../../components/Common/Loading';

interface StatsData {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
}

interface UserStatsData {
  total: number;
  active: number;
  inactive: number;
  admin: number;
  councilor: number;
  recentUsers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { data: documentStats, isLoading: documentStatsLoading } = useQuery<StatsData>(
    'documentStats',
    async () => {
      const response = await axios.get('/documents/stats/overview');
      return response.data.data;
    }
  );

  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserStatsData>(
    'userStats',
    async () => {
      const response = await axios.get('/users/stats');
      return response.data.data;
    }
  );

  if (documentStatsLoading || userStatsLoading) {
    return <Loading message="Loading dashboard..." />;
  }

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Overview of system activity and statistics
      </Typography>

      {/* Document Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Document Statistics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={documentStats?.total || 0}
            icon={<Description />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={documentStats?.completed || 0}
            icon={<CheckCircle />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Progress"
            value={documentStats?.inProgress || 0}
            icon={<Schedule />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={documentStats?.pending || 0}
            icon={<Warning />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* User Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        User Statistics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={userStats?.total || 0}
            icon={<People />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={userStats?.active || 0}
            icon={<Person />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Administrators"
            value={userStats?.admin || 0}
            icon={<Person />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Councilors"
            value={userStats?.councilor || 0}
            icon={<Person />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Recent Users */}
      {userStats?.recentUsers && userStats.recentUsers.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recently Added Users
                </Typography>
                <List>
                  {userStats.recentUsers.map((user) => (
                    <ListItem key={user._id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.firstName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName}`}
                        secondary={user.email}
                      />
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === 'admin' ? 'secondary' : 'primary'}
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminDashboard;