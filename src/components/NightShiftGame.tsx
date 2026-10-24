import { useEffect, useRef, useState } from "react";
import { NIGHT_SHIFT } from "../game/content";
import type { NightResult } from "../game/state";
import { useAudio } from "../audio/AudioProvider";
import { PixelButton } from "./Ui";

/**
 * Мини-игра «Ещё пять минут» — одна ночная смена на молочном заводе.
 *
 * Задача: до 07:00 пройти один уровень. Уровень качается сам, пока на
 * смене тихо; каждая заявка на погрузку останавливает прогресс, пока её
 * не разберёшь. Кнопка «Ещё пять минут» ускоряет уровень — но у неё
 * есть откат, как и у совести.
 */

type Phase = "intro" | "run" | "over";

type Task = {
  id: number;
  vehicle: string;
  vehicleLog: string;
  product: string;
  productLog: string;
  spawned: number;
  deadline: number;
  state: "live" | "ok" | "missed";
  /** Момент, когда карточку закрыли (клик или просрочка), для анимации. */
  settledAt: number | null;
};

type LogEntry = { id: number; time: string; text: string; tone: "ok" | "bad" | "hi" };

type World = {
  phase: Phase;
  elapsed: number;
  level: number;
  tasks: Task[];
  shipped: number;
  missed: number;
  boostActiveUntil: number;
  boostReadyAt: number;
  nextSpawn: number;
  levelDone: boolean;
  log: LogEntry[];
  nextId: number;
};

const SPEED = (() => {
  try {
    return window.localStorage.getItem("ilyuha-night-fast") === "1" ? 5 : 1;
  } catch {
    return 1;
  }
})();

const DT = 0.1 * SPEED;

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

