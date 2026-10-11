import { content } from '../content/registry';
import { MAX_INVENTORY, addXp, isAlive } from './character';
import { specialKey } from './dungeon';
import type { GameState } from './state';
import type { Character, CityStage, QuestDef, QuestGoal, Reward } from './types';

/**
 * Quests, feathers and the city's recovery. Everything here is driven by content (QuestDef,
 * FeatherDef, CityStage), so new chapters and side missions are data, not code.
 *
 * Every function takes the state and returns the lines to show in the log.
 */

export interface QuestProgress {
  step: number;
  /** Kills counted toward the current step's goal. */
  count: number;
  /** 'ready': a bounty whose goal is met, waiting to be handed in at the Guild. */
  status: 'active' | 'ready' | 'done';
}

/** Something that happened which might move a quest along. */
export type QuestEvent =
  | { kind: 'kill'; monster: string; count: number }
  | { kind: 'flag'; flag: string }
  /** Feathers found or offered, or items gained: goals are simply re-checked. */
  | { kind: 'check' };

/** Most bounties a party can have taken at once. */
export const MAX_BOUNTIES = 3;

const party = (s: GameState): Character[] =>
  s.party.map((id) => s.roster.find((c) => c.id === id)).filter((c): c is Character => !!c);

export function itemCount(s: GameState, itemId: string): number {
  return party(s).reduce((n, c) => n + c.inventory.filter((i) => i === itemId).length, 0);
}

/** How far along a goal is: `have` of `need`. */
export function goalProgress(s: GameState, goal: QuestGoal, count: number): { have: number; need: number } {
  switch (goal.kind) {
    case 'kill':
      return { have: Math.min(count, goal.count), need: goal.count };
    case 'collect':
      return { have: Math.min(itemCount(s, goal.item), goal.count), need: goal.count };
    case 'flag':
      return { have: s.story[goal.flag] ? 1 : 0, need: 1 };
    case 'feathers':
      return { have: Math.min(s.feathers.length, goal.count), need: goal.count };
    case 'offered':
      return { have: Math.min(s.offered, goal.count), need: goal.count };
  }
}

const met = (s: GameState, goal: QuestGoal, count: number): boolean => {
  const p = goalProgress(s, goal, count);
  return p.have >= p.need;
};

export const activeQuests = (s: GameState): QuestDef[] =>
  Object.entries(s.quests)
    .filter(([id, p]) => p.status !== 'done' && content.quests.has(id))
    .map(([id]) => content.quest(id));

export function startQuest(s: GameState, id: string): string[] {
  if (s.quests[id] || !content.quests.has(id)) return [];
  const q = content.quest(id);
  s.quests[id] = { step: 0, count: 0, status: 'active' };
  return [`New ${q.kind === 'main' ? 'quest' : 'task'}: ${q.name}. ${q.steps[0]?.text ?? ''}`.trim(), ...advance(s, id)];
}

/** Starts every 'start' quest the save doesn't have yet (new games, and old saves meeting new content). */
export function startOpeningQuests(s: GameState): string[] {
  return [...content.quests.values()].filter((q) => q.source === 'start').flatMap((q) => startQuest(s, q.id));
}

/**
 * For old saves meeting new content: finished quests set their flags and start their follow-on
 * quests, even if they were finished before those existed (a new chapter after the ending, say).
 */
export function catchUpQuests(s: GameState): string[] {
  const out: string[] = [];
  for (const [id, p] of Object.entries(s.quests)) {
    if (p.status !== 'done' || !content.quests.has(id)) continue;
    const q = content.quest(id);
    if (q.flag) s.story[q.flag] = true;
    for (const next of q.next ?? []) out.push(...startQuest(s, next));
  }
  return out;
}

/** Moves a quest through every step whose goal is already met. */
function advance(s: GameState, id: string): string[] {
  const q = content.quest(id);
  const p = s.quests[id];
  const out: string[] = [];
  while (p.status === 'active' && p.step < q.steps.length && met(s, q.steps[p.step].goal, p.count)) {
    p.step += 1;
    p.count = 0;
    if (p.step < q.steps.length) out.push(`${q.name}: ${q.steps[p.step].text}`);
  }
  if (p.status === 'active' && p.step >= q.steps.length) {
    if (q.source === 'board') {
      p.status = 'ready';
      out.push(`${q.name}: done! Report to the Guild for your reward.`);
    } else out.push(...finish(s, id));
  }
  return out;
}

