import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ComponentType } from "react";
import { ACHIEVEMENTS, SCREENS, type ScreenId } from "./game/content";
import { gameReducer, initialState, loadState, saveState } from "./game/state";
import type { ScreenProps } from "./screens/types";
import { BootScreen } from "./screens/BootScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SchoolScreen } from "./screens/SchoolScreen";
import { MinigameScreen } from "./screens/MinigameScreen";
import { FamilyScreen } from "./screens/FamilyScreen";
import { WorkScreen } from "./screens/WorkScreen";
import { PatchScreen } from "./screens/PatchScreen";
import { FinalScreen } from "./screens/FinalScreen";
import { AchievementToasts, Hud, SettingsDialog } from "./components/Hud";
import type { IconName } from "./components/PixelIcon";
import { useAudio } from "./audio/AudioProvider";

const SCREEN_COMPONENTS: Record<ScreenId, ComponentType<ScreenProps>> = {
  boot: BootScreen,
  profile: ProfileScreen,
  school: SchoolScreen,
  minigame: MinigameScreen,
  family: FamilyScreen,
  work: WorkScreen,
  patch: PatchScreen,
  final: FinalScreen,
};

type Toast = {
  id: string;
  title: string;
  text: string;
  icon: IconName;
};

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialState, () => loadState());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevAchievements = useRef(state.achievements);
  const { sfx, unlock, unlocked } = useAudio();

  const go = useCallback(
    (screen: ScreenId) => {
      dispatch({ type: "go", screen });
    },
    [dispatch],
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const meta = SCREENS.find((s) => s.id === state.screen);
    document.title = meta ? `ИЛЮХА.EXE — ${meta.title}` : "ИЛЮХА.EXE";
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [state.screen]);

  // Achievements → toast + sound. Fires only for genuinely new ids.
  useEffect(() => {
    const before = new Set(prevAchievements.current);
    prevAchievements.current = state.achievements;
    const added = state.achievements.filter((id) => !before.has(id));
    if (!added.length) return;
    const now = Date.now();
    setToasts((current) => [
      ...current,
      ...added.map((id, i) => ({
        id: `${id}-${now}-${i}`,
        title: ACHIEVEMENTS[id].title,
        text: ACHIEVEMENTS[id].text,
        icon: ACHIEVEMENTS[id].icon,
      })),
    ]);
    sfx("achieve");
  }, [state.achievements, sfx]);

  // Any real interaction unlocks audio — matters when a saved game reloads
  // straight into chapter 4 and the boot screen is never shown again.
  useEffect(() => {
    if (unlocked) return;
    const onGesture = () => {
      void unlock();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [unlocked, unlock]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const Screen = useMemo(() => SCREEN_COMPONENTS[state.screen], [state.screen]);


  return (
    <div className="app">
      <div className="crt" aria-hidden="true" />
      <a className="skip-link" href="#stage">
        Перейти к главе
      </a>

      <Hud state={state} onNavigate={go} onOpenSettings={() => setSettingsOpen(true)} />

      <main id="stage" className="stage" tabIndex={-1}>
        <div key={state.screen} className="stage__inner">
          <Screen state={state} dispatch={dispatch} go={go} />
        </div>
      </main>

      <footer className="site-foot">
        <span>ИЛЮХА.EXE · патч 32.0 · сборка для одного человека</span>
        <span className="site-foot__dim">
          Прогресс сохраняется в браузере. Звук включается после первого нажатия.
        </span>
      </footer>

      <AchievementToasts toasts={toasts} onDismiss={dismissToast} />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onReset={() => {
          dispatch({ type: "reset" });
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}