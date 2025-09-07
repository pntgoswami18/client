import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';

import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import { Settings as SettingsIcon } from '@mui/icons-material';


import axios from 'axios';
import Member from './components/Member';
import ClassManager from './components/ClassManager';
import AttendanceTracker from './components/AttendanceTracker';
import Financials from './components/Financials';
import InvoiceView from './components/InvoiceView';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import BiometricEnrollment from './components/BiometricEnrollment';

const buildTheme = (primary = '#3f51b5', secondary = '#f50057') =>
  createTheme({
    palette: {
      primary: { main: primary },
      secondary: { main: secondary },
      background: { default: '#f7f8fa' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: "-apple-system, 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h4: {
        fontWeight: 700,
        background: 'var(--accent-secondary-bg)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      h5: {
        fontWeight: 700,
        background: 'var(--accent-secondary-bg)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },
    components: {
      MuiButton: {
        defaultProps: { variant: 'contained' },
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiTableRow: { styleOverrides: { root: { transition: 'background 0.2s' } } },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  });

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [gymName, setGymName] = useState('');
  const [gymLogo, setGymLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3f51b5');
  const [secondaryColor, setSecondaryColor] = useState('#f50057');
  const [primaryMode, setPrimaryMode] = useState('solid');
  const [primaryGradient, setPrimaryGradient] = useState('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    fetchGymSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGymSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setGymName(response.data.gym_name);
      setGymLogo(response.data.gym_logo);
      if (response.data.primary_color) { setPrimaryColor(response.data.primary_color); }
      if (response.data.secondary_color) { setSecondaryColor(response.data.secondary_color); }
      if (response.data.primary_mode) { setPrimaryMode(response.data.primary_mode); }
      if (response.data.primary_gradient) { setPrimaryGradient(response.data.primary_gradient); }
    } catch (error) {
      console.error('Error fetching gym settings:', error);
    }
  };

  const LocationAwareDrawerContent = () => {
    const navigationItems = [
      { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
      { label: 'Members', to: '/members', icon: <PeopleIcon /> },
      { label: 'Classes', to: '/classes', icon: <ClassIcon /> },
      { label: 'Attendance', to: '/attendance', icon: <CheckCircleIcon /> },
      { label: 'Biometric', to: '/biometric', icon: <FingerprintIcon /> },
      { label: 'Financials', to: '/financials', icon: <PaidIcon /> },
      { label: 'Settings', to: '/settings', icon: <SettingsIcon /> },
    ];

    return (
      <div>
        <Toolbar />
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </div>
    );
  };

  return (
    <ThemeProvider theme={buildTheme(primaryColor, secondaryColor)}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              {gymLogo && <img src={gymLogo} alt="logo" style={{height: '40px', marginRight: '15px'}}/>}
              <Typography variant="h6" noWrap component="div" sx={{
                background: primaryMode === 'gradient' ? (primaryGradient || `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`) : 'none',
                WebkitBackgroundClip: primaryMode === 'gradient' ? 'text' : 'initial',
                WebkitTextFillColor: primaryMode === 'gradient' ? 'transparent' : 'inherit'
              }}>
                {gymName || 'Gym Management'}
              </Typography>

            </Toolbar>
          </AppBar>
          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="mailbox folders"
          >
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
            >
              <LocationAwareDrawerContent />
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
              open
            >
              <LocationAwareDrawerContent />
            </Drawer>
          </Box>
          <Box
            component="main"
            sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
          >
            <Toolbar />
            <Box sx={{ pb: 6, width: '100%' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<Member />} />
                <Route path="/classes/*" element={<ClassManager />} />
                <Route path="/attendance" element={<AttendanceTracker />} />
                <Route path="/biometric" element={<BiometricEnrollment />} />
                <Route path="/financials" element={<Financials />} />
                <Route path="/invoices/:id" element={<InvoiceView />} />
                <Route path="/settings/*" element={<Settings />} />
              </Routes>
            </Box>
          </Box>
        </Box>
    </ThemeProvider>
  );
}

export default App;