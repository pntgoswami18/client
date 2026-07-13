/**
 * Pure geometry for the kiosk's face-tracking overlay (CheckIn.js). Kept
 * separate from the canvas drawing (faceOverlayDraw.js) so the tricky part —
 * mapping a detected face box onto the displayed, `object-fit: cover`, mirrored
 * video — is unit-testable without a DOM. All inputs/outputs are plain numbers.
 *
 * Coordinate frames:
 *  - detection space: faceEngine.detect().box is in *video-frame* pixels
 *    (videoWidth × videoHeight), un-mirrored (the raw camera frame).
 *  - display space: the <video> fills its container with `object-fit: cover`
 *    (scaled up + center-cropped) and is CSS-mirrored (`scaleX(-1)`), so a point
 *    must be scaled by the cover factor, offset by the crop, then flipped in x.
 */

/**
 * Map a detection-space rectangle to display-space, replicating CSS
 * `object-fit: cover` and (optionally) the horizontal mirror.
 *
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function coverMap(box, videoW, videoH, dispW, dispH, { mirror = false } = {}) {
  if (!box || !videoW || !videoH || !dispW || !dispH) return null;
  // cover = fill the container, cropping the overflowing axis.
  const scale = Math.max(dispW / videoW, dispH / videoH);
  const offsetX = (dispW - videoW * scale) / 2;
  const offsetY = (dispH - videoH * scale) / 2;

  let x = box.originX * scale + offsetX;
  const y = box.originY * scale + offsetY;
  const width = box.width * scale;
  const height = box.height * scale;

  // Mirror flips the box across the display's vertical centerline; the left
  // edge in the flipped frame is dispW - (x + width).
  if (mirror) x = dispW - x - width;

  return { x, y, width, height };
}

/**
 * Where to place the turn arrow relative to a face rect: just outside the given
 * side, vertically centered. `sign` is the horizontal draw direction the chevron
 * should point (-1 = left, +1 = right).
 *
 * @param {'left'|'right'} direction  display-space side (already mirror-adjusted)
 */
export function arrowAnchor(rect, direction) {
  const gap = Math.max(28, rect.width * 0.32);
  const y = rect.y + rect.height * 0.5;
  if (direction === 'left') {
    return { x: rect.x - gap, y, sign: -1 };
  }
  return { x: rect.x + rect.width + gap, y, sign: 1 };
}

/**
 * Linear-interpolate a rect toward a target — used to smooth per-frame box
 * jitter so the reticle glides instead of snapping. `t` in [0,1]; a null `from`
 * (first frame / face just re-acquired) snaps straight to the target.
 */
export function lerpRect(from, to, t) {
  if (!from) return to;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
  };
}
