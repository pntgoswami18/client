import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import FaceIcon from '@mui/icons-material/Face';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import { apiFetch } from '../api/client';
import SearchableMemberDropdown from './SearchableMemberDropdown';
import faceEngine from '../utils/faceEngine';
import { captureDecision } from '../utils/faceAlign';

/**
 * Face enrollment tab (plan Section 2.3). Captures 3 poses in the admin's
 * browser, embeds them on-device via faceEngine, and POSTs only the embedding
 * vectors — raw images never leave the browser (the thumbnails below are
 * in-memory data URLs for review, discarded after submit).
 */

const POSES = ['front', 'left', 'right'];
const POSE_HINTS = {
  front: 'Look straight at the camera',
  left: 'Slowly turn your head to one side',
  right: 'Now slowly turn to the other side',
};
const STABLE_FRAMES = 3; // consecutive good frames required before capturing
const MIN_SHARPNESS = 60; // Laplacian variance floor on the 112px crop

const REASON_HINTS = {
  no_face: 'No face detected — step into view',
  multiple_faces: 'Multiple faces in view — one person at a time',
  too_far: 'Move closer to the camera',
  off_center: 'Center your face in the frame',
};

const FaceEnrollment = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [faceStatus, setFaceStatus] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [engineState, setEngineState] = useState('idle'); // idle|loading|ready|error
  const [engineError, setEngineError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [captures, setCaptures] = useState({}); // pose -> {embedding, quality, thumbnail}
  const [hint, setHint] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const stableRef = useRef({ pose: null, count: 0 });
  const capturesRef = useRef(captures);
  const busyRef = useRef(false);
  capturesRef.current = captures;

  useEffect(() => {
    (async () => {
      // The members endpoint hard-caps limit at 100 per page, so walk the
      // pages to build the full list the dropdown searches over — otherwise
      // gyms with >100 members can't enroll everyone.
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const response = await apiFetch(`/api/members?filter=all&limit=100&page=${page}`);
          const data = await response.json();
          all.push(...(data.data || data.members || []));
          totalPages = data.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages && page <= 100); // 100-page guard (10k members)
        setMembers(all);
      } catch {
        setMembers([]);
      }
    })();
  }, []);

  const fetchFaceStatus = useCallback(async (memberId) => {
    try {
      const response = await apiFetch(`/api/biometric/members/${memberId}/face-status`);
      const data = await response.json();
      setFaceStatus(data.data || null);
    } catch {
      setFaceStatus(null);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]); // cleanup on unmount

  const nextNeededPose = (caps) => POSES.find((p) => !caps[p]) || null;

  const captureLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      loopRef.current = requestAnimationFrame(captureLoop);
      return;
    }
    const needed = nextNeededPose(capturesRef.current);
    if (!needed) return; // all poses captured — loop ends

    const detection = faceEngine.detect(video, performance.now());
    if (!detection.ok) {
      stableRef.current = { pose: null, count: 0 };
      setHint(REASON_HINTS[detection.reasons[0]] || 'Adjust your position');
      loopRef.current = requestAnimationFrame(captureLoop);
      return;
    }

    const poseNow = detection.pose.label; // 'front' | 'left' | 'right' | null
    const sideCaptured = POSES.some((p) => p !== 'front' && capturesRef.current[p]);
    setHint(
      needed === 'front'
        ? POSE_HINTS.front
        : sideCaptured
          ? POSE_HINTS.right // "…turn to the other side"
          : POSE_HINTS.left // "…turn your head to one side"
    );

    // captureDecision (unit-tested in faceAlign.test.js) picks the slot this
    // orientation fills, or null to reject — it enforces front-first and that
    // the two side slots hold genuinely different orientations.
    const label = captureDecision(capturesRef.current, poseNow);
    if (!label) {
      stableRef.current = { pose: null, count: 0 };
      loopRef.current = requestAnimationFrame(captureLoop);
      return;
    }

    const stable = stableRef.current;
    stableRef.current =
      stable.pose === poseNow
        ? { pose: poseNow, count: stable.count + 1 }
        : { pose: poseNow, count: 1 };

    if (stableRef.current.count >= STABLE_FRAMES && !busyRef.current) {
      busyRef.current = true;
      const { canvas, imageData, sharpness } = faceEngine.alignCrop(video, detection.fivePoints);
      if (sharpness < MIN_SHARPNESS) {
        setHint('Hold still — image is blurry');
        busyRef.current = false;
      } else {
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        faceEngine
          .embed(imageData)
          .then((embedding) => {
            setCaptures((prev) => ({
              ...prev,
              [label]: {
                embedding,
                quality: Math.min(1, sharpness / 1000),
                thumbnail,
              },
            }));
            stableRef.current = { pose: null, count: 0 };
          })
          .catch((err) => {
            // Reset stability so a transient failure doesn't immediately
            // re-fire a capture on the same held pose every few frames.
            stableRef.current = { pose: null, count: 0 };
            setCameraError(`Embedding failed: ${err.message}`);
          })
          .finally(() => {
            busyRef.current = false;
          });
      }
    }
    loopRef.current = requestAnimationFrame(captureLoop);
  }, []);

  const startCapture = useCallback(async () => {
    setCameraError('');
    setCaptures({});
    setEngineState('loading');
    try {
      await faceEngine.init();
      setEngineState('ready');
    } catch (err) {
      setEngineState('error');
      setEngineError(err.message);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (!videoRef.current) {
        // Unmounted or navigated away during init/getUserMedia — release the
        // camera we just acquired instead of leaking the track.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      loopRef.current = requestAnimationFrame(captureLoop);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied — allow camera use for this site to enroll faces'
          : `Camera unavailable: ${err.message}`
      );
    }
  }, [captureLoop]);

  // All poses captured → stop camera, advance to review.
  useEffect(() => {
    if (activeStep === 1 && POSES.every((p) => captures[p])) {
      stopCamera();
      setActiveStep(2);
    }
  }, [captures, activeStep, stopCamera]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const response = await apiFetch(`/api/biometric/members/${selectedMember}/face-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelVersion: faceEngine.modelVersion,
          consent,
          samples: POSES.map((pose) => ({
            embedding: captures[pose].embedding,
            pose,
            quality: captures[pose].quality,
          })),
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResult({ ok: true, message: data.message });
        setActiveStep(3);
        fetchFaceStatus(selectedMember);
      } else {
        setResult({ ok: false, message: data.message || 'Enrollment failed' });
      }
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove all face data for this member?')) return;
    try {
      const response = await apiFetch(`/api/biometric/members/${selectedMember}/face`, {
        method: 'DELETE',
      });
      if (response.ok) fetchFaceStatus(selectedMember);
    } catch {
      /* status refresh below will show the truth */
    }
  };

  const reset = () => {
    stopCamera();
    setActiveStep(0);
    setSelectedMember('');
    setFaceStatus(null);
    setCaptures({});
    setConsent(false);
    setResult(null);
    setCameraError('');
  };

  const memberName = members.find((m) => String(m.id) === String(selectedMember))?.name || '';

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FaceIcon color="primary" />
        <Typography variant="h6">Face Enrollment</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Captures are processed entirely in this browser — only the face template (a numeric
        embedding) is stored on the gym server. No photos are uploaded.
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel>Select member</StepLabel>
          <StepContent>
            <SearchableMemberDropdown
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
                if (e.target.value) fetchFaceStatus(e.target.value);
              }}
              members={members}
              label="Select Member"
              placeholder="Search members by name, ID, or phone..."
              sx={{ mb: 2 }}
            />
            {faceStatus?.enrolled && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
                action={
                  <Button
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemove}
                  >
                    Remove
                  </Button>
                }
              >
                Already enrolled ({faceStatus.samples} samples,{' '}
                {new Date(faceStatus.enrolledAt).toLocaleDateString()}). Re-enrolling replaces them.
              </Alert>
            )}
            <Button
              variant="contained"
              disabled={!selectedMember}
              onClick={() => {
                setActiveStep(1);
                startCapture();
              }}
            >
              Start camera
            </Button>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Capture poses</StepLabel>
          <StepContent>
            {engineState === 'loading' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Loading face models…</Typography>
              </Box>
            )}
            {engineState === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {engineError}
              </Alert>
            )}
            {cameraError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {cameraError}
              </Alert>
            )}

            <Box sx={{ position: 'relative', width: 480, maxWidth: '100%', mb: 2 }}>
              {/* Mirrored preview is what people expect from a selfie view;
                  detection runs on the unmirrored frames. */}
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', borderRadius: 8, transform: 'scaleX(-1)' }}
              />
              {engineState === 'ready' && !cameraError && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    width: '100%',
                    textAlign: 'center',
                    color: 'white',
                    textShadow: '0 0 6px rgba(0,0,0,0.9)',
                  }}
                >
                  {hint}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {POSES.map((pose) => (
                <Chip
                  key={pose}
                  label={pose}
                  color={captures[pose] ? 'success' : 'default'}
                  icon={captures[pose] ? <CheckCircleIcon /> : undefined}
                />
              ))}
            </Box>
            <Button onClick={reset}>Cancel</Button>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Review &amp; consent</StepLabel>
          <StepContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {POSES.map(
                (pose) =>
                  captures[pose] && (
                    <Box key={pose} sx={{ textAlign: 'center' }}>
                      <img
                        src={captures[pose].thumbnail}
                        alt={`${pose} capture`}
                        width={96}
                        height={96}
                        style={{ borderRadius: 8 }}
                      />
                      <Typography variant="caption" display="block">
                        {pose}
                      </Typography>
                    </Box>
                  )
              )}
            </Box>
            <FormControlLabel
              control={
                <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              }
              label={`${memberName || 'The member'} consents to their face template being stored for gym check-in`}
            />
            {result && !result.ok && (
              <Alert severity="error" sx={{ my: 1 }}>
                {result.message}
              </Alert>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="contained" disabled={!consent || submitting} onClick={handleSubmit}>
                {submitting ? 'Saving…' : 'Save enrollment'}
              </Button>
              <Button
                startIcon={<ReplayIcon />}
                onClick={() => {
                  setActiveStep(1);
                  startCapture();
                }}
              >
                Recapture
              </Button>
              <Button onClick={reset}>Cancel</Button>
            </Box>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Done</StepLabel>
          <StepContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              {result?.message}
            </Alert>
            <Button variant="contained" onClick={reset}>
              Enroll another member
            </Button>
          </StepContent>
        </Step>
      </Stepper>
    </Paper>
  );
};

export default FaceEnrollment;
