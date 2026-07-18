import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BiometricEnrollment from './BiometricEnrollment';
import { apiFetch } from '../api/client';

// Only apiFetch is mocked — real MUI components render, since only the
// active tab's subtree mounts (see the "Events" tab test below).
jest.mock('../api/client', () => ({
  apiFetch: jest.fn(),
}));

const emptyListResponse = {
  success: true,
  data: [],
  pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
};

// Regression coverage for getEventStatusBadge (BiometricEnrollment.js):
// enrollment_progress rows store success=false (see the comment above
// getEventStatusBadge) because the `success` column is NOT NULL and progress
// isn't a terminal outcome. The badge must special-case event_type to avoid
// rendering an in-progress scan as a red "Error".
function mockApiFetch(url) {
  if (url.includes('/api/biometric/events')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: 1,
              event_type: 'enrollment_progress',
              success: false,
              timestamp: '2024-01-01T00:00:00.000Z',
              raw_data: JSON.stringify({ enrollmentStep: 'scanning_first_finger' }),
            },
            {
              id: 2,
              event_type: 'button_override',
              success: false,
              timestamp: '2024-01-01T00:01:00.000Z',
            },
          ],
          pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
        }),
    });
  }
  if (url.includes('/api/biometric/enrollment/status')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { active: false } }),
    });
  }
  if (url.includes('/api/biometric/status')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { biometricServiceAvailable: true, enrollmentActive: false, connectedDevices: 0 },
        }),
    });
  }
  if (url.includes('/api/biometric/devices')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, devices: [] }),
    });
  }
  // members/without-biometric and members/with-biometric
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(emptyListResponse),
  });
}

describe('BiometricEnrollment - Events tab status badges', () => {
  beforeEach(() => {
    // The component opens a WebSocket on mount for real-time updates.
    global.WebSocket = class {
      static OPEN = 1;
      close() {}
    };
    apiFetch.mockImplementation(mockApiFetch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows "In Progress" (not "Error") for an enrollment_progress event', async () => {
    render(<BiometricEnrollment />);

    fireEvent.click(screen.getByText('Events'));

    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
    // The terminal-failure event still renders as "Error".
    expect(screen.getByText('Error')).toBeInTheDocument();
    // No event in this fixture should render as "Success".
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });
});
