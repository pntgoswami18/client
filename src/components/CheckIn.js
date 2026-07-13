import React, { useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FaceRetouchingNaturalRoundedIcon from '@mui/icons-material/FaceRetouchingNaturalRounded';
import useFaceCheckin from '../hooks/useFaceCheckin';
import { saveStationConfig, loadStationConfig } from '../utils/faceStation';
import { DEFAULT_LIVENESS_CONFIG } from '../utils/faceLiveness';

/**
 * Fullscreen, distraction-free check-in kiosk (plan Section 3.2). Rendered
 * outside the admin chrome and the staff-login gate — it runs unattended and
 * authenticates to the backend with the station device secret. Every state
 * except a live "welcome" keeps the door locked; the client never unlocks.
 */
export default function CheckIn() {
  const kiosk = useFaceCheckin();
  const { phase } = kiosk;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: '#0b1020',
        color: '#fff',
        overflow: 'hidden',
        // The admin theme forces a dark accent color on h4/h5 headings, which is
        // near-invisible on this dark kiosk background — make headings inherit
        // the kiosk's own light color instead.
        '& .MuiTypography-h2, & .MuiTypography-h3, & .MuiTypography-h4, & .MuiTypography-h5': {
          color: 'inherit',
        },
      }}
    >
      {/* Camera layer — always mounted so the stream can attach during bootstrap. */}
      <video
        ref={kiosk.videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // mirror so it reads like a mirror
          opacity: CAMERA_PHASES.has(phase) ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      />
      {/* Overlay layer */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
          background: CAMERA_PHASES.has(phase)
            ? 'linear-gradient(180deg, rgba(11,16,32,0.55) 0%, rgba(11,16,32,0.15) 40%, rgba(11,16,32,0.75) 100%)'
            : '#0b1020',
        }}
      >
        <PhaseContent kiosk={kiosk} />
      </Box>

      <DebugOverlay debug={kiosk.debug} phase={phase} />
    </Box>
  );
}

const CAMERA_PHASES = new Set(['idle', 'liveness', 'verifying', 'welcome', 'denied']);

function PhaseContent({ kiosk }) {
  switch (kiosk.phase) {
    case 'loading':
      return (
        <Centered>
          <CircularProgress sx={{ color: '#fff' }} />
          <Typography variant="h5" mt={3}>
            Starting check-in…
          </Typography>
        </Centered>
      );
    case 'setup':
      return <StationSetup onSaved={kiosk.retry} />;
    case 'disabled':
      return (
        <Message
          icon={<LockRoundedIcon sx={{ fontSize: 72 }} />}
          title="Face check-in is disabled"
          body="Enable it in Settings → Biometric to start accepting walk-ups."
        />
      );
    case 'no_door':
      return (
        <Message
          icon={<LockRoundedIcon sx={{ fontSize: 72, color: '#f6b73c' }} />}
          title="No door configured for this entrance"
          body="Set the face check-in door device in Settings so an authorized scan can unlock it."
        />
      );
    case 'error':
      return (
        <Message
          icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 72, color: '#ff6b6b' }} />}
          title="Check-in unavailable"
          body={kiosk.errorMessage || 'Something went wrong.'}
          action={
            <Stack direction="row" spacing={2}>
              <Button onClick={kiosk.retry} variant="contained" size="large">
                Retry
              </Button>
              <Button
                onClick={kiosk.resetStation}
                variant="text"
                size="large"
                sx={{ color: '#fff' }}
              >
                Change device secret
              </Button>
            </Stack>
          }
        />
      );
    case 'idle':
      return (
        <Centered>
          <FaceRetouchingNaturalRoundedIcon sx={{ fontSize: 96, opacity: 0.9 }} />
          <Typography variant="h3" fontWeight={800} mt={2}>
            Walk up to check in
          </Typography>
          <Typography variant="h6" mt={2} sx={{ opacity: 0.85 }}>
            {kiosk.hint}
          </Typography>
          <TroubleHint />
        </Centered>
      );
    case 'liveness':
      return (
        <Centered>
          <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.8 }}>
            Quick check
          </Typography>
          <Typography variant="h2" fontWeight={800} mt={1}>
            {kiosk.prompt}
          </Typography>
          <CountdownBar
            remainingMs={kiosk.remainingMs}
            totalMs={DEFAULT_LIVENESS_CONFIG.timeoutMs}
          />
          <TroubleHint />
        </Centered>
      );
    case 'verifying':
      return (
        <Centered>
          <CircularProgress sx={{ color: '#fff' }} />
          <Typography variant="h4" mt={3}>
            Checking you in…
          </Typography>
        </Centered>
      );
    case 'welcome': {
      const { memberName, action } = kiosk.welcome || {};
      const isCheckout = action === 'checkout';
      return (
        <Centered>
          <CheckCircleRoundedIcon sx={{ fontSize: 120, color: '#4caf50' }} />
          <Typography variant="h2" fontWeight={800} mt={2}>
            {isCheckout ? 'Goodbye' : 'Welcome'}
            {memberName ? `, ${memberName.split(' ')[0]}` : ''}!
          </Typography>
          <Typography variant="h5" mt={1} sx={{ opacity: 0.85 }}>
            {isCheckout ? 'Checked out' : 'Checked in'} · the door is unlocking
          </Typography>
        </Centered>
      );
    }
    case 'denied':
      return (
        <Centered>
          <ErrorOutlineRoundedIcon sx={{ fontSize: 96, color: '#ff9800' }} />
          <Typography variant="h4" fontWeight={700} mt={2}>
            {kiosk.denyMessage}
          </Typography>
          <TroubleHint />
        </Centered>
      );
    default:
      return null;
  }
}