/** Игровое время 23:00 → 07:00. */
function clockAt(elapsed: number): string {
  const minutes = Math.floor((Math.min(elapsed, NIGHT_SHIFT.duration) / NIGHT_SHIFT.duration) * NIGHT_SHIFT.minutes);
  const total = 23 * 60 + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function makeWorld(): World {
  return {
    phase: "intro",
    elapsed: 0,
    level: 0,
    tasks: [],
    shipped: 0,
    missed: 0,
    boostActiveUntil: -1,
    boostReadyAt: 0,
    nextSpawn: 1.4,
    levelDone: false,
    log: [],
    nextId: 1,
  };
}

function pushLog(world: World, text: string, tone: LogEntry["tone"] = "hi") {
  world.log = [{ id: world.nextId++, time: clockAt(world.elapsed), text, tone }, ...world.log].slice(0, 14);
}

export function NightShiftGame({
  savedResult,
  onFinish,
}: {
  savedResult: NightResult | null;
  onFinish: (result: NightResult) => void;
}) {
  const { sfx } = useAudio();
  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = makeWorld();
  const world = worldRef.current;
  const [phase, setPhase] = useState<Phase>("intro");
  const [, forceRender] = useState(0);
  const render = () => forceRender((n) => n + 1);

  const step = () => {
    const w = worldRef.current!;
    w.elapsed = Math.min(w.elapsed + DT, NIGHT_SHIFT.duration);
    const t = w.elapsed / NIGHT_SHIFT.duration;

    // Заявки: интервалы и таймауты ужесточаются к утру.
    const spawnGap = lerp(6, 2.6, t);
    const deadline = lerp(5.2, 3.6, t);
    if (w.elapsed >= w.nextSpawn && w.tasks.filter((task) => task.state === "live").length < 3) {
      const vehicle = NIGHT_SHIFT.vehicles[Math.floor(Math.random() * NIGHT_SHIFT.vehicles.length)];
      const product = NIGHT_SHIFT.products[Math.floor(Math.random() * NIGHT_SHIFT.products.length)];
      w.tasks.push({
        id: w.nextId++,
        vehicle,
        vehicleLog: vehicle === "ГАЗЕЛЬ" ? "газель" : "фура",
        product: product.label,
        productLog: product.log,
        spawned: w.elapsed,
        deadline,
        state: "live",
        settledAt: null,
      });
      pushLog(w, `${vehicle === "ГАЗЕЛЬ" ? "газель" : "фура"} ждёт ${product.log}.`);
      w.nextSpawn = w.elapsed + spawnGap;
    }

    // Просроченные заявки.
    for (const task of w.tasks) {
      if (task.state !== "live") continue;
      if (w.elapsed > task.spawned + task.deadline) {
        task.state = "missed";
        task.settledAt = w.elapsed;
        w.missed += 1;
        sfx("error");
        pushLog(w, "не успели. встало.", "bad");
        shake();
      }
    }

    // Уровень растёт, только когда нет живых заявок.
    if (!w.levelDone && w.tasks.every((task) => task.state !== "live")) {
      const boosted = w.elapsed < w.boostActiveUntil;
      w.level = Math.min(100, w.level + 0.7 * (boosted ? 2.5 : 1) * DT);
      if (w.level >= 100) {
        w.levelDone = true;
        w.level = 100;
        sfx("achieve");
        pushLog(w, "уровень пройден. осталось дожить смену.", "ok");
      }
    }

    // Убираем отработанные карточки — чуть позже, чтобы анимация успела сыграть.
    w.tasks = w.tasks.filter(
      (task) => task.state === "live" || task.settledAt === null || w.elapsed < task.settledAt + 0.5,
    );

    if (w.elapsed >= NIGHT_SHIFT.duration && w.phase === "run") {
      w.phase = "over";
      pushLog(w, "семь утра. смена сдана.", "ok");
      sfx("select");
      setPhase("over");
      onFinish({ shipped: w.shipped, missed: w.missed, level: Math.round(w.level) });
    }
    render();
  };

  useEffect(() => {
    if (phase !== "run") return;
    const timer = window.setInterval(step, 100);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const shake = () => {
    const crt = document.querySelector(".night__crt");
    if (!crt) return;
    crt.classList.remove("is-shake");
    // reflow, чтобы анимация перезапустилась
    void (crt as HTMLElement).offsetWidth;
    crt.classList.add("is-shake");
  };

  const start = (fresh: boolean) => {
    const w = worldRef.current!;
    if (fresh) Object.assign(w, makeWorld());
    w.phase = "run";
    w.log = [];
    pushLog(w, "смена началась. уровень запущен.");
    sfx("select");
    setPhase("run");
    render();
  };

  const resolve = (id: number) => {
    const w = worldRef.current!;
    const task = w.tasks.find((item) => item.id === id);
    if (!task || task.state !== "live") return;
    task.state = "ok";
    task.settledAt = w.elapsed;
    w.shipped += 1;
    sfx("confirm");
    pushLog(w, "отгружено. снова тихо.", "ok");
    render();
  };

  const boost = () => {
    const w = worldRef.current!;
    if (w.phase !== "run" || w.elapsed < w.boostReadyAt || w.elapsed < w.boostActiveUntil) return;
    w.boostActiveUntil = w.elapsed + 8;
    w.boostReadyAt = w.elapsed + 20;
    sfx("buff");
    pushLog(w, "«ещё пять минут», сказал ты. цех не поверил.");
    render();
  };

  const boostReady = phase === "run" && world.elapsed >= world.boostReadyAt && world.elapsed >= world.boostActiveUntil;
  const clock = clockAt(world.elapsed);
  const levelNow = Math.round(world.level);

  const verdict =
    world.levelDone && world.missed === 0
      ? NIGHT_SHIFT.verdicts.perfect
      : world.levelDone
        ? NIGHT_SHIFT.verdicts.level
        : world.missed === 0
          ? NIGHT_SHIFT.verdicts.shift.replace("{level}", String(levelNow))
          : NIGHT_SHIFT.verdicts.nothing;

  return (
    <div className="night__stage">
      <div className={`night__crt ${phase === "over" ? "is-done" : ""}`}>
      <div className="night__top">
        <span className="night__clock" aria-label={`Время ${clock}`}>
          {clock}
        </span>
        <span className="night__counter">
          отгружено {world.shipped} · встало {world.missed}
        </span>
      </div>

      {phase === "intro" ? (
        <>
          <p className="night__text">«Ну что, ещё пять минут?»</p>
          <p className="night__note">
            До семи утра надо пройти один уровень. Пока на смене тихо, уровень идёт сам.
            Загорается заявка — разберись с ней, иначе молочка встанет. Смена начинается по кнопке.
          </p>
          <PixelButton
            variant="primary"
            className="btn--big"
            icon="gamepad"
            onClick={() => start(true)}
          >
            {savedResult !== null ? "Ещё смена" : "Начать смену"}
          </PixelButton>
          <p className="night__hint">Смена с 23:00 до 07:00. Пока всё тихо — уровень идёт сам.</p>
        </>
      ) : null}

      {phase === "run" ? (
        <>
          <div
            className={`night__bar ${world.levelDone ? "is-full" : ""} ${world.elapsed < world.boostActiveUntil ? "is-boost" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={levelNow}
            aria-label="Прогресс уровня"
          >
            <span className="night__bar-fill" style={{ width: `${levelNow}%` }} />
          </div>
          <span className="night__bar-label">
            {world.levelDone ? "уровень пройден" : `уровень · ${levelNow}%`}
          </span>

          <div className="night__tasks" aria-live="polite">
            {world.tasks.map((task) => {
              const left = Math.max(0, 1 - (world.elapsed - task.spawned) / task.deadline);
              return (
                <div key={task.id} className={`night__task is-${task.state}`}>
                  <span className="night__task-name">
                    {task.vehicle} · {task.product}
                  </span>
                  <span className="night__task-bar">
                    <span style={{ width: `${Math.round(left * 100)}%` }} />
                  </span>
                  {task.state === "live" ? (
                    <PixelButton onClick={() => resolve(task.id)}>Разобраться</PixelButton>
                  ) : (
                    <span className="night__task-mark">{task.state === "ok" ? "отгружено" : "встало"}</span>
                  )}
                </div>
              );
            })}
            {world.tasks.length === 0 ? (
              <p className="night__idle">тихо. уровень идёт сам.</p>
            ) : null}
          </div>

          <PixelButton
            variant="primary"
            className="btn--big night__boost"
            icon="gamepad"
            onClick={boost}
            disabled={!boostReady}
          >
            {boostReady ? "Ещё пять минут" : world.elapsed < world.boostActiveUntil ? "Идёт ускорение" : "Откат…"}
          </PixelButton>
          <p className="night__hint">
            «Ещё пять минут» — ускорение ×2,5 на восемь секунд. Откат двенадцать.
          </p>
        </>
      ) : null}

      {phase === "over" ? (
        <div className="night__verdict" role="status">
          <p className="night__tally">
            отгружено {world.shipped} · встало {world.missed} · уровень {levelNow}%
          </p>
          <p className="night__verdict-text">{verdict}</p>
          <PixelButton variant="primary" className="btn--big" icon="gamepad" onClick={() => start(true)}>
            Ещё смена
          </PixelButton>
        </div>
      ) : null}
      </div>

      <aside className="night__log" aria-label="Журнал смены">
        <span className="night__log-title">ЖУРНАЛ</span>
        <ol>
          {world.log.length === 0 ? (
            <li className="night__log-empty">
              <span className="night__log-time">—:—</span>
              <span className="night__log-text">смена ещё не началась</span>
            </li>
          ) : (
            world.log.map((entry) => (
              <li key={entry.id} className={entry.tone === "ok" ? "is-done" : entry.tone === "bad" ? "is-bad" : ""}>
                <span className="night__log-time">{entry.time}</span>
                <span className="night__log-text">{entry.text}</span>
                <span className="night__log-mark" aria-hidden="true">
                  {entry.tone === "ok" ? "✓" : entry.tone === "bad" ? "×" : "·"}
                </span>
              </li>
            ))
          )}
        </ol>
      </aside>
    </div>
  );
}