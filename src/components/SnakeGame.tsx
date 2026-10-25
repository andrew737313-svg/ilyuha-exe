import { useEffect, useRef, useState } from "react";
import { SNAKE } from "../game/content";
import type { SnakeResult } from "../game/state";
import { useAudio } from "../audio/AudioProvider";
import { PixelButton } from "./Ui";

/**
 * Мини-игра «На ягуар не хватает» — змейка по ночному двору.
 * Собираешь банки, змейка растёт и ускоряется, столбы и собственный
 * хвост не прощают. Двенадцать банок — и «Художка» открыта.
 */

type Cell = { x: number; y: number };
type Dir = { x: number; y: number };
type Phase = "intro" | "run" | "dead" | "over";

type World = {
  snake: Cell[];
  dir: Dir;
  pending: Dir | null;
  food: Cell;
  cans: number;
  ms: number;
  crash: string | null;
};

const COLS = SNAKE.cols;
const ROWS = SNAKE.rows;
const DIRS: Record<string, Dir> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const AUTO = (() => {
  try {
    return window.localStorage.getItem("ilyuha-snake-auto") === "1";
  } catch {
    return false;
  }
})();

const key = (c: Cell) => `${c.x},${c.y}`;
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const opposite = (a: Dir, b: Dir) => a.x === -b.x && a.y === -b.y;
const inside = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < COLS && c.y < ROWS;

function freeCell(snake: Cell[]): Cell {
  for (;;) {
    const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => same(s, c))) return c;
  }
}

function makeWorld(): World {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    snake,
    dir: DIRS.right,
    pending: null,
    food: freeCell(snake),
    cans: 0,
    ms: 0,
    crash: null,
  };
}

/** Автоигра для тестов: BFS до банки, запасной вариант — самая свободная сторона. */
function autoDir(w: World): Dir | null {
  const head = w.snake[0];
  const blocked = new Set(w.snake.slice(0, -1).map(key));
  const prev = new Map<string, string>();
  const seen = new Set([key(head)]);
  const queue: Cell[] = [head];
  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (same(cur, w.food)) {
      found = true;
      break;
    }
    for (const d of Object.values(DIRS)) {
      const n = { x: cur.x + d.x, y: cur.y + d.y };
      const k = key(n);
      if (!inside(n) || blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      prev.set(k, key(cur));
      queue.push(n);
    }
  }
  if (found) {
    let cur = key(w.food);
    while (prev.get(cur) !== undefined && prev.get(cur) !== key(head)) {
      cur = prev.get(cur)!;
    }
    const [fx, fy] = cur.split(",").map(Number);
    const dir = { x: fx - head.x, y: fy - head.y };
    return opposite(dir, w.dir) ? null : dir;
  }
  // Банка недостижима — идём туда, где больше места.
  let best: Dir | null = null;
  let bestSpace = -1;
  for (const d of Object.values(DIRS)) {
    if (opposite(d, w.dir)) continue;
    const n = { x: head.x + d.x, y: head.y + d.y };
    if (!inside(n) || blocked.has(key(n))) continue;
    const spaceSeen = new Set([key(n)]);
    const stack = [n];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const dd of Object.values(DIRS)) {
        const m = { x: cur.x + dd.x, y: cur.y + dd.y };
        const k = key(m);
        if (!inside(m) || blocked.has(k) || spaceSeen.has(k)) continue;
        spaceSeen.add(k);
        stack.push(m);
      }
    }
    if (spaceSeen.size > bestSpace) {
      bestSpace = spaceSeen.size;
      best = d;
    }
  }
  return best;
}

function tickWorld(w: World): "run" | "dead" | "over" {
  if (w.pending && !opposite(w.pending, w.dir)) w.dir = w.pending;
  w.pending = null;
  const head = w.snake[0];
  const next = { x: head.x + w.dir.x, y: head.y + w.dir.y };
  const eating = same(next, w.food);
  const body = eating ? w.snake : w.snake.slice(0, -1);
  if (!inside(next) || body.some((c) => same(c, next))) {
    w.crash = SNAKE.crashes[Math.floor(Math.random() * SNAKE.crashes.length)];
    return "dead";
  }
  w.snake = [next, ...body];
  if (eating) {
    w.cans += 1;
    if (w.cans >= SNAKE.goal) return "over";
    w.food = freeCell(w.snake);
  }
  return "run";
}

const fmtTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function SnakeGame({
  savedResult,
  onFinish,
}: {
  savedResult: SnakeResult | null;
  onFinish: (result: SnakeResult) => void;
}) {
  const { sfx } = useAudio();
  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = makeWorld();
  const world = worldRef.current;
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [, setTick] = useState(0);
  const render = () => setTick((n) => n + 1);

  const setDir = (dir: Dir) => {
    const w = worldRef.current!;
    if (phase !== "run") return;
    if (opposite(dir, w.dir) || (dir.x === w.dir.x && dir.y === w.dir.y)) return;
    w.pending = dir;
  };

  useEffect(() => {
    if (phase !== "run") return;
    let timer = 0;
    const step = () => {
      const w = worldRef.current!;
      const delay = Math.max(SNAKE.minTick, SNAKE.baseTick - w.cans * 5);
      if (AUTO) {
        const d = autoDir(w);
        if (d) w.pending = d;
      }
      const before = w.cans;
      const outcome = tickWorld(w);
      w.ms += delay;
      if (w.cans > before) sfx("select");
      if (outcome === "dead") {
        sfx("error");
        const el = fieldRef.current;
        if (el) {
          el.classList.remove("is-crash");
          void el.offsetWidth;
          el.classList.add("is-crash");
        }
        setPhase("dead");
        render();
        return;
      }
      if (outcome === "over") {
        sfx("achieve");
        setPhase("over");
        onFinish({ cans: w.cans, seconds: Math.round(w.ms / 1000) });
        render();
        return;
      }
      render();
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, Math.max(SNAKE.minTick, SNAKE.baseTick - worldRef.current!.cans * 5));
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        arrowup: DIRS.up,
        w: DIRS.up,
        arrowdown: DIRS.down,
        s: DIRS.down,
        arrowleft: DIRS.left,
        a: DIRS.left,
        arrowright: DIRS.right,
        d: DIRS.right,
      };
      const dir = map[event.key.toLowerCase()];
      if (!dir) return;
      event.preventDefault();
      setDir(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    Object.assign(worldRef.current!, makeWorld());
    sfx("select");
    setPhase("run");
    render();
  };

  return (
    <div className="night__stage">
      <div className={`night__crt snake ${phase === "over" ? "is-done" : ""}`}>
        <div className="night__top">
          <span className="night__clock">ДВОР · НОЧЬ</span>
          <span className="night__counter">
            банок {world.cans} / {SNAKE.goal}
          </span>
        </div>

        {phase === "intro" ? (
          <>
            <p className="night__text">«Художка» ждёт</p>
            <p className="night__note">
              Ночь, двор, в кармане пусто. Ты — змейка: собирай банки ягуара, не врезайся
              в столбы и не кусай себя за хвост. {SNAKE.goal} банок — и на ночь хватит.
            </p>
            <PixelButton variant="primary" className="btn--big" icon="beer" onClick={start}>
              Начать сбор
            </PixelButton>
            <p className="night__hint">
              Стрелки или WASD. На телефоне — кнопки под двором.
            </p>
            {savedResult ? (
              <p className="night__hint">
                Прошлый забег: {savedResult.cans} банок за {fmtTime(savedResult.seconds * 1000)}.
              </p>
            ) : null}
          </>
        ) : null}

        {phase === "run" || phase === "dead" ? (
          <>
            <div
              className="snake__field"
              ref={fieldRef}
              role="application"
              aria-label="Змейка по двору"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                aspectRatio: `${COLS} / ${ROWS}`,
              }}
            >
              <span
                className="snake__food"
                style={{ gridColumn: world.food.x + 1, gridRow: world.food.y + 1 }}
                aria-hidden="true"
              />
              {world.snake.map((cell, i) => (
                <span
                  key={`${cell.x}-${cell.y}-${i}`}
                  className={i === 0 ? "snake__head" : "snake__body"}
                  style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
                  aria-hidden="true"
                />
              ))}
            </div>

            {phase === "dead" ? (
              <div className="night__verdict snake__dead" role="alert">
                <p className="night__verdict-text">{world.crash}</p>
                <p className="night__tally">банок {world.cans} / {SNAKE.goal}</p>
                <PixelButton variant="primary" className="btn--big" icon="beer" onClick={start}>
                  Ещё раз
                </PixelButton>
              </div>
            ) : null}

            <div className="snake__pad" role="group" aria-label="Управление змейкой">
              <span />
              <button type="button" className="ring__key" onPointerDown={() => setDir(DIRS.up)} aria-label="Вверх">↑</button>
              <span />
              <button type="button" className="ring__key" onPointerDown={() => setDir(DIRS.left)} aria-label="Влево">←</button>
              <button type="button" className="ring__key" onPointerDown={() => setDir(DIRS.down)} aria-label="Вниз">↓</button>
              <button type="button" className="ring__key" onPointerDown={() => setDir(DIRS.right)} aria-label="Вправо">→</button>
            </div>
          </>
        ) : null}

        {phase === "over" ? (
          <div className="night__verdict" role="status">
            <p className="night__tally">
              банок {world.cans}/{SNAKE.goal} · время {fmtTime(world.ms)}
            </p>
            <span className="ring__grade">НАБРАЛ НА НОЧЬ</span>
            <p className="night__verdict-text">Двенадцать банок. «Художка», открывай.</p>
            <PixelButton variant="primary" className="btn--big" icon="beer" onClick={start}>
              Ещё забег
            </PixelButton>
          </div>
        ) : null}
      </div>

      <aside className="night__log ring__book" aria-label="Цены двора">
        <span className="night__log-title">ЦЕНЫ ДВОРА</span>
        <ol>
          {SNAKE.prices.map((entry) => (
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