import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Member from './components/Member';
import ClassManager from './components/ClassManager';
import ScheduleManager from './components/ScheduleManager';
import AttendanceTracker from './components/AttendanceTracker';
import Financials from './components/Financials';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Gym Management Dashboard</h1>
          <nav>
            <ul>
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/members">Members</Link></li>
              <li><Link to="/classes">Classes</Link></li>
              <li><Link to="/schedules">Schedules</Link></li>
              <li><Link to="/attendance">Attendance</Link></li>
              <li><Link to="/financials">Financials</Link></li>
            </ul>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<Member />} />
            <Route path="/classes" element={<ClassManager />} />
            <Route path="/schedules" element={<ScheduleManager />} />
            <Route path="/attendance" element={<AttendanceTracker />} />
            <Route path="/financials" element={<Financials />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;