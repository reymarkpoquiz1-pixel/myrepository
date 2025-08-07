import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Dynamic reporting system with various inventory analytics and reports.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This page will include:
          <br />• Inventory valuation reports
          <br />• Stock movement reports
          <br />• ABC analysis
          <br />• Low stock alerts
          <br />• Custom report builder
          <br />• Export functionality (PDF, Excel)
        </Typography>
      </Paper>
    </Box>
  );
};

export default Reports;