function Centered({ children }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={0}>
      {children}
    </Stack>
  );
}

function Message({ icon, title, body, action }) {
  return (
    <Stack alignItems="center" spacing={2} maxWidth={560}>
      {icon}
      <Typography variant="h4" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ opacity: 0.8 }}>
        {body}
      </Typography>
      {action}
    </Stack>
  );
}

function TroubleHint() {
  return (
    <Typography variant="body2" sx={{ mt: 5, opacity: 0.5 }}>
      Having trouble? Please see the front desk.
    </Typography>
  );
}

function CountdownBar({ remainingMs, totalMs }) {
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  return (
    <Box sx={{ width: 320, height: 6, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 3, mt: 4 }}>
      <Box
        sx={{
          width: `${pct}%`,
          height: '100%',
          bgcolor: '#4caf50',
          borderRadius: 3,
          transition: 'width 0.1s linear',
        }}
      />
    </Box>
  );
}

/**
 * First-run station provisioning (plan 3.4): the device secret and a station
 * label are stored per-browser in localStorage. The secret is what lets this
 * unattended tab call the guarded sync/check-in endpoints.
 */
function StationSetup({ onSaved }) {
  const existing = loadStationConfig();
  const [deviceSecret, setDeviceSecret] = useState(existing.deviceSecret || '');
  const [stationLabel, setStationLabel] = useState(existing.stationLabel || '');

  const submit = (e) => {
    e.preventDefault();
    if (!deviceSecret.trim()) return;
    saveStationConfig({ deviceSecret, stationLabel });
    onSaved();
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ width: '100%', maxWidth: 460, textAlign: 'left' }}
    >
      <Typography variant="h4" fontWeight={800} sx={{ textAlign: 'center', mb: 1 }}>
        Set up this check-in station
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.75, textAlign: 'center', mb: 4 }}>
        Enter the device secret configured on the server (DEVICE_SHARED_SECRET). It’s stored only in
        this browser.
      </Typography>
      <Stack spacing={3}>
        <TextField
          label="Device secret"
          type="password"
          value={deviceSecret}
          onChange={(e) => setDeviceSecret(e.target.value)}
          fullWidth
          autoFocus
          required
          variant="filled"
          sx={filledInputSx}
        />
        <TextField
          label="Station label (optional)"
          placeholder="e.g. Front Desk"
          value={stationLabel}
          onChange={(e) => setStationLabel(e.target.value)}
          fullWidth
          variant="filled"
          sx={filledInputSx}
        />
        <Button type="submit" size="large" disabled={!deviceSecret.trim()}>
          Start check-in
        </Button>
      </Stack>
    </Box>
  );
}

const filledInputSx = {
  '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputBase-input': { color: '#fff' },
};

/** Low-emphasis diagnostic footer — backend, gallery size, model version. */
function DebugOverlay({ debug, phase }) {
  if (!CAMERA_PHASES.has(phase)) return null;
  return (
    <Typography
      variant="caption"
      sx={{ position: 'absolute', bottom: 8, left: 12, opacity: 0.35, fontFamily: 'monospace' }}
    >
      {debug.backend || '—'} · {debug.galleryCount} enrolled · {debug.modelVersion || 'no model'}
    </Typography>
  );
}
