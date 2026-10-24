import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  applyOverrides,
  normalizeText,
  readLocalOverrides,
  readShippedOverrides,
  writeLocalOverrides,
  type TextOverrideMap,
} from "./text-overrides";

type TextsContextValue = {
  /** Edits made in this browser. */
  overrides: TextOverrideMap;
  /** Overrides shipped in public/texts.json. */
  shipped: TextOverrideMap;
  /** Effective map: shipped + local edits. */
  merged: TextOverrideMap;
  setText: (key: string, value: string) => void;
  removeText: (key: string) => void;
  reset: () => void;
  replaceAll: (map: TextOverrideMap) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
 };

const TextsContext = createContext<TextsContextValue | null>(null);

const SECRET_TAPS = 5;
const SECRET_WINDOW = 2500;

function opensViaUrl(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("admin")) return true;
    return window.location.hash.replace(/^#\/?/, "").toLowerCase() === "admin";
  } catch {
    return false;
  }
}

export function TextsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<TextOverrideMap>(() => readLocalOverrides());
  const [shipped, setShipped] = useState<TextOverrideMap>({});
  const [isOpen, setOpen] = useState(() => opensViaUrl());

  const merged = useMemo<TextOverrideMap>(() => ({ ...shipped, ...overrides }), [shipped, overrides]);
  const mergedRef = useRef(merged);
  mergedRef.current = merged;

  // Pull the optional texts.json that can be dropped next to index.html.
  useEffect(() => {
    let cancelled = false;
    void readShippedOverrides().then((map) => {
      if (!cancelled) setShipped(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Paint overrides before the first frame (no flash of the default copy) and
  // again whenever the map changes.
  useLayoutEffect(() => {
    applyOverrides(document.body, merged);
    const title = normalizeText(document.title);
    if (merged[title] !== undefined && document.title !== merged[title]) {
      document.title = merged[title];
    }
  }, [merged]);

  // React re-renders replace text nodes; re-apply on every DOM change.
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      applyOverrides(document.body, mergedRef.current);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(run);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // The app resets document.title on every screen change (it is not a body
  // text node, so the MutationObserver above never sees it) — re-apply.
  useEffect(() => {
    const id = window.setInterval(() => {
      const map = mergedRef.current;
      if (Object.keys(map).length === 0) return;
      const title = normalizeText(document.title);
      if (map[title] !== undefined && document.title !== map[title]) {
        document.title = map[title];
      }
    }, 1200);
    return () => window.clearInterval(id);
  }, []);

  const persist = useCallback((next: TextOverrideMap) => {
    setOverrides(next);
    writeLocalOverrides(next);
  }, []);

  const setText = useCallback(
    (key: string, value: string) => {
      setOverrides((current) => {
        const next = { ...current };
        if (!value.trim()) delete next[key];
        else next[key] = value;
        writeLocalOverrides(next);
        return next;
      });
    },
    [],
  );

  const removeText = useCallback((key: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[key];
      writeLocalOverrides(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => persist({}), [persist]);

  const replaceAll = useCallback(
    (map: TextOverrideMap) => {
      persist(map);
    },
    [persist],
  );

  // Hidden way in: ?admin / #admin, Ctrl+Alt+A, or five quick taps on the logo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey) return;
      if (event.code !== "KeyA" && event.key.toLowerCase() !== "a") return;
      event.preventDefault();
      setOpen((open) => !open);
    };

    let taps: number[] = [];
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".hud__logo")) return;
      const now = Date.now();
      taps = [...taps.filter((at) => now - at < SECRET_WINDOW), now];
      if (taps.length >= SECRET_TAPS) {
        taps = [];
        setOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const value = useMemo<TextsContextValue>(
    () => ({
      overrides,
      shipped,
      merged,
      setText,
      removeText,
      reset,
      replaceAll,
      isOpen,
      setOpen,
    }),
    [overrides, shipped, merged, setText, removeText, reset, replaceAll, isOpen],
  );

  return <TextsContext.Provider value={value}>{children}</TextsContext.Provider>;
}

export function useTexts(): TextsContextValue {
  const value = useContext(TextsContext);
  if (!value) throw new Error("useTexts must be used inside <TextsProvider>");
  return value;
}