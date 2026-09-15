/**
 * Device tilt → horizontal aim delta.
 * Returns null if unsupported / no permission / no data yet.
 * axis: 'gamma' (tilt left-right in portrait) or 'beta' (forward-back) for A/B test.
 */
export function createGyroAim({ axis = 'gamma', deadzone = 4, sensitivity = 1.8 } = {}) {
  const state = {
    enabled: false,
    available: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    value: 0,
    axis,
    permission: 'unknown',
  };

  const onOrient = (e) => {
    const raw = axis === 'beta' ? e.beta : e.gamma;
    if (raw == null || Number.isNaN(raw)) return;
    const clamped = PhaserMathClamp(raw, -45, 45);
    state.value = Math.abs(clamped) < deadzone ? 0 : clamped * sensitivity;
  };

  async function enable() {
    if (!state.available) return false;
    try {
      const DOE = window.DeviceOrientationEvent;
      if (typeof DOE?.requestPermission === 'function') {
        const result = await DOE.requestPermission();
        state.permission = result;
        if (result !== 'granted') return false;
      } else {
        state.permission = 'granted';
      }
      window.addEventListener('deviceorientation', onOrient, true);
      state.enabled = true;
      return true;
    } catch {
      state.permission = 'denied';
      return false;
    }
  }

  function disable() {
    window.removeEventListener('deviceorientation', onOrient, true);
    state.enabled = false;
    state.value = 0;
  }

  function setAxis(next) {
    state.axis = next;
    axis = next;
  }

  /** Degrees-ish aim rate contribution for this frame (reuse as turn input). */
  function sample() {
    if (!state.enabled) return 0;
    return state.value / 30;
  }

  return { state, enable, disable, setAxis, sample };
}

function PhaserMathClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
