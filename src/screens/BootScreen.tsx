import { useEffect, useRef, useState } from "react";
import { ART } from "../game/art";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

const BOOT_LINES = [
  "Проверка жёсткого диска: жив.",
  "Поиск сохранения „Детство“: найдено.",
  "Проверка взрослости: в процессе.",
  "Илюха обнаружен. 32 года. Всё ещё свой.",
];

const LINE_DELAY = 620;

export function BootScreen({ state, dispatch, go }: ScreenProps) {
  const { unlock, sfx, settings } = useAudio();
  const returning = state.reached.includes("profile");
  const [phase, setPhase] = useState<"idle" | "booting" | "ready">(returning ? "ready" : "idle");
  const [shown, setShown] = useState(returning ? BOOT_LINES.length : 0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (phase !== "booting") return;
    const tick = (i: number) => {
      if (i > 0) sfx("type");
      setShown(i);
      if (i < BOOT_LINES.length) {
        timers.current.push(window.setTimeout(() => tick(i + 1), LINE_DELAY));
      } else {
        timers.current.push(
          window.setTimeout(() => {
            setPhase("ready");
            dispatch({ type: "award", id: "power-on" });
            dispatch({ type: "reach", screen: "profile" });
            sfx("confirm");
          }, 520),
        );
      }
    };
    tick(1);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    await unlock();
    sfx("power");
    if (returning) {
      setShown(BOOT_LINES.length);
      setPhase("ready");
      return;
    }
    dispatch({ type: "award", id: "power-on" });
    setPhase("booting");
  };

  const percent = Math.round((shown / BOOT_LINES.length) * 100);
  const ready = phase === "ready";

  return (
    <ChapterLayout
      className="chapter--boot"
      head={
        <ChapterHeader
          chapter="01"
          kicker="СИСТЕМА · ЗАПУСК"
          title="ИЛЮХА.EXE"
          lead="Патч 32.0 — вроде стабильная сборка."
        />
      }
      nav={
        <div className="nav-row">
          <span className="nav-row__note">
            {phase === "idle"
              ? "Звук включится после нажатия — так требуют браузеры."
              : ready
                ? "Проверка завершена. Можно входить."
                : "Идёт проверка системы…"}
          </span>
          {ready ? (
            <PixelButton onClick={() => go("profile")} className="btn--wide">
              Открыть профиль персонажа →
            </PixelButton>
          ) : (
            <PixelButton
              onClick={start}
              disabled={phase === "booting"}
              className="btn--wide"
              icon={phase === "booting" ? undefined : "disk"}
            >
              {phase === "booting" ? "Проверка…" : returning ? "Продолжить" : "Запустить систему"}
            </PixelButton>
          )}
        </div>
      }
    >
      <div className="boot">
        <div className="boot__bg" aria-hidden="true">
          <ArtImage asset={ART.nightRetro} priority dim className="art--bleed" />
        </div>

        <div className="boot__crt">
          <div className="boot__bar">
            <span className="boot__dot" aria-hidden="true" />
            <span>ILYUHA-OS 32.0</span>
            <span className="boot__bar-right">{ready ? "ГОТОВ" : "ПРОВЕРКА"}</span>
          </div>

          <div className="boot__body">
            <ol className="boot__log" aria-live="polite">
              {BOOT_LINES.slice(0, shown).map((line, i) => (
                <li key={line} className={i === BOOT_LINES.length - 1 ? "is-key" : ""}>
                  <span className="boot__prompt" aria-hidden="true">
                    &gt;
                  </span>
                  <span>{line}</span>
                </li>
              ))}
              {phase === "booting" ? <li className="boot__cursor" aria-hidden="true">▌</li> : null}
            </ol>

            <div className="boot__meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Проверка системы">
              <span style={{ width: `${phase === "idle" ? 0 : percent}%` }} />
            </div>

            <div className="boot__title">
              <span className="boot__title-main">ИЛЮХА.EXE</span>
              <span className="boot__title-sub">Патч 32.0 — вроде стабильная сборка</span>
            </div>

            <div className="boot__meta">
              <span>
                <PixelIcon name="disk" size={12} /> Сборка 32.0.1
              </span>
              <span>
                <PixelIcon name={settings.musicOn ? "sound" : "mute"} size={12} />
                {settings.musicOn ? " Музыка включена" : " Музыка выключена"}
              </span>
              <span className="boot__meta-dim">для одного человека</span>
            </div>
          </div>
        </div>

        {phase === "idle" ? (
          <button type="button" className="boot__start" onClick={start}>
            <span className="boot__start-key">PRESS START</span>
            <span className="boot__start-hint">нажми, чтобы загрузиться</span>
          </button>
        ) : null}
      </div>
    </ChapterLayout>
  );
}