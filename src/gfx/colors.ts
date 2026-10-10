/** Small colour helpers shared by the sprite and portrait code. */

export type RGB = [number, number, number];

export function parseHex(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const toHex = (c: RGB): string =>
  `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * Highlight, mid and shadow tones from one base colour, the way pixel artists shade:
 * highlights lean warm, shadows lean purple. (Same rule as the portrait art tools.)
 */
export function ramp(base: string): [string, string, string] {
  const c = parseHex(base);
  const shadow = mixRGB([c[0] * 0.62, c[1] * 0.62, c[2] * 0.62], [42, 24, 64], 0.22);
  return [toHex(mixRGB(c, [255, 244, 224], 0.32)), base, toHex(shadow)];
}

/** Grey version of a colour, darkened: used for fallen heroes. */
export function deathly(hex: string): string {
  const [r, g, b] = parseHex(hex);
  const v = (r * 0.3 + g * 0.59 + b * 0.11) * 0.55;
  return toHex([v, v, v + 8]);
}
