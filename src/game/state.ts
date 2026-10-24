import {
  ACHIEVEMENTS,
  SCREENS,
  SCREEN_INDEX,
  type AchievementId,
  type SchoolChoiceId,
  type ScreenId,
  type WorkChoiceId,
} from "./content";

const STORAGE_KEY = "ilyuha-exe-patch32-v1";
const STATE_VERSION = 1;

/** Итог ночной смены из мини-игры «Ещё пять минут». */
export type NightResult = {
  /** Сколько заявок отгружено вовремя. */
  shipped: number;
  /** Сколько заявок пропущено — «встало». */
  missed: number;
  /** Прогресс игрового уровня, 0–100. */
  level: number;
};

export type GameState = {
  version: number;
  screen: ScreenId;
  reached: ScreenId[];
  visited: ScreenId[];
  schoolChoice: SchoolChoiceId | null;
  schoolTried: SchoolChoiceId[];
  workChoice: WorkChoiceId | null;
  workTried: WorkChoiceId[];
  night: NightResult | null;
  beerBuff: boolean;
  achievements: AchievementId[];
  trackPlayed: boolean;
  finished: boolean;
};

export type GameAction =
  | { type: "go"; screen: ScreenId }
  | { type: "reach"; screen: ScreenId }
  | { type: "award"; id: AchievementId }
  | { type: "school"; id: SchoolChoiceId }
  | { type: "work"; id: WorkChoiceId }
  | { type: "minigame-finish"; result: NightResult }
  | { type: "beer-buff" }
  | { type: "track-played" }
  | { type: "finish" }
  | { type: "reset" };

export const initialState: GameState = {
  version: STATE_VERSION,
  screen: "boot",
  reached: ["boot"],
  visited: ["boot"],
  schoolChoice: null,
  schoolTried: [],
  workChoice: null,
  workTried: [],
  night: null,
  beerBuff: false,
  achievements: [],
  trackPlayed: false,
  finished: false,
};

function award(state: GameState, ...ids: AchievementId[]): AchievementId[] {
  const next = new Set(state.achievements);
  for (const id of ids) if (id in ACHIEVEMENTS) next.add(id);
  return [...next];
}

function unlock(state: GameState, screen: ScreenId): ScreenId[] {
  return state.reached.includes(screen) ? state.reached : [...state.reached, screen];
}

export function canGoTo(state: GameState, screen: ScreenId): boolean {
  return state.reached.includes(screen);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "go": {
      if (!canGoTo(state, action.screen)) return state;
      const visited = state.visited.includes(action.screen)
        ? state.visited
        : [...state.visited, action.screen];
      return { ...state, screen: action.screen, visited };
    }

    case "reach":
      return { ...state, reached: unlock(state, action.screen) };

    case "award":
      return { ...state, achievements: award(state, action.id) };

    case "school": {
      const tried = state.schoolTried.includes(action.id)
        ? state.schoolTried
        : [...state.schoolTried, action.id];
      const achievements = award(
        state,
        action.id === "good" ? "class-good" : action.id === "trouble" ? "class-clown" : "class-games",
      );
      return {
        ...state,
        schoolChoice: action.id,
        schoolTried: tried,
        achievements: tried.length === 3 ? award({ ...state, achievements }, "class-all") : achievements,
        reached: unlock(state, "minigame"),
      };
    }

    case "minigame-finish": {
      const first = state.night === null;
      return {
        ...state,
        night: action.result,
        achievements: first ? award(state, "save-childhood") : state.achievements,
        reached: first ? unlock(state, "family") : state.reached,
      };
    }

    case "work": {
      const tried = state.workTried.includes(action.id)
        ? state.workTried
        : [...state.workTried, action.id];
      const achievements = award(state, "shift-senior");
      return {
        ...state,
        workChoice: action.id,
        workTried: tried,
        achievements: tried.length === 3 ? award({ ...state, achievements }, "shift-all") : achievements,
        reached: unlock(state, "patch"),
      };
    }

    case "beer-buff": {
      if (state.beerBuff) return state;
      return {
        ...state,
        beerBuff: true,
        achievements: award(state, "beer-buff"),
        reached: unlock(state, "final"),
      };
    }

    case "track-played": {
      if (state.trackPlayed) return state;
      return { ...state, trackPlayed: true, achievements: award(state, "soundtrack") };
    }

    case "finish": {
      if (state.finished) return state;
      return { ...state, finished: true, achievements: award(state, "old-save") };
    }

    case "reset":
      return { ...initialState };

    default:
      return state;
  }
}

/** Achievement ids that were just added, for the toast + sound. */
export function diffAchievements(prev: GameState, next: GameState): AchievementId[] {
  if (prev.achievements === next.achievements) return [];
  const before = new Set(prev.achievements);
  return next.achievements.filter((id) => !before.has(id));
}

function isScreenId(value: unknown): value is ScreenId {
  return typeof value === "string" && SCREENS.some((s) => s.id === value);
}

export function loadState(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== STATE_VERSION) return initialState;

    const screen = isScreenId(parsed.screen) ? parsed.screen : "boot";
    const reached: ScreenId[] = Array.isArray(parsed.reached)
      ? parsed.reached.filter(isScreenId)
      : ["boot"];
    if (!reached.includes("boot")) reached.unshift("boot");
    if (!reached.includes(screen)) reached.push(screen);

    const achievements = Array.isArray(parsed.achievements)
      ? (parsed.achievements.filter((a): a is AchievementId => typeof a === "string" && a in ACHIEVEMENTS))
      : [];

    return {
      ...initialState,
      screen,
      reached: [...new Set(reached)].sort((a, b) => SCREEN_INDEX[a] - SCREEN_INDEX[b]),
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter(isScreenId) : [screen],
      schoolChoice: parsed.schoolChoice ?? null,
      schoolTried: Array.isArray(parsed.schoolTried) ? parsed.schoolTried : [],
      workChoice: parsed.workChoice ?? null,
      workTried: Array.isArray(parsed.workTried) ? parsed.workTried : [],
      night:
        parsed.night && typeof parsed.night === "object" &&
        typeof parsed.night.shipped === "number" &&
        typeof parsed.night.missed === "number" &&
        typeof parsed.night.level === "number"
          ? {
              shipped: Math.max(0, Math.round(parsed.night.shipped)),
              missed: Math.max(0, Math.round(parsed.night.missed)),
              level: Math.min(100, Math.max(0, Math.round(parsed.night.level))),
            }
          : null,
      beerBuff: Boolean(parsed.beerBuff),
      achievements,
      trackPlayed: Boolean(parsed.trackPlayed),
      finished: Boolean(parsed.finished),
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: GameState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — the game still works without saving */
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}