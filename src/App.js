import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, Divider, Container } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import { Settings as SettingsIcon } from '@mui/icons-material';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import MonitorIcon from '@mui/icons-material/Monitor';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SecurityIcon from '@mui/icons-material/Security';
import axios from 'axios';
import Member from './components/Member';
import ClassManager from './components/ClassManager';
import ScheduleManager from './components/ScheduleManager';
import AttendanceTracker from './components/AttendanceTracker';
import Financials from './components/Financials';
import InvoiceView from './components/InvoiceView';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import BiometricEnrollment from './components/BiometricEnrollment';
import ESP32DeviceManager from './components/ESP32DeviceManager';
import ESP32Monitor from './components/ESP32Monitor';
import ESP32BiometricEnrollment from './components/ESP32BiometricEnrollment';
import ESP32Analytics from './components/ESP32Analytics';

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
            textTransform: 'none',
          },
          contained: {
            background: 'var(--accent-secondary-bg)',
            color: '#fff',
            '&:hover': { filter: 'brightness(0.95)' },
          },
          outlined: {
            borderColor: 'var(--accent-secondary-color)',
            color: 'var(--accent-secondary-color)',
            '&:hover': { borderColor: 'var(--accent-secondary-color)', background: 'rgba(0,0,0,0.02)' },
          },
        },
      },
      MuiTable: { defaultProps: { size: 'small' } },
      MuiTableRow: { styleOverrides: { root: { transition: 'background 0.2s' } } },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  });

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gymName, setGymName] = useState('');
  const [gymLogo, setGymLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3f51b5');
  const [secondaryColor, setSecondaryColor] = useState('#f50057');
  const [primaryMode, setPrimaryMode] = useState('solid');
  const [primaryGradient, setPrimaryGradient] = useState('');

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
      if (response.data.primary_color_mode) { setPrimaryMode(response.data.primary_color_mode); }
      if (response.data.primary_color_gradient) { setPrimaryGradient(response.data.primary_color_gradient); }
      // expose CSS variables for easy usage in components with sensible fallbacks
      const root = document.documentElement;
      const resolvedPrimaryBG = (response.data.primary_color_mode === 'gradient'
        ? (response.data.primary_color_gradient || `linear-gradient(90deg, ${response.data.primary_color || primaryColor}, ${response.data.secondary_color || secondaryColor})`)
        : (response.data.primary_color || primaryColor));
      const resolvedSecondaryBG = (response.data.secondary_color_mode === 'gradient'
        ? (response.data.secondary_color_gradient || `linear-gradient(90deg, ${response.data.secondary_color || secondaryColor}, ${response.data.primary_color || primaryColor})`)
        : (response.data.secondary_color || secondaryColor));
      root.style.setProperty('--accent-primary-color', response.data.primary_color || primaryColor);
      root.style.setProperty('--accent-secondary-color', response.data.secondary_color || secondaryColor);
      root.style.setProperty('--accent-primary-bg', resolvedPrimaryBG);
      root.style.setProperty('--accent-secondary-bg', resolvedSecondaryBG);
    } catch (error) {
      console.error("Error fetching gym settings", error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const LocationAwareDrawerContent = () => {
    const location = useLocation();
    const navigationItems = [
      { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
      { label: 'Members', to: '/members', icon: <PeopleIcon /> },
      { label: 'Classes', to: '/classes', icon: <ClassIcon /> },
      { label: 'Schedules', to: '/schedules', icon: <ScheduleIcon /> },
      { label: 'Attendance', to: '/attendance', icon: <CheckCircleIcon /> },
      { label: 'Biometric', to: '/biometric', icon: <FingerprintIcon /> },
      { label: 'ESP32 Devices', to: '/esp32-devices', icon: <DeviceHubIcon /> },
      { label: 'Device Monitor', to: '/esp32-monitor', icon: <MonitorIcon /> },
      { label: 'ESP32 Enrollment', to: '/esp32-enrollment', icon: <SecurityIcon /> },
      { label: 'Device Analytics', to: '/esp32-analytics', icon: <AnalyticsIcon /> },
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
      <Router>
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
            <Container maxWidth="lg" sx={{ pb: 6 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<Member />} />
                <Route path="/classes" element={<ClassManager />} />
                <Route path="/schedules" element={<ScheduleManager />} />
                <Route path="/attendance" element={<AttendanceTracker />} />
                <Route path="/biometric" element={<BiometricEnrollment />} />
                <Route path="/esp32-devices" element={<ESP32DeviceManager />} />
                <Route path="/esp32-monitor" element={<ESP32Monitor />} />
                <Route path="/esp32-enrollment" element={<ESP32BiometricEnrollment />} />
                <Route path="/esp32-analytics" element={<ESP32Analytics />} />
                <Route path="/financials" element={<Financials />} />
                <Route path="/invoices/:id" element={<InvoiceView />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
