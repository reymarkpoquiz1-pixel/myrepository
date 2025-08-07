import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Products: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Products
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Products management page - Add, edit, delete and view all inventory items.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This page will include:
          <br />• Product listing with search and filters
          <br />• Add/Edit product forms
          <br />• Stock level indicators
          <br />• Product categories management
        </Typography>
      </Paper>
    </Box>
  );
};

export default Products;