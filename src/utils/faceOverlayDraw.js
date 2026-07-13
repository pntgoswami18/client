/**
 * Canvas drawing for the kiosk's face-tracking overlay. Called once per frame
 * from useFaceCheckin's existing requestAnimationFrame loop (no second loop) so
 * the glyphs track the detected face without any per-frame React state.
 *
 * The pure math (cover mapping, arrow anchoring, jitter smoothing) lives in and
 * is tested via faceOverlayGeometry.js; this module only turns rects into
 * strokes, which is inherently visual and validated live in the browser.
 *
 * The canvas is NOT css-mirrored (unlike the <video>): coverMap applies the
 * mirror to positions, and glyphs are drawn upright in screen space so arrows
 * point the right way and any text stays legible.
 */
import { coverMap, arrowAnchor, lerpRect } from './faceOverlayGeometry';

const RETICLE = '#7dd3fc'; // sky — "seen"
const ARROW = '#f6b73c'; // amber — "act"

function ensureSized(canvas) {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return null;
  const dpr = window.devicePixelRatio || 1;
  const bw = Math.round(cw * dpr);
  const bh = Math.round(ch * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  return { ctx, cw, ch };
}

/** Wipe the overlay and forget the tracked rect (call when not scanning). */
export function clearOverlay(canvas, state) {
  if (state) state.lastRect = null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draw the per-frame overlay for the current detection + phase.
 * @param state {{ lastRect: object|null, reducedMotion: boolean }} mutated in place
 */
export function renderOverlay(canvas, video, det, phase, challengeType, clockMs, state) {
  if (!canvas || !video) return;
  const sized = ensureSized(canvas);
  if (!sized) return;
  const { ctx, cw, ch } = sized;
  ctx.clearRect(0, 0, cw, ch);

  const scanning = phase === 'idle' || phase === 'liveness';
  if (!scanning || !det || det.faceCount !== 1 || !det.box || !video.videoWidth) {
    state.lastRect = null;
    return;
  }

  const target = coverMap(det.box, video.videoWidth, video.videoHeight, cw, ch, { mirror: true });
  if (!target) return;
  // Snap on re-acquire, otherwise glide toward the new box.
  state.lastRect = lerpRect(state.lastRect, target, state.reducedMotion ? 1 : 0.35);
  const rect = state.lastRect;

  drawReticle(ctx, rect, clockMs, state.reducedMotion);

  if (phase === 'liveness' && challengeType) {
    if (challengeType === 'turn_left' || challengeType === 'turn_right') {
      const anchor = arrowAnchor(rect, challengeType === 'turn_left' ? 'left' : 'right');
      drawTurnArrow(ctx, anchor, clockMs, state.reducedMotion);
    } else if (challengeType === 'blink') {
      drawBlinkCue(ctx, rect, clockMs, state.reducedMotion);
    }
  }
}

function drawReticle(ctx, rect, clockMs, reduced) {
  const { x, y, width: w, height: h } = rect;
  const len = Math.max(14, Math.min(w, h) * 0.22);
  const pulse = reduced ? 0.95 : 0.7 + 0.3 * Math.sin(clockMs / 400);

  ctx.save();
  ctx.strokeStyle = RETICLE;
  ctx.shadowColor = RETICLE;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = pulse;

  // Four L-shaped corner brackets hugging the face box.
  const corners = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * len, cy);
    ctx.stroke();
  }

  // Soft pulsing ring, motion only.
  if (!reduced) {
    ctx.globalAlpha = 0.22 * pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.62, h * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTurnArrow(ctx, anchor, clockMs, reduced) {
  const { x, y, sign } = anchor;
  const size = 24;
  const strobe = reduced ? 0.95 : 0.35 + 0.65 * Math.abs(Math.sin(clockMs / 260));
  const shift = reduced ? 0 : 6 * Math.sin(clockMs / 260);

  ctx.save();
  ctx.translate(x + sign * shift, y);
  ctx.strokeStyle = ARROW;
  ctx.shadowColor = ARROW;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Two stacked chevrons pointing `sign` (right = ">", left = "<").
  let alpha = strobe;
  for (let i = 0; i < 2; i++) {
    const ox = i * sign * 15;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(ox - sign * size * 0.5, -size * 0.6);
    ctx.lineTo(ox + sign * size * 0.5, 0);
    ctx.lineTo(ox - sign * size * 0.5, size * 0.6);
    ctx.stroke();
    alpha *= 0.5;
  }
  ctx.restore();
}

function drawBlinkCue(ctx, rect, clockMs, reduced) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height * 0.3; // roughly eye level
  const eyeW = Math.max(30, rect.width * 0.26);
  const eyeH = eyeW * 0.5;
  // Aperture on a ~1s loop; static-open when reduced motion.
  const openness = reduced ? 0.6 : 0.5 + 0.5 * Math.cos(clockMs / 500);
  const ap = eyeH * openness;

  ctx.save();
  ctx.strokeStyle = RETICLE;
  ctx.shadowColor = RETICLE;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  // Almond eye: upper + lower lid meeting at the corners, aperture = ap.
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - ap, cx + eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy + ap, cx - eyeW / 2, cy);
  ctx.stroke();

  // Iris — fades in as the eye opens.
  if (openness > 0.35) {
    ctx.globalAlpha = (openness - 0.35) / 0.65;
    ctx.fillStyle = RETICLE;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, ap * 0.38), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
