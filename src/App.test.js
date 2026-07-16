import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Stub the shared axios instance so AuthProvider's /api/auth/me check
// rejects immediately instead of jsdom attempting (and noisily failing) a
// real XHR against a nonexistent server.
jest.mock("./api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockRejectedValue(new Error("no server in tests")),
  },
  setUnauthorizedHandler: jest.fn(),
}));

// App requires the same provider tree index.js wraps it in (Router +
// AuthProvider — see src/index.js). AuthProvider's initial /api/auth/me
// check rejects (mocked above), which resolves to the logged-out state, so
// the smoke test lands on the Login screen.
test("renders the login screen when logged out", async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});
