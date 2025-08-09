# Gym Management Software - Frontend Dashboard

React admin dashboard for managing members, classes, schedules, attendance, billing, and high‑level analytics.

## High‑level Features

- Analytics dashboard with summary cards and charts
- Member management (add/edit/list)
- Classes and schedules
- Attendance tracking with date‑range filtering
- Financials: membership plans, invoices, manual payments
- Branding via accent colors (solid/gradient) with a gradient editor

## Technology Stack

- React 19, React Router
- Material UI
- Axios

## Installation

```bash
cd client
npm install
npm start
```

Runs at `http://localhost:3000` and proxies API requests to the backend (`http://localhost:3001`).

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

Make sure the backend server is running on `http://localhost:3001` before starting the frontend.

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

This will start the React development server and open the dashboard in your browser at `http://localhost:3000`.

The application will automatically proxy API requests to the backend server running on port 3001 (configured via `client/package.json` `proxy`).

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
- **Attendance (/attendance):** Track member attendance. Session check-in rules are enforced (Morning 05:00–11:00, Evening 16:00–22:00) with max one check-in per calendar date. Filter by date range (default: current week).
- **Financials (/financials):** Manage membership plans and billing. Manual payment modal supports selecting a member to fetch unpaid invoices and autofilling invoice/amount.

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

## Styling & Branding

Accent colors (Primary and Secondary) are configurable in Settings as either Solid or Gradient. A built-in Gradient Editor supports Linear/Radial modes, angle, and draggable color stops. The app exposes CSS variables for accents:

- `--accent-primary-color`
- `--accent-secondary-color`
- `--accent-primary-bg`
- `--accent-secondary-bg`

These are used across buttons (contained/outlined), headings (h4/h5 gradient text), section dividers, and invoice headings.

## API Integration

The frontend communicates with the backend through REST API calls using Axios. All API requests are automatically proxied to `http://localhost:3001` during development.

Key endpoints integrated in the UI:
- `GET /api/reports/summary` (includes `unpaidMembersThisMonth` for dashboard card)
- `GET /api/reports/unpaid-members-this-month` (Members filter)
- `GET /api/payments/unpaid?member_id=<id>` (Financials modal unpaid invoices)
- `POST /api/payments/manual` (Record manual payment)

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