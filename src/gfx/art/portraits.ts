/** Layered portrait art (see gfx/portrait.ts for how layers are combined). Filled in by the art pipeline. */
export interface PortraitData {
  colors: Record<string, string>;
  hatHidesHair: string[];
  layers: Record<string, string[]>;
}

export const PORTRAIT_DATA: PortraitData = { colors: {}, hatHidesHair: [], layers: {} };
