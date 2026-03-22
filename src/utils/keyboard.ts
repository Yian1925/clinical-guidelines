import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/** Enter / Space activation for elements with role="button" (not native `<button>`). */
export function roleButtonActivate(e: ReactKeyboardEvent, action: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
}