function finish(s: GameState, id: string): string[] {
  const q = content.quest(id);
  s.quests[id].status = 'done';
  if (q.ending) s.won = true;
  if (q.flag) s.story[q.flag] = true;
  // Bounties take what was collected; other quests take only story items (the rest are the party's to keep).
  handOver(s, q, q.source !== 'board');
  const out = [q.done, ...giveReward(s, q.reward)];
  for (const next of q.next ?? []) out.push(...startQuest(s, next));
  return out;
}

/** Removes the items a quest asked the party to collect. */
function handOver(s: GameState, q: QuestDef, onlyStoryItems: boolean): void {
  for (const step of q.steps) {
    if (step.goal.kind !== 'collect' || (onlyStoryItems && !content.item(step.goal.item).quest)) continue;
    let left = step.goal.count;
    for (const c of party(s)) {
      while (left > 0) {
        const at = c.inventory.indexOf(step.goal.item);
        if (at < 0) break;
        c.inventory.splice(at, 1);
        left -= 1;
      }
    }
  }
}

/** Tells every active quest what happened. */
export function questEvent(s: GameState, ev: QuestEvent): string[] {
  if (ev.kind === 'flag') s.story[ev.flag] = true;
  const out: string[] = [];
  for (const q of activeQuests(s)) {
    const p = s.quests[q.id];
    if (p.status !== 'active') continue;
    const goal = q.steps[p.step]?.goal;
    if (ev.kind === 'kill' && goal?.kind === 'kill' && goal.monster === ev.monster) p.count += ev.count;
    out.push(...advance(s, q.id));
  }
  return out;
}

// ---- Bounties -----------------------------------------------------------------

/** Board quests that can be taken now. */
export function availableBounties(s: GameState): QuestDef[] {
  return [...content.quests.values()].filter(
    (q) =>
      q.source === 'board' &&
      !s.quests[q.id] &&
      (q.requires?.quests ?? []).every((r) => s.quests[r]?.status === 'done') &&
      s.feathers.length >= (q.requires?.feathers ?? 0),
  );
}

export const takenBounties = (s: GameState): QuestDef[] =>
  activeQuests(s).filter((q) => q.source === 'board');

export function takeBounty(s: GameState, id: string): string[] {
  if (takenBounties(s).length >= MAX_BOUNTIES) return [`You can only carry ${MAX_BOUNTIES} bounties at once.`];
  return startQuest(s, id);
}

/** Hands in a finished bounty: collected items are handed over and the reward paid. */
export function turnIn(s: GameState, id: string): string[] {
  const p = s.quests[id];
  if (!p || p.status !== 'ready') return [];
  return finish(s, id);
}

// ---- Locks ----------------------------------------------------------------------------

