export interface MenuItem {
  /** Hotkey (single character, case-insensitive). */
  key: string;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export type LogStyle = '' | 'good' | 'bad' | 'gold' | 'dim' | 'story';
export type KeyHandler = (e: KeyboardEvent) => boolean;
export type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void;

/** Owns the page's DOM regions and the canvas render loop. Screens draw through this. */
export class Shell {
  readonly canvas = document.getElementById('view') as HTMLCanvasElement;
  readonly ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  readonly minimap = document.getElementById('minimap') as HTMLCanvasElement;
  readonly partyEl = document.getElementById('party') as HTMLElement;
  private readonly logEl = document.getElementById('log') as HTMLElement;
  private readonly menuEl = document.getElementById('menu') as HTMLElement;
  private readonly overlayEl = document.getElementById('overlay') as HTMLElement;
  private readonly locationEl = document.getElementById('location') as HTMLElement;
  private menuItems: MenuItem[] = [];
  private keyHandler: KeyHandler | null = null;
  private draw: DrawFn | null = null;
  private globalKeys = new Map<string, () => void>();

  constructor() {
    this.ctx.imageSmoothingEnabled = false;
    window.addEventListener('keydown', (e) => this.onKey(e));
    const loop = (ms: number): void => {
      if (this.draw) this.draw(this.ctx, ms / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Registers a key that works on every screen (e.g. mute). */
  onGlobalKey(key: string, action: () => void): void {
    this.globalKeys.set(key.toLowerCase(), action);
  }

  setDraw(fn: DrawFn | null): void {
    this.draw = fn;
  }

  setLocation(text: string): void {
    this.locationEl.textContent = text;
  }

  // ---- Log -----------------------------------------------------------------

  print(text: string, style: LogStyle = ''): void {
    const p = document.createElement('p');
    p.textContent = text;
    if (style) p.className = style;
    this.logEl.appendChild(p);
    while (this.logEl.childElementCount > 200) this.logEl.firstElementChild?.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clearLog(): void {
    this.logEl.replaceChildren();
  }

  // ---- Menu ----------------------------------------------------------------

  setMenu(items: MenuItem[], title?: string): void {
    this.menuItems = items;
    this.menuEl.replaceChildren();
    if (title) {
      const t = document.createElement('div');
      t.className = 'menu-title';
      t.textContent = title;
      this.menuEl.appendChild(t);
    }
    // Short labels sit in two columns; long ones (e.g. spell descriptions) get a full row.
    this.menuEl.style.gridTemplateColumns = items.every((i) => i.label.length <= 26) ? '1fr 1fr' : '1fr';
    for (const item of items) {
      const b = document.createElement('button');
      b.className = 'menu-item';
      b.disabled = !!item.disabled;
      const k = document.createElement('kbd');
      k.textContent = item.key.toUpperCase();
      b.append(k, item.label);
      b.addEventListener('click', () => {
        if (!item.disabled) item.action();
      });
      this.menuEl.appendChild(b);
    }
  }

  // ---- Overlay -------------------------------------------------------------

  setOverlay(node: HTMLElement | null): void {
    this.overlayEl.replaceChildren();
    if (node) this.overlayEl.appendChild(node);
    this.overlayEl.hidden = !node;
    if (node) this.overlayEl.scrollTop = 0;
  }

  get overlayOpen(): boolean {
    return !this.overlayEl.hidden;
  }

  // ---- Keyboard ------------------------------------------------------------

  /** A screen-specific handler runs before menu hotkeys. Return true if the key was handled. */
  setKeyHandler(fn: KeyHandler | null): void {
    this.keyHandler = fn;
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    const global = this.globalKeys.get(key);
    if (global) {
      e.preventDefault();
      global();
      return;
    }
    if (this.keyHandler?.(e)) {
      e.preventDefault();
      return;
    }
    const item = this.menuItems.find((m) => m.key.toLowerCase() === key);
    if (item && !item.disabled) {
      e.preventDefault();
      item.action();
    }
  }
}

/** Tiny DOM builder used by the screens. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { class?: string; text?: string; title?: string; disabled?: boolean; onclick?: () => void } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.class) node.className = attrs.class;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  if (attrs.title) node.title = attrs.title;
  if (attrs.disabled && 'disabled' in node) (node as HTMLButtonElement).disabled = true;
  if (attrs.onclick) node.addEventListener('click', attrs.onclick);
  node.append(...children);
  return node;
}
