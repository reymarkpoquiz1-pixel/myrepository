import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          User profile management page.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This page will include:
          <br />• Update personal information
          <br />• Change password
          <br />• User preferences
          <br />• Activity summary
        </Typography>
      </Paper>
    </Box>
  );
};

export default Profile;