# Gym Management System - Client

This is the React frontend for the Gym Management System.

## Features

### Member Management
- Add, edit, and delete members
- Biometric enrollment for members
- Member attendance tracking
- Member payment management

### Class Management
- Create and manage fitness classes
- Assign instructors to classes
- Schedule management

### Financial Management
- Membership plan creation and management
- Invoice generation and tracking
- Payment processing
- Financial reporting

### Device Management
- ESP32 biometric device management
- Remote device configuration
- Device status monitoring

### Searchable Member Dropdowns

All member selection dropdowns throughout the application now include **index-based search functionality**. Users can search for members by:

- **Name** (primary search)
- **ID** (member ID)
- **Email** (when enabled)
- **Phone number**

#### Features:
- **Real-time filtering**: Results update as you type
- **Multiple search fields**: Search across name, ID, email, and phone
- **Admin indicators**: Star icons for admin members
- **Clear search**: Easy-to-use clear button
- **No results feedback**: Clear messaging when no matches found
- **Accessibility**: Keyboard navigation support

#### Components Updated:
- **BiometricEnrollment**: Member selection for fingerprint enrollment
- **AttendanceTracker**: Member selection for attendance viewing and simulation
- **ESP32DeviceManager**: Member selection for remote enrollment
- **Financials**: Member selection for invoice creation and editing

#### Usage:
```jsx
import SearchableMemberDropdown from './SearchableMemberDropdown';

<SearchableMemberDropdown
  value={selectedMemberId}
  onChange={handleMemberSelect}
  members={members}
  label="Select Member"
  placeholder="Search members by name, ID, or phone..."
  showId={true}
  showEmail={false}
  showAdminIcon={true}
  includeAllOption={false}
/>
```

#### Props:
- `value`: Selected member ID
- `onChange`: Change handler function
- `members`: Array of member objects
- `label`: Dropdown label text
- `placeholder`: Search input placeholder
- `showId`: Whether to display member IDs (default: true)
- `showEmail`: Whether to display email addresses (default: false)
- `showAdminIcon`: Whether to show star icons for admin members (default: true)
- `includeAllOption`: Whether to include an "All users" option (default: false)
- `allOptionLabel`: Text for the "all" option (default: "All users")
- `allOptionValue`: Value for the "all" option (default: "all")

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   Or with biometric integration:
   ```bash
   npm run start:with-biometric
   ```

The application will be available at `http://localhost:3000`.

## Available Scripts

- `npm start`: Start the development server
- `npm run start:with-biometric`: Start with biometric integration
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App

## Project Structure

```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── SearchableMemberDropdown.js    # Reusable searchable dropdown
│   │   ├── BiometricEnrollment.js        # Biometric enrollment interface
│   │   ├── AttendanceTracker.js          # Attendance tracking
│   │   ├── ESP32DeviceManager.js         # Device management
│   │   ├── Financials.js                 # Financial management
│   │   └── ...
│   ├── utils/
│   └── App.js
└── package.json
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Test thoroughly before submitting changes
