import { useEffect, useRef } from "react";
import { ACHIEVEMENTS, SCREENS, SCREEN_INDEX, type ScreenId } from "../game/content";
import type { GameState } from "../game/state";
import { useAudio } from "../audio/AudioProvider";
import { PixelIcon } from "./PixelIcon";
import { clearState } from "../game/state";

export function Hud({
  state,
  onNavigate,
  onOpenSettings,
}: {
  state: GameState;
  onNavigate: (screen: ScreenId) => void;
  onOpenSettings: () => void;
}) {
  const { settings, setMusicEnabled, sfx } = useAudio();
  const current = SCREEN_INDEX[state.screen];
  const earned = state.achievements.length;

  return (
    <header className="hud">
      <div className="hud__brand">
        <span className="hud__logo">ИЛЮХА.EXE</span>
        <span className="hud__patch">патч 32.0</span>
      </div>

      <nav className="hud__map" aria-label="Карта глав">
        {SCREENS.map((screen, index) => {
          const reached = state.reached.includes(screen.id);
          const active = state.screen === screen.id;
          return (
            <button
              key={screen.id}
              type="button"
              className={`hud__pip ${active ? "is-active" : ""} ${reached ? "is-reached" : ""}`}
              onClick={() => {
                if (!reached || active) return;
                sfx("click");
                onNavigate(screen.id);
              }}
              disabled={!reached}
              aria-current={active ? "step" : undefined}
              aria-label={`${screen.chapter}. ${screen.title}${reached ? "" : " — ещё не открыто"}`}
              title={reached ? `${screen.chapter}. ${screen.title}` : "Ещё не открыто"}
            >
              <span className="hud__pip-no">{index + 1}</span>
            </button>
          );
        })}
      </nav>

      <div className="hud__tools">
        <span className="hud__progress" title="Прогресс">
          {String(current + 1).padStart(2, "0")}/{SCREENS.length}
        </span>
        <button
          type="button"
          className="hud__icon"
          onClick={() => {
            const next = !settings.musicOn;
            setMusicEnabled(next);
            sfx("select");
          }}
          aria-pressed={settings.musicOn}
          aria-label={settings.musicOn ? "Выключить музыку" : "Включить музыку"}
          title={settings.musicOn ? "Музыка включена" : "Музыка выключена"}
        >
          <PixelIcon name={settings.musicOn ? "sound" : "mute"} size={16} />
        </button>
        <button
          type="button"
          className="hud__icon hud__icon--ach"
          onClick={() => {
            sfx("click");
            onOpenSettings();
          }}
          aria-label={`Настройки и достижения. Открыто ${earned} из ${Object.keys(ACHIEVEMENTS).length}`}
          title="Настройки и достижения"
        >
          <PixelIcon name="gear" size={16} />
          <span className="hud__ach-count">
            {String(earned).padStart(2, "0")}
          </span>
        </button>
      </div>
    </header>
  );
}

export function SettingsDialog({
  open,
  onClose,
  state,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onReset: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const {
    settings,
    unlocked,
    unavailable,
    setMusicEnabled,
    setSfxEnabled,
    setMusicVolume,
    setSfxVolume,
    sfx,
  } = useAudio();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-label="Настройки игры">
      <div className="sheet__inner">
        <header className="sheet__head">
          <h2>Настройки</h2>
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => {
              onClose();
            }}
            aria-label="Закрыть настройки"
          >
            <PixelIcon name="close" size={14} />
          </button>
        </header>

        <section className="sheet__section">
          <h3>Звук</h3>
          {unavailable ? (
            <p className="sheet__note">
              Браузер не поддерживает Web Audio — музыка и звуки недоступны.
            </p>
          ) : !unlocked ? (
            <p className="sheet__note">
              Аудио включится после первого нажатия кнопки в игре — так требуют браузеры.
            </p>
          ) : null}

          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.musicOn}
              onChange={(e) => {
                setMusicEnabled(e.target.checked);
                sfx("click");
              }}
            />
            <span className="toggle__box" aria-hidden="true" />
            <span className="toggle__text">Фоновая музыка</span>
          </label>
          <label className="slider">
            <span>Громкость музыки</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              aria-label="Громкость музыки"
            />
            <span className="slider__value">{Math.round(settings.musicVolume * 100)}</span>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.sfxOn}
              onChange={(e) => {
                setSfxEnabled(e.target.checked);
                sfx("select");
              }}
            />
            <span className="toggle__box" aria-hidden="true" />
            <span className="toggle__text">Звуковые эффекты</span>
          </label>
          <label className="slider">
            <span>Громкость эффектов</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              aria-label="Громкость звуковых эффектов"
            />
            <span className="slider__value">{Math.round(settings.sfxVolume * 100)}</span>
          </label>
        </section>

        <section className="sheet__section">
          <h3>
            Достижения{" "}
            <span className="sheet__count">
              {state.achievements.length} / {Object.keys(ACHIEVEMENTS).length}
            </span>
          </h3>
          <ul className="ach-list">
            {Object.values(ACHIEVEMENTS).map((ach) => {
              const owned = state.achievements.includes(ach.id);
              return (
                <li key={ach.id} className={`ach-list__item ${owned ? "is-owned" : ""}`}>
                  <span className="ach-list__icon" aria-hidden="true">
                    <PixelIcon name={owned ? ach.icon : "lock"} size={14} />
                  </span>
                  <span className="ach-list__body">
                    <strong>{owned ? ach.title : "Заблокировано"}</strong>
                    <em>{owned ? ach.text : "Ещё не открыто в этой сборке."}</em>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="sheet__section">
          <h3>Прохождение</h3>
          <p className="sheet__note">
            Прогресс сохраняется в этом браузере. Сброс вернёт игру к экрану запуска.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (window.confirm("Сбросить прохождение и начать заново?")) {
                clearState();
                onReset();
              }
            }}
          >
            <PixelIcon name="reset" size={14} />
            <span className="btn__label">Начать заново</span>
          </button>
        </section>

        <footer className="sheet__foot">
          <p>
            Иллюстрации из папки <code>assets/</code>. Музыка: чиптюн на Web&nbsp;Audio
            и финальный трек. Шрифты Pixelify&nbsp;Sans, Press&nbsp;Start&nbsp;2P
            и IBM&nbsp;Plex&nbsp;Mono, по OFL.
          </p>
        </footer>
      </div>
    </dialog>
  );
}

export function AchievementToasts({
  toasts,
  onDismiss,
}: {
  toasts: { id: string; title: string; text: string; icon: React.ComponentProps<typeof PixelIcon>["name"] }[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) => window.setTimeout(() => onDismiss(toast.id), 5200));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, onDismiss]);

  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span className="toast__icon" aria-hidden="true">
            <PixelIcon name={toast.icon} size={18} />
          </span>
          <span className="toast__body">
            <span className="toast__kicker">Достижение открыто</span>
            <strong>{toast.title}</strong>
            <span className="toast__text">{toast.text}</span>
          </span>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Скрыть уведомление"
          >
            <PixelIcon name="close" size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}