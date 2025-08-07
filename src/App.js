import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import axios from 'axios';
import Member from './components/Member';
import ClassManager from './components/ClassManager';
import ScheduleManager from './components/ScheduleManager';
import AttendanceTracker from './components/AttendanceTracker';
import Financials from './components/Financials';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gymName, setGymName] = useState('');
  const [gymLogo, setGymLogo] = useState('');

  useEffect(() => {
    fetchGymSettings();
  }, []);

  const fetchGymSettings = async () => {
    try {
      const nameRes = await axios.get('/api/settings/gym_name');
      const logoRes = await axios.get('/api/settings/gym_logo');
      setGymName(nameRes.data.value);
      setGymLogo(logoRes.data.value);
    } catch (error) {
      console.error("Error fetching gym settings", error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/members">
          <ListItemText primary="Members" />
        </ListItem>
        <ListItem button component={Link} to="/classes">
          <ListItemText primary="Classes" />
        </ListItem>
        <ListItem button component={Link} to="/schedules">
          <ListItemText primary="Schedules" />
        </ListItem>
        <ListItem button component={Link} to="/attendance">
          <ListItemText primary="Attendance" />
        </ListItem>
        <ListItem button component={Link} to="/financials">
          <ListItemText primary="Financials" />
        </ListItem>
        <ListItem button component={Link} to="/settings">
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
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
              {drawer}
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
              open
            >
              {drawer}
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
