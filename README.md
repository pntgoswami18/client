# Gym Management Software - Frontend Dashboard

This is the React frontend for the Gym Management Software, providing a comprehensive admin dashboard for gym owners and staff to manage their operations.

## Features

The frontend dashboard includes:

- **Analytics Dashboard:** Real-time reporting with summary statistics, member growth trends, revenue analytics, and popular class rankings
- **Member Management:** Add, view, edit, and delete gym members with automated welcome emails
- **Consolidated Biometric Management:** Unified ESP32 fingerprint enrollment with guided process, device selection, real-time enrollment monitoring, and manual member-device linking
- **Class & Schedule Management:** Create and manage fitness classes with integrated schedule management (schedules accessible as a tab under Classes)
- **Attendance Tracking:** View member attendance history and simulate biometric check-ins
- **Financial Management:** Create membership plans, invoices, and record manual payments
- **Advanced Settings Management:** Centralized settings with tabbed interface including General settings and comprehensive ESP32 device management
- **ESP32 Configuration:** User-configurable ESP32 connection settings with helpful defaults

## Technology Stack

- **React.js** with functional components and hooks
- **React Router** for multi-page navigation
- **Axios** for API communication with the backend
- **Material UI** for professional styling and components
- **Responsive design** with professional styling

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
- **Biometric (/biometric):** Consolidated ESP32 fingerprint enrollment with guided process, device selection, and member-device linking
- **Classes (/classes):** Manage fitness classes with integrated schedule management (schedules accessible as a tab under Classes)
- **Attendance (/attendance):** Track member attendance. Session check-in rules are enforced (Morning 05:00–11:00, Evening 16:00–22:00) with max one check-in per calendar date. Filter by date range (default: current week).
- **Financials (/financials):** Manage membership plans and billing. Manual payment modal supports selecting a member to fetch unpaid invoices and autofilling invoice/amount.
- **Settings (/settings):** General settings and ESP32 device management (ESP32 Devices, Monitor, Analytics accessible as tabs under Settings)

## Component Structure

```
src/
├── components/
│   ├── Dashboard.js               # Analytics dashboard with reporting
│   ├── Member.js                  # Member management interface
│   ├── BiometricEnrollment.js     # Consolidated biometric management
│   ├── ClassManager.js            # Class management with integrated schedules
│   ├── ScheduleManager.js         # Schedule management (nested under Classes)
│   ├── AttendanceTracker.js       # Attendance tracking interface
│   ├── Financials.js              # Financial management interface
│   ├── Settings.js                # Settings with ESP32 device management tabs
│   ├── ESP32DeviceManager.js      # ESP32 device management (nested under Settings)
│   ├── ESP32Monitor.js            # ESP32 monitoring (nested under Settings)
│   ├── ESP32Analytics.js          # ESP32 analytics (nested under Settings)
│   └── Pages.js                   # Placeholder components
├── App.js                         # Main app with routing
├── App.css                        # Application styling
└── index.js                       # App entry point
```

## Component Details

### Dashboard Component

The main dashboard provides:
- **Summary Statistics**: Total members, revenue, new members this month, active schedules, unpaid members this month
- **Member Growth Chart**: 12-month trend visualization
- **Revenue Analytics**: Monthly revenue trends over the past year
- **Popular Classes**: Rankings by total bookings
- **Attendance Trends**: Daily check-in statistics for the last 30 days
- **Clickable Cards**: Navigate to filtered views (e.g., unpaid members, pending payments)

### Member Management

Features include:
- **CRUD Operations**: Create, read, update, and delete gym members
- **Biometric Linking**: Connect members to ESP32 devices via `device_user_id`
- **Search & Filter**: Find members by name, phone, or email
- **Validation**: Required fields and unique phone number constraints
- **Real-time Updates**: Immediate UI updates after operations

### Biometric Enrollment

Comprehensive ESP32 fingerprint management:
- **Guided Enrollment**: Step-by-step enrollment process
- **Device Selection**: Choose from available ESP32 devices
- **Real-time Monitoring**: WebSocket-based status updates
- **Manual Linking**: Associate members with device user IDs
- **Status Tracking**: Monitor enrollment progress and completion

### Class & Schedule Management

Integrated class and schedule system:
- **Class Creation**: Define classes with instructors and duration
- **Schedule Management**: Create recurring or one-time schedules
- **Capacity Control**: Set maximum participants per class
- **Tabbed Interface**: Schedules accessible as a tab under Classes
- **Conflict Prevention**: Avoid overlapping schedules

### Attendance Tracking

Advanced attendance management:
- **Session Enforcement**: Morning (05:00–11:00) and Evening (16:00–22:00) sessions
- **Daily Limits**: Maximum one check-in per calendar date
- **Date Range Filtering**: Default to current week with full-day coverage
- **Biometric Integration**: Support for ESP32 device check-ins
- **Manual Override**: Simulate check-ins for testing

### Financial Management

Comprehensive billing system:
- **Membership Plans**: Create and manage pricing tiers
- **Invoice Generation**: Automatic invoice creation
- **Manual Payments**: Record cash, bank, or UPI payments
- **Payment History**: Track all financial transactions
- **Unpaid Invoices**: View and manage outstanding balances

### Settings Management

Centralized configuration:
- **General Settings**: Gym information and branding
- **ESP32 Device Management**: Device configuration and monitoring
- **Accent Colors**: Configure primary and secondary theme colors
- **Dashboard Cards**: Toggle visibility of summary cards
- **Network Configuration**: ESP32 connection settings

## Styling & Branding

### Accent Color System

Accent colors (Primary and Secondary) are configurable in Settings as either Solid or Gradient:

