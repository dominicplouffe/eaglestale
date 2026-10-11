/**
 * Boss balance: simulated six-hero parties (full health, sensible orders, starting kit) against the
 * bosses of the first three chapters. Each should stop an under-levelled party and fall to one at
 * the expected level, so the difficulty curve can't drift silently. Real players arrive hurt, so
 * real fights are harder. Later bosses are tuned for parties in shop gear: see progression.test.ts,
 * which checks every boss against the levels and gear a party really has when it gets there.
 */
import { describe, expect, it } from 'vitest';
import { bossFight, rate, shopGear } from './sim';

describe('boss balance', () => {
  it('the Kobold Chieftain needs a level 3 party', () => {
    expect(rate(2, bossFight(0, 'K'))).toBeLessThan(0.7);
    expect(rate(3, bossFight(0, 'K'))).toBeGreaterThanOrEqual(0.8);
  });

  it('the Bone Warden needs a level 4-5 party', () => {
    expect(rate(3, bossFight(1, 'B'))).toBeLessThan(0.5);
    expect(rate(5, bossFight(1, 'B'))).toBeGreaterThanOrEqual(0.7);
  });

  it('High Priest Grackle needs a level 6 party', () => {
    expect(rate(5, bossFight(2, 'G'))).toBeLessThan(0.5);
    expect(rate(7, bossFight(2, 'G'))).toBeGreaterThanOrEqual(0.8);
  });

  it('Old Snapjaw needs a level 7-8 party', () => {
    expect(rate(6, bossFight(0, 'J', 'gurgle'))).toBeLessThan(0.5);
    expect(rate(8, bossFight(0, 'J', 'gurgle'))).toBeGreaterThanOrEqual(0.8);
  });

  it('the Rat King needs a level 10 party', () => {
    expect(rate(8, bossFight(1, 'K', 'gurgle'), [], 80)).toBeLessThan(0.5);
    expect(rate(11, bossFight(1, 'K', 'gurgle'), [], 80)).toBeGreaterThanOrEqual(0.75);
  });

  it("the Gurgle's ambushes are beatable by a party that has just arrived", () => {
    expect(rate(7, bossFight(0, 'f', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(8, bossFight(1, 'f', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(8, bossFight(1, 'Q', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
  });

  it('the Grinder needs a level 11 party', () => {
    expect(rate(9, bossFight(1, 'G', 'clocktower'))).toBeLessThan(0.3);
    expect(rate(12, bossFight(1, 'G', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
  });

  it('Professor Pinion and his Mechanical Eagle need a level 12-13 party', () => {
    expect(rate(11, bossFight(2, 'E', 'clocktower'))).toBeLessThan(0.5);
    expect(rate(13, bossFight(2, 'E', 'clocktower'))).toBeGreaterThanOrEqual(0.75);
  });

  it("the Clocktower's set fights are beatable by a party that has just arrived", () => {
    expect(rate(10, bossFight(0, 'f', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(10, bossFight(1, 'q', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(11, bossFight(2, 'Q', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
  });

  it('the set fights of the Wood and the Spire are beatable by a party that has just arrived', () => {
    for (const [level, key, dungeon, at] of [
      [0, 'W', 'wood', 13], [0, 'f', 'wood', 13], [1, 'f', 'wood', 14], [2, 'Q', 'wood', 14], [2, 'f', 'wood', 14],
      [0, 'f', 'spire', 15], [1, 'f', 'spire', 16], [2, 'f', 'spire', 16], [3, 'Q', 'spire', 17], [3, 'f', 'spire', 17],
    ] as const) {
      expect(rate(at, bossFight(level, key, dungeon)), `${dungeon} ${level} ${key}`).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('gear from the Emporium makes a real difference', () => {
    // Grackle stops a level 5 party in its starting kit, but not one in steel bought from the city.
    expect(rate(5, bossFight(2, 'G'))).toBeLessThan(0.5);
    expect(rate(5, bossFight(2, 'G'), shopGear(3))).toBeGreaterThanOrEqual(0.9);
  });
});
