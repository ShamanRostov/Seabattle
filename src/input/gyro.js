/** Разрешение iOS живёт на вкладке: второй вызов без жеста не должен спрашивать снова. */
let sharedPermission = 'unknown';

/**
 * Наклон телефона → горизонтальный вклад в прицел.
 * axis: 'screen' (лево-право относительно экрана), 'gamma' или 'beta'.
 */
export function createGyroAim({ axis = 'screen', deadzone = 4, sensitivity = 1.8 } = {}) {
  const state = {
    enabled: false,
    available: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    value: 0,
    axis,
    permission: 'unknown',
  };

  const onOrient = (e) => {
    const raw = readTilt(e, state.axis);
    if (raw == null || Number.isNaN(raw)) return;
    const clamped = PhaserMathClamp(raw, -45, 45);
    state.value = Math.abs(clamped) < deadzone ? 0 : clamped * sensitivity;
  };

  async function enable({ gesture = false } = {}) {
    if (!state.available) return false;
    try {
      const DOE = window.DeviceOrientationEvent;
      const needsPrompt = typeof DOE?.requestPermission === 'function';
      if (needsPrompt && sharedPermission !== 'granted') {
        if (!gesture) return false;
        const result = await DOE.requestPermission();
        sharedPermission = result === 'granted' ? 'granted' : 'denied';
        if (sharedPermission !== 'granted') {
          state.permission = 'denied';
          return false;
        }
      } else if (!needsPrompt) {
        sharedPermission = 'granted';
      }
      state.permission = 'granted';
      if (!state.enabled) {
        window.addEventListener('deviceorientation', onOrient, true);
        state.enabled = true;
      }
      return true;
    } catch {
      sharedPermission = 'denied';
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

/** Лево-право относительно того, как телефон лежит в руке. */
function readTilt(e, axis) {
  if (axis === 'beta') return e.beta;
  if (axis === 'gamma') return e.gamma;
  const angle =
    (typeof screen !== 'undefined' && screen.orientation && screen.orientation.angle) ||
    window.orientation ||
    0;
  if (angle === 90) return e.beta;
  if (angle === -90 || angle === 270) return e.beta == null ? null : -e.beta;
  if (angle === 180) return e.gamma == null ? null : -e.gamma;
  return e.gamma;
}
