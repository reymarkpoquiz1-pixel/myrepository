import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Create,
  Person
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  const [editMode, setEditMode] = useState(false);
  const [openSignatureDialog, setOpenSignatureDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  
  const signatureRef = useRef<SignatureCanvas>(null);

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data: { firstName?: string; lastName?: string; signature?: string }) => {
      const response = await axios.put('/auth/profile', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        updateUser(data.data.user);
        queryClient.invalidateQueries('me');
        setEditMode(false);
        enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to update profile',
          { variant: 'error' }
        );
      }
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    async (data: { currentPassword: string; newPassword: string }) => {
      const response = await axios.put('/auth/change-password', data);
      return response.data;
    },
    {
      onSuccess: () => {
        setOpenPasswordDialog(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        enqueueSnackbar('Password changed successfully', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to change password',
          { variant: 'error' }
        );
      }
    }
  );

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleCancelEdit = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    });
    setEditMode(false);
  };

  const handleSaveSignature = () => {
    if (!signatureRef.current?.isEmpty()) {
      const signatureData = signatureRef.current?.toDataURL();
      if (signatureData) {
        updateProfileMutation.mutate({ signature: signatureData });
        setOpenSignatureDialog(false);
      }
    } else {
      enqueueSnackbar('Please provide a signature', { variant: 'warning' });
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      enqueueSnackbar('New passwords do not match', { variant: 'error' });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters', { variant: 'error' });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Profile Settings
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Manage your profile information and settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Profile Information
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isLoading}
                    >
                      {updateProfileMutation.isLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={editMode ? profileForm.firstName : user.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={editMode ? profileForm.lastName : user.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user.email}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={user.role === 'admin' ? 'Administrator' : 'Councilor'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Status"
                    value={user.isActive ? 'Active' : 'Inactive'}
                    disabled
                  />
                </Grid>
              </Grid>

              <Box mt={3}>
                <Button
                  variant="outlined"
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: '2rem',
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 2
                }}
              >
                {user.firstName.charAt(0)}
              </Avatar>
              
              <Typography variant="h6" gutterBottom>
                {user.fullName}
              </Typography>
              
              <Chip
                label={user.role === 'admin' ? 'Administrator' : 'Councilor'}
                color={user.role === 'admin' ? 'secondary' : 'primary'}
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </Typography>

              {user.lastLogin && (
                <Typography variant="body2" color="textSecondary">
                  Last login: {new Date(user.lastLogin).toLocaleDateString()}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Signature */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Digital Signature
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Create />}
                  onClick={() => setOpenSignatureDialog(true)}
                >
                  {user.signature ? 'Update' : 'Create'}
                </Button>
              </Box>
              
              {user.signature ? (
                <Box
                  component="img"
                  src={user.signature}
                  alt="Digital Signature"
                  sx={{
                    width: '100%',
                    maxHeight: 100,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    p: 2,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Person sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body2">
                    No signature created yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                helperText="Minimum 6 characters"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
                helperText={
                  passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''
                    ? 'Passwords do not match'
                    : ''
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              changePasswordMutation.isLoading ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword
            }
          >
            {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog
        open={openSignatureDialog}
        onClose={() => setOpenSignatureDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Digital Signature</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Draw your signature in the box below:
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
              This signature will be used for document signing
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSignatureDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSignature}
            variant="contained"
            disabled={updateProfileMutation.isLoading}
          >
            {updateProfileMutation.isLoading ? 'Saving...' : 'Save Signature'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;