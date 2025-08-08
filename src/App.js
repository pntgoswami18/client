import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaidIcon from '@mui/icons-material/Paid';
import { Settings as SettingsIcon } from '@mui/icons-material';
import axios from 'axios';
import Member from './components/Member';
import ClassManager from './components/ClassManager';
import ScheduleManager from './components/ScheduleManager';
import AttendanceTracker from './components/AttendanceTracker';
import Financials from './components/Financials';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

const buildTheme = (primary = '#3f51b5', secondary = '#f50057') =>
  createTheme({
    palette: {
      primary: { main: primary },
      secondary: { main: secondary },
    },
  });

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gymName, setGymName] = useState('');
  const [gymLogo, setGymLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3f51b5');
  const [secondaryColor, setSecondaryColor] = useState('#f50057');

  useEffect(() => {
    fetchGymSettings();
  }, []);

  const fetchGymSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setGymName(response.data.gym_name);
      setGymLogo(response.data.gym_logo);
      if (response.data.primary_color) setPrimaryColor(response.data.primary_color);
      if (response.data.secondary_color) setSecondaryColor(response.data.secondary_color);
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
      { label: 'Attendance', to: '/attendance', icon: <AccessTimeIcon /> },
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
              <Typography variant="h6" noWrap component="div">
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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<Member />} />
              <Route path="/classes" element={<ClassManager />} />
              <Route path="/schedules" element={<ScheduleManager />} />
              <Route path="/attendance" element={<AttendanceTracker />} />
              <Route path="/financials" element={<Financials />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
