import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Inventory,
  TrendingUp,
  Warning,
  ShoppingCart,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';

interface DashboardData {
  summary: {
    total_products: number;
    total_stock_value: number;
    low_stock_products: number;
    out_of_stock_products: number;
  };
  recent_activities: Array<{
    action: string;
    table_name: string;
    created_at: string;
    username: string;
    product_name?: string;
  }>;
  top_products: Array<{
    name: string;
    sku: string;
    current_stock: number;
    movement_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    movement_type: string;
    count: number;
    total_quantity: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard');
      setDashboardData(response.data);
    } catch (error: any) {
      showError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (!dashboardData) {
    return <Typography>No data available</Typography>;
  }

  const summaryCards = [
    {
      title: 'Total Products',
      value: dashboardData.summary.total_products,
      icon: <Inventory />,
      color: 'primary',
    },
    {
      title: 'Stock Value',
      value: `$${dashboardData.summary.total_stock_value.toLocaleString()}`,
      icon: <TrendingUp />,
      color: 'success',
    },
    {
      title: 'Low Stock',
      value: dashboardData.summary.low_stock_products,
      icon: <Warning />,
      color: 'warning',
    },
    {
      title: 'Out of Stock',
      value: dashboardData.summary.out_of_stock_products,
      icon: <ShoppingCart />,
      color: 'error',
    },
  ];

  // Process monthly trends for charts
  const chartData = dashboardData.monthly_trends.reduce((acc, item) => {
    const existing = acc.find(d => d.month === item.month);
    if (existing) {
      existing[item.movement_type] = item.total_quantity;
    } else {
      acc.push({
        month: item.month,
        [item.movement_type]: item.total_quantity,
      });
    }
    return acc;
  }, [] as any[]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h5">
                      {card.value}
                    </Typography>
                  </Box>
                  <Chip
                    icon={card.icon}
                    label=""
                    color={card.color as any}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Stock Movements Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Stock Movements
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="IN" fill="#8884d8" name="Stock In" />
                <Bar dataKey="OUT" fill="#82ca9d" name="Stock Out" />
                <Bar dataKey="ADJUSTMENT" fill="#ffc658" name="Adjustments" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <List dense>
              {dashboardData.recent_activities.slice(0, 10).map((activity, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {activity.action} {activity.table_name}
                        {activity.product_name && ` - ${activity.product_name}`}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary">
                        {activity.username} • {new Date(activity.created_at).toLocaleString()}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Most Active Products
            </Typography>
            <Grid container spacing={2}>
              {dashboardData.top_products.map((product, index) => (
                <Grid item xs={12} sm={6} md={2.4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" noWrap>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        SKU: {product.sku}
                      </Typography>
                      <Typography variant="body2">
                        Stock: {product.current_stock}
                      </Typography>
                      <Typography variant="body2">
                        Movements: {product.movement_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;