- **Solid Mode**: Single color for consistent branding
- **Gradient Mode**: Linear or radial gradients with customizable:
  - **Mode**: Linear or Radial
  - **Angle**: Gradient direction (Linear mode)
  - **Color Stops**: Draggable color points with opacity control

### CSS Variables

The app exposes CSS variables for custom styling:

```css
:root {
  --accent-primary-color: #1976d2;
  --accent-secondary-color: #dc004e;
  --accent-primary-bg: rgba(25, 118, 210, 0.1);
  --accent-secondary-bg: rgba(220, 0, 78, 0.1);
}
```

### Applied Elements

Accent colors are used across:
- **Buttons**: Contained and outlined button variants
- **Headings**: h4 and h5 elements with gradient text support
- **Section Headers**: Border styling and background colors
- **Invoice Headers**: Label styling and emphasis

## API Integration

The frontend communicates with the backend through REST API calls using Axios. All API requests are automatically proxied to `http://localhost:3001` during development.

### Key Endpoints

- **`GET /api/reports/summary`** - Dashboard summary statistics (includes `unpaidMembersThisMonth`)
- **`GET /api/reports/unpaid-members-this-month`** - Members filter for unpaid members
- **`GET /api/payments/unpaid?member_id=<id>`** - Financials modal unpaid invoices
- **`POST /api/payments/manual`** - Record manual payment
- **`PUT /api/members/:id/biometric`** - Link member to ESP32 device

### WebSocket Integration

Real-time updates via WebSocket connection:
- **Connection**: `ws://localhost:3001/ws`
- **Events**: Enrollment status, device updates, real-time notifications
- **Fallback**: Polling remains as backup for reliability
- **Status Indicator**: Visual connection status in UI

## State Management

The application uses React hooks for state management:

- **Local State**: Component-specific state with `useState`
- **Effect Management**: Side effects with `useEffect`
- **Context**: Shared state where appropriate
- **API State**: Loading, error, and success states for API calls

## Responsive Design

The dashboard is designed to work across all device sizes:

- **Desktop**: Full-featured interface with side navigation
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Responsive design with touch-friendly controls
- **Breakpoints**: Material UI responsive breakpoints

## Error Handling

Comprehensive error handling throughout the application:

- **API Errors**: Network and server error handling
- **Validation Errors**: Form validation with user-friendly messages
- **Loading States**: Visual feedback during operations
- **Fallback UI**: Graceful degradation for failed operations

## Performance Optimization

Built-in performance features:

- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Bundle Optimization**: Production build optimization

## Deployment

For production deployment:

1. **Build the application**: `npm run build`
2. **Production files**: The `build` folder contains optimized production files
3. **Deploy**: Upload contents to your web server
4. **API Configuration**: Ensure production backend API is accessible
5. **Environment Variables**: Update API endpoints for production

### Build Configuration

The build process:
- **Minification**: JavaScript and CSS minification
- **Tree Shaking**: Remove unused code
- **Asset Optimization**: Image and font optimization
- **Source Maps**: Optional source maps for debugging

## Development Notes

### Architecture Patterns

- **Functional Components**: All components use functional syntax with hooks
- **Custom Hooks**: Reusable logic extraction
- **Component Composition**: Modular component design
- **Prop Drilling**: Minimized through proper component structure

### Code Quality

- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting consistency
- **TypeScript Ready**: Structure supports future TypeScript migration
- **Testing**: Jest and React Testing Library setup

### Development Workflow

1. **Component Development**: Create components in `src/components/`
2. **Routing**: Add routes in `App.js`
3. **API Integration**: Use Axios for backend communication
4. **Styling**: Apply Material UI components and custom CSS
5. **Testing**: Write tests for component functionality

### Common Patterns

- **Async Operations**: Use async/await with proper error handling
- **Form Management**: Controlled components with validation
- **Data Fetching**: useEffect for API calls on component mount
- **State Updates**: Immutable state updates with spread operator

## Troubleshooting

### Common Issues

#### WebSocket Connection Problems
- **Check Backend**: Ensure backend WebSocket server is running
- **Network Issues**: Verify firewall and network configuration
- **Fallback**: System automatically falls back to polling

#### API Request Failures
- **Proxy Configuration**: Verify proxy setting in `package.json`
- **Backend Status**: Check if backend server is running
- **CORS Issues**: Backend CORS configuration for production

#### Build Issues
- **Dependencies**: Ensure all dependencies are installed
- **Node Version**: Use Node.js 16+ for compatibility
- **Memory Issues**: Increase Node.js memory limit if needed

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

## Future Enhancements

Planned improvements for the frontend:

1. **TypeScript Migration**: Full TypeScript support for better type safety
2. **Advanced Charts**: Enhanced data visualization with D3.js
3. **Offline Support**: Service worker for offline functionality
4. **Mobile App**: React Native mobile application
5. **Real-time Notifications**: Push notifications for important events
6. **Advanced Filtering**: Complex search and filter capabilities
7. **Bulk Operations**: Multi-select and bulk actions
8. **Export Functionality**: Data export to CSV/PDF formats

## Support

For technical support or feature requests:

- **Documentation**: Refer to this README and main project documentation
- **Issues**: Report bugs through the project issue tracker
- **Development**: Contact the development team for questions

## Additional Resources

### Related Documentation

- **📖 [Main README.md](../README.md)** - Project overview and installation
- **📖 [Backend Documentation](../src/README.md)** - API details and ESP32 integration

### External Resources

- **React Documentation**: [reactjs.org](https://reactjs.org/)
- **Material UI**: [mui.com](https://mui.com/)
- **React Router**: [reactrouter.com](https://reactrouter.com/)

### Development Tools

- **React Developer Tools**: Browser extension for debugging
- **Redux DevTools**: State management debugging (if using Redux)
- **Network Tab**: Monitor API requests and responses
- **Console Logging**: Built-in debugging and error logging
