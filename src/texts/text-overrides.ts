/**
 * Text overrides: the game's copy is rendered as plain strings, so any visible
 * text can be replaced at runtime without touching the source.
 *
 * Key   = the original string, whitespace-normalised ("Мы учились в одном классе…")
 * Value = the replacement string the site should show instead
 *
 * Resolution order (later wins):
 *   1. strings hard-coded in the components (the defaults)
 *   2. public/texts.json — shipped with the build, editable without a rebuild
 *   3. localStorage — whatever was edited in the hidden text editor
 *
 * A node remembers which key it came from, so React re-renders and route
 * changes never lose an edit, and deleting an override restores the default.
 */

export type TextOverrideMap = Record<string, string>;

const STORAGE_KEY = "ilyuha-texts-v1";
const SHIPPED_FILE = `${import.meta.env.BASE_URL}texts.json`;

type NodeRecord = { key: string; original: string };
const nodeRecords = new WeakMap<Text, NodeRecord>();

/** Collapse JSX/HTML whitespace so a text node matches its source string. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitize(map: TextOverrideMap): TextOverrideMap {
  const out: TextOverrideMap = {};
  for (const [rawKey, rawValue] of Object.entries(map)) {
    if (typeof rawKey !== "string" || typeof rawValue !== "string") continue;
    const key = normalizeText(rawKey);
    const value = normalizeText(rawValue);
    if (!key || !value || value === key) continue;
    out[key] = value;
  }
  return out;
}

export function isTextOverrideMap(value: unknown): value is TextOverrideMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((entry) => typeof entry === "string");
}

export function readLocalOverrides(): TextOverrideMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isTextOverrideMap(parsed) ? sanitize(parsed) : {};
  } catch {
    return {};
  }
}

export function writeLocalOverrides(map: TextOverrideMap): void {
  try {
    const clean = sanitize(map);
    if (Object.keys(clean).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* private mode / quota — editing still works for this session */
  }
}

/** Optional file shipped next to index.html: lets text edits reach the recipient. */
export async function readShippedOverrides(): Promise<TextOverrideMap> {
  try {
    const res = await fetch(SHIPPED_FILE, { cache: "no-store" });
    if (!res.ok) return {};
    const type = res.headers.get("content-type") ?? "";
    if (!/json/i.test(type)) return {};
    const parsed: unknown = await res.json();
    return isTextOverrideMap(parsed) ? sanitize(parsed) : {};
  } catch {
    return {};
  }
}

function buildReverse(map: TextOverrideMap): Map<string, string> {
  const reverse = new Map<string, string>();
  for (const [key, value] of Object.entries(map)) {
    if (!reverse.has(value)) reverse.set(value, key);
  }
  return reverse;
}

/** Swap original strings for their overrides inside `root`. Returns how many nodes changed. */
export function applyOverrides(root: Node, map: TextOverrideMap): number {
  const reverse = buildReverse(map);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let changed = 0;

  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    const node = current as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.closest("[data-texts-ui]")) continue;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") continue;

    const raw = node.nodeValue ?? "";
    const visible = normalizeText(raw);
    if (!visible) continue;

    const record = nodeRecords.get(node);
    const key = record?.key ?? (map[visible] !== undefined ? visible : reverse.get(visible));

    if (!key) {
      nodeRecords.delete(node);
      continue;
    }
    if (!record) nodeRecords.set(node, { key, original: raw });

    const next = map[key];
    if (next === undefined) {
      // Override was deleted: put the default back.
      const original = nodeRecords.get(node)?.original;
      if (original !== undefined && node.nodeValue !== original) {
        node.nodeValue = original;
        changed += 1;
      }
      continue;
    }
    if (visible === next) continue;

    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const tail = raw.match(/\s*$/)?.[0] ?? "";
    const value = `${lead}${next}${tail}`;
    if (node.nodeValue !== value) {
      node.nodeValue = value;
      changed += 1;
    }
  }

  return changed;
}

export type EditableText = {
  key: string;
  /** The text as authored in the components — the stable identity of the row. */
  original: string;
  /** What is on screen right now (override or original). */
  current: string;
  /** Nearest block, used as a human hint in the editor. */
  context: string;
};

const CONTEXT_SELECTOR =
  ".letter, .player, .panel, .chapter__head, .reaction, .award-panel, .journal, .changelog, .sheet, .hud, .site-foot, .boot__crt, .night__crt, .final, section, header, footer, main";

function describeContext(parent: HTMLElement): string {
  const block = parent.closest<HTMLElement>(CONTEXT_SELECTOR);
  if (!block) return parent.tagName.toLowerCase();
  const className = typeof block.className === "string" ? block.className : "";
  const marker = className
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^is-/, ""))
    .slice(0, 2)
    .join(" ");
  return marker ? `${block.tagName.toLowerCase()} · ${marker}` : block.tagName.toLowerCase();
}

/** Everything the reader can currently see, with the keys the editor needs. */
export function collectEditableTexts(root: HTMLElement, map: TextOverrideMap): EditableText[] {
  const reverse = buildReverse(map);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<string>();
  const items: EditableText[] = [];

  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    const node = current as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest("[data-texts-ui]")) continue;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") continue;

    const visible = normalizeText(node.nodeValue ?? "");
    if (!visible) continue;

    const record = nodeRecords.get(node);
    const key = record?.key ?? (map[visible] !== undefined ? visible : reverse.get(visible) ?? visible);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!nodeRecords.has(node)) nodeRecords.set(node, { key, original: node.nodeValue ?? "" });

    items.push({
      key,
      original: nodeRecords.get(node)?.original ?? visible,
      current: map[key] ?? key,
      context: describeContext(parent),
    });
  }

  return items;
}