/** "the Ossuary Key", but "Professor Pinion's Letter" (a name that's already someone's needs no "the"). */
const theItem = (name: string): string => (/'s\b/.test(name) ? name : `the ${name}`);

/** Why a locked door won't open yet, or null if the party has what it needs. */
export function lockedBecause(s: GameState, lock: { key?: string; feathers?: number; flag?: string }): string | null {
  const missing: string[] = [];
  if (lock.key && itemCount(s, lock.key) === 0) missing.push(theItem(content.item(lock.key).name));
  const need = lock.feathers ?? 0;
  if (s.feathers.length < need) missing.push(`${need} of Aquila's feathers (you have ${s.feathers.length})`);
  if (missing.length) return `You need ${missing.join(' and ')}.`;
  // A flag lock's own text says what might open it (a wheel somewhere, say).
  if (lock.flag && !s.story[lock.flag]) return "It won't budge.";
  return null;
}

/**
 * Takes a story key out of the party's packs once its door is open for good, unless another door in
 * the game still needs it. Returns what to tell the player, or null if the key stays.
 */
export function useUpKey(s: GameState, keyId: string | undefined): string | null {
  if (!keyId || !content.item(keyId).quest) return null;
  let doors = 0;
  for (const d of content.dungeons.values()) {
    for (const level of d.levels) {
      for (const sp of Object.values(level.specials)) {
        if ((sp.kind === 'lock' || sp.kind === 'portal' || sp.kind === 'building') && sp.key === keyId) doors += 1;
      }
    }
  }
  if (doors > 1) return null;
  const holder = party(s).find((c) => c.inventory.includes(keyId));
  if (!holder) return null;
  holder.inventory.splice(holder.inventory.indexOf(keyId), 1);
  return `${holder.name} leaves ${theItem(content.item(keyId).name)} behind; the way stays open.`;
}

// ---- Rewards, feathers and the city ------------------------------------------------

/**
 * Gives an item to the first living hero with room. What must not be lost (story items, and
 * rewards: `keep`) never is: if every pack is full, the emptiest takes it anyway, over the limit
 * until room is made. Anything else (a bounty drop, say) is left behind.
 */
export function giveItem(s: GameState, itemId: string, keep = !!content.item(itemId).quest): string {
  const name = theItem(content.item(itemId).name);
  const living = party(s).filter(isAlive);
  const carrier = living.find((c) => c.inventory.length < MAX_INVENTORY);
  if (carrier) {
    carrier.inventory.push(itemId);
    return `${carrier.name} takes ${name}.`;
  }
  const crammer = keep ? [...(living.length ? living : party(s))].sort((a, z) => a.inventory.length - z.inventory.length)[0] : undefined;
  if (!crammer) return `Everyone's pack is full, so ${name} is left behind.`;
  crammer.inventory.push(itemId);
  return `Everyone's pack is full, so ${crammer.name} crams ${name} in on top. Make some room soon!`;
}

/** Whether the party still has a use for a story item: a way it opens that isn't open, or a quest collecting it. */
function stillNeeded(s: GameState, itemId: string): boolean {
  for (const d of content.dungeons.values()) {
    for (let l = 0; l < d.levels.length; l++) {
      const level = d.levels[l];
      for (let y = 0; y < level.grid.length; y++) {
        for (let x = 0; x < level.grid[y].length; x++) {
          const sp = level.specials[level.grid[y][x]];
          if (!sp || !('key' in sp) || sp.key !== itemId) continue;
          if (sp.kind === 'lock' ? !s.flags[specialKey(d.id, l, x, y)] : !(sp.flag && s.story[sp.flag])) return true;
        }
      }
    }
  }
  return activeQuests(s).some((q) => q.steps.some((st) => st.goal.kind === 'collect' && st.goal.item === itemId));
}

/**
 * Story items a save has lost (a full pack once left them behind): any the party has earned (from a
 * chest it opened or a fight it won), still has a use for, and no longer carries, turn up again.
 */
export function recoverStoryItems(s: GameState): string[] {
  const earned = new Map<string, number>();
  for (const d of content.dungeons.values()) {
    d.levels.forEach((level, l) =>
      level.grid.forEach((row, y) =>
        [...row].forEach((t, x) => {
          const sp = level.specials[t];
          if (!sp || !s.flags[specialKey(d.id, l, x, y)]) return;
          const item = sp.kind === 'treasure' ? sp.item : sp.kind === 'fight' ? sp.reward?.item : undefined;
          if (item && content.items.get(item)?.quest) earned.set(item, (earned.get(item) ?? 0) + 1);
        }),
      ),
    );
  }
  const out: string[] = [];
  for (const [itemId, count] of earned) {
    const held = s.roster.reduce((n, c) => n + c.inventory.filter((i) => i === itemId).length, 0);
    if (held >= count || !stillNeeded(s, itemId)) continue;
    for (let i = held; i < count; i++) out.push(`Lost and found: ${giveItem(s, itemId, true)}`);
  }
  return out;
}

export function giveReward(s: GameState, r: Reward | undefined): string[] {
  if (!r) return [];
  const out: string[] = [];
  if (r.gold) {
    s.gold += r.gold;
    out.push(`+${r.gold} gold.`);
  }
  if (r.item) out.push(giveItem(s, r.item, true));
  if (r.xp) {
    const living = party(s).filter(isAlive);
    const share = Math.max(1, Math.floor(r.xp / Math.max(1, living.length)));
    out.push(`+${share} XP each.`);
    for (const c of living) out.push(...addXp(c, share));
  }
  if (r.feather) out.push(...gainFeather(s, r.feather));
  return out;
}

export function gainFeather(s: GameState, id: string): string[] {
  if (s.feathers.includes(id)) return [];
  s.feathers.push(id);
  const total = content.feathers.size;
  return [`You recover ${content.feather(id).name}! (${s.feathers.length} of ${total} feathers)`, ...questEvent(s, { kind: 'check' })];
}

export function cityStage(s: GameState): CityStage | undefined {
  return [...content.cityStages].reverse().find((st) => st.feathers <= s.offered);
}

/** Offers every carried feather at the Eagle Tower. Returns what changed in the city. */
export function offerFeathers(s: GameState): string[] {
  if (s.feathers.length <= s.offered) return [];
  const before = s.offered;
  s.offered = s.feathers.length;
  const out = content.cityStages.filter((st) => st.feathers > before && st.feathers <= s.offered).map((st) => st.text);
  return [...out, ...questEvent(s, { kind: 'check' })];
}

/** What the Emporium sells now: its base stock plus anything the city's recovery has brought in. */
export function shopStock(s: GameState, base: string[]): string[] {
  const extra = content.cityStages.filter((st) => st.feathers <= s.offered).flatMap((st) => st.stock ?? []);
  return [...new Set([...base, ...extra])];
}
