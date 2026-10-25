import { useEffect, useRef, useState } from "react";
import { STACKER } from "../game/content";
import type { StackResult } from "../game/state";
import { useAudio } from "../audio/AudioProvider";
import { PixelButton } from "./Ui";

/**
 * Мини-игра «Погрузи фуру» — стакер на ночном складе.
 * Ящик ездит туда-сюда, тап — и он падает на стопку. Свесился —
 * отваливается. Три ящика мимо — фура ушла пустой.
 * Заточено под телефон: всё поле — большая кнопка, скролл заблокирован.
 */

type BoxT = { x: number; w: number; p: string };
type Phase = "intro" | "run" | "over" | "failed";
type Fall = { id: number; x: number; w: number; p: string; until: number };

type World = {
  stack: BoxT[];
  cur: { x: number; dir: 1 | -1; w: number };
  lives: number;
  lost: number;
  combo: number;
  ms: number;
  falls: Fall[];
  flash: { kind: "perfect" | "ok" | "miss"; seq: number } | null;
};

const GOAL = STACKER.goal;
/** Кузов фуры: первый ящик ложится на него. */
const BED = { x: 20, w: 60 };
/** Допуск идеального броска, % ширины поля. */
const PERFECT = 1.2;
const BOX_H = 28;
const VISIBLE = 11;

let fallId = 0;

const AUTO = (() => {
  try {
    return window.localStorage.getItem("ilyuha-stack-auto") === "1";
  } catch {
    return false;
  }
})();

const product = (i: number) => STACKER.products[i % STACKER.products.length];
const speedFor = (n: number) =>
  Math.min(STACKER.maxSpeed, STACKER.baseSpeed + n * STACKER.speedStep);

function makeWorld(): World {
  return {
    stack: [],
    cur: { x: 0, dir: 1, w: 44 },
    lives: STACKER.lives,
    lost: 0,
    combo: 0,
    ms: 0,
    falls: [],
    flash: null,
  };
}

const fmtTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function StackerGame({
  savedResult,
  onFinish,
}: {
  savedResult: StackResult | null;
  onFinish: (result: StackResult) => void;
}) {
  const { sfx } = useAudio();
  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = makeWorld();
  const phaseRef = useRef<Phase>("intro");
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhaseState] = useState<Phase>("intro");
  const [auto, setAuto] = useState(AUTO);
  const autoRef = useRef(AUTO);
  autoRef.current = auto;
  const [, setTick] = useState(0);
  const render = () => setTick((n) => n + 1);
  const setPh = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const drop = () => {
    const w = worldRef.current!;
    if (phaseRef.current !== "run") return;
    const top = w.stack[w.stack.length - 1];
    const tx = top ? top.x : BED.x;
    const tw = top ? top.w : BED.w;
    const left = Math.max(w.cur.x, tx);
    const right = Math.min(w.cur.x + w.cur.w, tx + tw);
    const overlap = right - left;
    const p = product(w.stack.length);

    if (overlap <= 0.4) {
      // Мимо: ящик падает рядом с фурой.
      w.lives -= 1;
      w.lost += 1;
      w.combo = 0;
      w.falls.push({ id: ++fallId, x: w.cur.x, w: w.cur.w, p, until: w.ms + 750 });
      w.flash = { kind: "miss", seq: w.ms };
      sfx("error");
      const el = fieldRef.current;
      if (el) {
        el.classList.remove("is-shake");
        void el.offsetWidth;
        el.classList.add("is-shake");
      }
      if (w.lives <= 0) {
        sfx("deny");
        setPh("failed");
      } else {
        w.cur = { x: w.cur.dir > 0 ? 0 : 100 - w.cur.w, dir: w.cur.dir, w: w.cur.w };
      }
      render();
      return;
    }

    const offset = w.cur.x - tx;
    if (Math.abs(offset) <= PERFECT) {
      // Ровно: сnap на стопку без потерь, серия растёт.
      w.stack.push({ x: tx, w: tw, p });
      w.combo += 1;
      w.flash = { kind: "perfect", seq: w.ms };
      sfx(w.combo >= 3 ? "buff" : "confirm");
    } else {
      // Свесился: край отваливается.
      w.stack.push({ x: left, w: overlap, p });
      w.combo = 0;
      w.flash = { kind: "ok", seq: w.ms };
      const fx = offset > 0 ? right : w.cur.x;
      w.falls.push({ id: ++fallId, x: fx, w: w.cur.w - overlap, p, until: w.ms + 750 });
      sfx("confirm");
    }

    if (w.stack.length >= GOAL) {
      sfx("achieve");
      setPh("over");
      onFinish({ boxes: w.stack.length, lost: w.lost, seconds: Math.round(w.ms / 1000) });
    } else {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      w.cur = { x: dir > 0 ? 0 : 100 - w.stack[w.stack.length - 1].w, dir, w: w.stack[w.stack.length - 1].w };
    }
    render();
  };

  // Игровой цикл: каретка ездит, автоигра (тесты) бросает в идеальный момент.
  useEffect(() => {
    if (phase !== "run") return;
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const w = worldRef.current!;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      w.ms += dt * 1000;
      const sp = speedFor(w.stack.length);
      w.cur.x += w.cur.dir * sp * dt;
      if (w.cur.x <= 0) {
        w.cur.x = 0;
        w.cur.dir = 1;
      }
      if (w.cur.x >= 100 - w.cur.w) {
        w.cur.x = 100 - w.cur.w;
        w.cur.dir = -1;
      }
      if (autoRef.current) {
        const top = w.stack[w.stack.length - 1];
        const tx = top ? top.x : BED.x;
        const tw = top ? top.w : BED.w;
        const d = w.cur.x + w.cur.w / 2 - (tx + tw / 2);
        if (Math.abs(d) <= Math.max(0.4, sp * dt * 0.6)) {
          drop();
          raf = requestAnimationFrame(frame);
          return;
        }
      }
      w.falls = w.falls.filter((f) => f.until > w.ms);
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      manualDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = (autoMode = autoRef.current) => {
    Object.assign(worldRef.current!, makeWorld());
    setAuto(autoMode);
    autoRef.current = autoMode;
    sfx("select");
    setPh("run");
    render();
  };

  /** Ручной бросок: пока идёт автопогрузка, тапы и пробел игнорируются. */
  const manualDrop = () => {
    if (autoRef.current) return;
    drop();
  };

  const w = worldRef.current!;
  const offsetY = Math.max(0, w.stack.length - VISIBLE) * BOX_H;
  const flashText = (f: NonNullable<World["flash"]>) =>
    f.kind === "perfect" ? `РОВНО!${w.combo > 1 ? ` ×${w.combo}` : ""}` : f.kind === "ok" ? "легло" : "МИМО. Минус ящик";

  return (
    <div className="night__stage">
      <div className={`night__crt stack ${phase === "over" ? "is-done" : ""}`}>
        <div className="night__top">
          <span className="night__clock">СКЛАД · НОЧЬ</span>
          <span className="night__counter">
            ящиков {w.stack.length} / {GOAL} · минус {w.lost}
          </span>
        </div>

        {phase === "intro" ? (
          <>
            <p className="night__text">Фура ждёт</p>
            <p className="night__note">
              Ящик ездит туда-сюда — тапай вовремя, и он ложится на стопку. Свесился —
              край отваливается. Три ящика мимо — и фура ушла пустой.
            </p>
            <PixelButton variant="primary" className="btn--big" icon="factory" onClick={() => start(AUTO)}>
              Начать погрузку
            </PixelButton>
            <PixelButton variant="ghost" className="btn--big" icon="disk" onClick={() => start(true)}>
              Автопогрузка
            </PixelButton>
            <p className="night__hint">
              Тап по полю, кнопка внизу или пробел. Автопогрузка проведёт смену сама.
            </p>
            {savedResult ? (
              <p className="night__hint">
                Прошлая смена: {savedResult.boxes} ящиков за {fmtTime(savedResult.seconds * 1000)}.
              </p>
            ) : null}
          </>
        ) : null}

        {phase === "run" ? (
          <>
            <div
              className="stack__field"
              ref={fieldRef}
              role="application"
              aria-label="Погрузка фуры: тапни, чтобы сбросить ящик"
              onPointerDown={(e) => {
                e.preventDefault();
                manualDrop();
              }}
            >
              {auto ? (
                <span className="stack__auto" aria-hidden="true">
                  АВТО
                </span>
              ) : null}
              <div className="stack__pile" style={{ transform: `translateY(${offsetY}px)` }}>
                {w.stack.map((b, i) => (
                  <div
                    key={`${i}-${b.x}-${b.w}`}
                    className="stack__box"
                    data-p={b.p}
                    style={{ left: `${b.x}%`, width: `${b.w}%`, bottom: `${i * BOX_H + 22}px` }}
                  >
                    {b.p}
                  </div>
                ))}
              </div>

              <div
                className="stack__box stack__box--cur"
                data-p={product(w.stack.length)}
                style={{ left: `${w.cur.x}%`, width: `${w.cur.w}%` }}
              >
                {product(w.stack.length)}
              </div>

              {w.falls.map((f) => (
                <div
                  key={f.id}
                  className="stack__box stack__fall"
                  data-p={f.p}
                  style={{ left: `${f.x}%`, width: `${f.w}%` }}
                  aria-hidden="true"
                >
                  {f.p}
                </div>
              ))}

              {w.flash ? (
                <span key={w.flash.seq} className={`stack__flash is-${w.flash.kind}`}>
                  {flashText(w.flash)}
                </span>
              ) : null}

              <div className="stack__bed" aria-hidden="true">
                ФУРА
              </div>
            </div>

            {auto ? (
              <PixelButton variant="ghost" className="btn--big stack__drop" onClick={() => setAuto(false)}>
                Взять в руки
              </PixelButton>
            ) : (
              <PixelButton variant="primary" className="btn--big stack__drop" onClick={manualDrop}>
                Сбросить ящик
              </PixelButton>
            )}
          </>
        ) : null}

        {phase === "failed" ? (
          <div className="night__verdict stack__failed" role="alert">
            <p className="night__verdict-text">Три ящика мимо. Фура ушла пустой.</p>
            <p className="night__tally">
              погружено {w.stack.length}/{GOAL} · потеряно {w.lost}
            </p>
            <PixelButton variant="primary" className="btn--big" icon="factory" onClick={() => start(autoRef.current)}>
              Ещё смена
            </PixelButton>
          </div>
        ) : null}

        {phase === "over" ? (
          <div className="night__verdict" role="status">
            <p className="night__tally">
              ящиков {GOAL}/{GOAL} · потеряно {w.lost} · время {fmtTime(w.ms)}
            </p>
            <span className="ring__grade">СТАРШИЙ ПОГРУЗКИ</span>
            <p className="night__verdict-text">
              {w.lost === 0
                ? "Двенадцать ящиков, ни одной потери. Фура ушла, смена сдана."
                : "Двенадцать ящиков в фуре. Сметаны жалко, но уехала."}
            </p>
            <PixelButton variant="primary" className="btn--big" icon="factory" onClick={() => start(autoRef.current)}>
              Ещё смена
            </PixelButton>
          </div>
        ) : null}
      </div>

      <aside className="night__log ring__book" aria-label="Накладная">
        <span className="night__log-title">НАКЛАДНАЯ</span>
        <ol>
          {STACKER.invoice.map((entry) => (
            <li key={entry.name}>
              <span className="night__log-time ring__book-name">{entry.name}</span>
              <span className="night__log-text">{entry.note}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}