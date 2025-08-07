# Gym Management Software - Frontend Dashboard

This is the React frontend for the Gym Management Software, providing a comprehensive admin dashboard for gym owners and staff to manage their operations.

## Features

The frontend dashboard includes:

- **Analytics Dashboard:** Real-time reporting with summary statistics, member growth trends, revenue analytics, and popular class rankings
- **Member Management:** Add, view, edit, and delete gym members with automated welcome emails
- **Class Management:** Create and manage fitness classes with instructor and duration details
- **Schedule Management:** Schedule classes with datetime pickers and capacity management
- **Attendance Tracking:** View member attendance history and simulate biometric check-ins
- **Financial Management:** Create membership plans and view Stripe payment integration

## Technology Stack

- **React.js** with functional components and hooks
- **React Router** for multi-page navigation
- **Axios** for API communication with the backend
- **Professional styling** with responsive design

## Getting Started

### Prerequisites

Make sure the backend server is running on `http://localhost:3000` before starting the frontend.

### Installation

```bash
# From the client directory
npm install
```

### Development

```bash
# Start the development server
npm start
```

This will start the React development server and open the dashboard in your browser at `http://localhost:3001`.

The application will automatically proxy API requests to the backend server running on port 3000.

### Available Scripts

#### `npm start`

Runs the app in development mode. The page will reload when you make changes and display any lint errors in the console.

#### `npm test`

Launches the test runner in interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder. The build is minified and optimized for best performance.

## Dashboard Navigation

Once running, you can navigate between different sections:

- **Dashboard (/):** Analytics and reporting overview
- **Members (/members):** Manage gym members
- **Classes (/classes):** Manage fitness classes
- **Schedules (/schedules):** Schedule classes and manage capacity
- **Attendance (/attendance):** Track member attendance
- **Financials (/financials):** Manage membership plans

## Component Structure

```
src/
├── components/
│   ├── Dashboard.js          # Analytics dashboard with reporting
│   ├── Member.js             # Member management interface
│   ├── ClassManager.js       # Class management interface
│   ├── ScheduleManager.js    # Schedule management interface
│   ├── AttendanceTracker.js  # Attendance tracking interface
│   ├── Financials.js         # Financial management interface
│   └── Pages.js              # Placeholder components
├── App.js                    # Main app with routing
├── App.css                   # Application styling
└── index.js                  # App entry point
```

## API Integration

The frontend communicates with the backend through REST API calls using Axios. All API requests are automatically proxied to `http://localhost:3000` during development.

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. The `build` folder contains the optimized production files
3. Deploy the contents to your web server
4. Ensure your production backend API is accessible

## Development Notes

- The application uses React Router for client-side routing
- All components are functional components using React hooks
- API calls are made using async/await pattern with proper error handling
- The proxy configuration in package.json handles CORS during development

For more information about the backend API and overall system architecture, see the main README.md in the project root.