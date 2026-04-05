# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 frontend for GMGMT gym management system. Communicates with an Express backend at `localhost:3001` via a dev proxy.

## Commands

```bash
npm start           # Dev server on http://localhost:3000
npm run build       # Production build → /build
npm test            # Run Jest tests
npm test -- --watchAll=false   # Run tests once (CI mode)
npm test -- --testPathPattern=SearchableMemberDropdown  # Single test file
```

No separate lint script — ESLint runs automatically through `react-scripts` (config in `package.json` under `eslintConfig`).

## Architecture

### API Calls
All API calls use relative paths (`/api/*`) via axios with no custom instance or interceptors. The `package.json` proxy forwards these to `http://localhost:3001` during development. Error handling is inline try/catch per component — no global error boundary.

### State Management
No Redux or Context API. Each component manages its own state with `useState`/`useEffect`. The one cross-component communication pattern is a **localStorage event bus**: `Settings.js` writes `localStorage.setItem('settingsUpdated', timestamp)` and `Dashboard.js` watches for it to refresh card preferences.

### Theming
`App.js` exports a `buildTheme(primary, secondary)` function that constructs a MUI theme. On mount, `App.js` fetches `/api/settings` and rebuilds the theme dynamically — supports solid colors and gradient modes. Stored in local state and passed to `<ThemeProvider>`.

### Routing
8 top-level routes defined in `App.js`. The left drawer provides navigation. Settings and Classes use nested `/*` routes handled internally.

| Route | Component |
|---|---|
| `/` | Dashboard |
| `/members` | Member |
| `/classes/*` | ClassManager |
| `/attendance` | AttendanceTracker |
| `/biometric` | BiometricEnrollment |
| `/financials` | Financials |
| `/invoices/:id` | InvoiceView |
| `/settings/*` | Settings |

### Components
All components are in `src/components/`. Most are large monolithic files — avoid splitting them unless asked. Key reusable components:
- **`SearchableMemberDropdown.js`** — used in Biometric, Attendance, ESP32DeviceManager, Financials; searches by name/ID/email/phone
- **`ShimmerLoader.js`** — pre-built shimmer layouts (`TableShimmer`, `FormShimmer`, `DashboardShimmer`, etc.)
- **`GradientEditor.js`** — used in Settings for theme gradient customization

### Utilities (`src/utils/formatting.js`)
- `formatCurrency(amount, currency)` — locale-aware, supports INR/USD/EUR/GBP
- `formatDate(dateString)` — handles YYYY-MM and YYYY-MM-DD formats
- `getCurrentDateString()` / `formatDateToLocalString(date)` — always returns local timezone date (not UTC) to avoid off-by-one date bugs

### Notable Patterns
- **Virtual scrolling** (`react-window`) used in `BiometricEnrollment.js` for long member lists
- **Drag-and-drop** (`@dnd-kit`) in Dashboard for card reordering
- **PDF generation** (`jspdf` + `html2canvas`) in `InvoiceView.js`
- **Image cropping** (`react-image-crop`) in `Member.js` for profile photos
- WebSocket connection opened in `BiometricEnrollment.js` for real-time enrollment progress
