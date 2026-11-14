const TIMER_END_KEY = 'greenkid_timer_end_time';
const TIMER_MINUTES_KEY = 'greenkid_timer_duration_mins';

export interface TimerStatus {
  isActive: boolean;
  isExpired: boolean;
  remainingSeconds: number;
  totalMinutes: number;
}

export function startScreenTimer(minutes: number): void {
  const endTime = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(TIMER_END_KEY, endTime.toString());
  localStorage.setItem(TIMER_MINUTES_KEY, minutes.toString());
}

export function clearScreenTimer(): void {
  localStorage.removeItem(TIMER_END_KEY);
  localStorage.removeItem(TIMER_MINUTES_KEY);
}

export function getTimerStatus(): TimerStatus {
  try {
    const rawEnd = localStorage.getItem(TIMER_END_KEY);
    const rawMins = localStorage.getItem(TIMER_MINUTES_KEY);
    if (!rawEnd) {
      return { isActive: false, isExpired: false, remainingSeconds: 0, totalMinutes: 0 };
    }

    const endTime = parseInt(rawEnd, 10);
    const totalMinutes = parseInt(rawMins || '0', 10);
    const now = Date.now();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      return {
        isActive: true,
        isExpired: true,
        remainingSeconds: 0,
        totalMinutes,
      };
    }

    return {
      isActive: true,
      isExpired: false,
      remainingSeconds: Math.floor(remainingMs / 1000),
      totalMinutes,
    };
  } catch {
    return { isActive: false, isExpired: false, remainingSeconds: 0, totalMinutes: 0 };
  }
}

export function formatRemainingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
