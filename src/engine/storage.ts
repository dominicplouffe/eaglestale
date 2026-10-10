/**
 * localStorage can be unavailable (site data blocked, some private-browsing modes) or full.
 * These wrappers make that a soft failure instead of an exception that stops the game from starting.
 */

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false if the value could not be stored. */
export function writeStored(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
