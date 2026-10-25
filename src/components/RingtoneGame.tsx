import { useEffect, useRef, useState } from "react";
import { RINGTONE } from "../game/content";
import type { RingResult } from "../game/state";
import { useAudio } from "../audio/AudioProvider";
import { audioEngine } from "../audio/engine";
import { PixelButton } from "./Ui";

/**
 * Мини-игра «Поставь на звонок» — ритм-игра на сименсе, 2005 год.
 * Ноты песенки падают по трём линиям; клавиша бьёт ноту на черте,
 * и из попаданий складывается сама мелодия — прямо через чиптюн-движок.
 */

type NoteState = "pending" | "hit" | "miss";
type HitKind = "perfect" | "good" | "miss";

type Note = {
  /** Время удара, сек от старта. */
  t: number;
  lane: number;
  midi: number;
  state: NoteState;
  kind: HitKind | null;
  settledAt: number | null;
};

type Phase = "intro" | "run" | "over";

type World = {
  notes: Note[];
  t: number;
  hits: number;
  misses: number;
  combo: number;
  maxCombo: number;
};

const BEAT = 60 / RINGTONE.bpm;
/** Сколько нота летит от верха экрана до черты. */
const TRAVEL = 1.9;
/** Высота линии удара, % экрана. */
const LINE = 78;
const PERFECT = 0.14;
const GOOD = 0.26;
/** Сколько показывать отыгранную/прошедшую ноту. */
const LINGER = 0.35;

const AUTO = (() => {
  try {
    return window.localStorage.getItem("ilyuha-ring-auto") === "1";
  } catch {
    return false;
  }
})();

const laneOf = (midi: number) => (midi <= 72 ? 0 : midi <= 76 ? 1 : 2);

function makeWorld(): World {
  return {
    notes: RINGTONE.notes.map(([beat, midi]) => ({
      t: RINGTONE.leadIn + beat * BEAT,
      lane: laneOf(midi),
      midi,
      state: "pending" as NoteState,
      kind: null,
      settledAt: null,
    })),
    t: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0,
  };
}

const FLASH_LABEL: Record<HitKind, string> = {
  perfect: "В ТОЧКУ",
  good: "ХИТ",
  miss: "МИМО",
};

export function RingtoneGame({
  savedResult,
  onFinish,
}: {
  savedResult: RingResult | null;
  onFinish: (result: RingResult) => void;
}) {
  const { sfx } = useAudio();
  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = makeWorld();
  const world = worldRef.current;
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<Array<{ kind: HitKind; seq: number } | null>>([null, null, null]);
  const seqRef = useRef(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [, setTick] = useState(0);
  const render = () => setTick((n) => n + 1);

  const total = world.notes.length;
  const lastNoteT = world.notes[total - 1]?.t ?? 0;

  const flash = (lane: number, kind: HitKind) => {
    flashRef.current[lane] = { kind, seq: seqRef.current++ };
  };

  const shakePhone = () => {
    const el = phoneRef.current;
    if (!el) return;
    el.classList.remove("is-shake");
    void el.offsetWidth;
    el.classList.add("is-shake");
  };

  const hit = (lane: number) => {
    const w = worldRef.current!;
    if (w.t <= 0) return;
    let best: Note | null = null;
    for (const note of w.notes) {
      if (note.lane !== lane || note.state !== "pending") continue;
      const dt = Math.abs(w.t - note.t);
      if (dt <= GOOD && (!best || dt < Math.abs(w.t - best.t))) best = note;
    }
    if (!best) {
      sfx("deny");
      return;
    }
    const kind: HitKind = Math.abs(w.t - best.t) <= PERFECT ? "perfect" : "good";
    best.state = "hit";
    best.kind = kind;
    best.settledAt = w.t;
    w.hits += 1;
    w.combo += 1;
    w.maxCombo = Math.max(w.maxCombo, w.combo);
    audioEngine.note(best.midi, kind === "perfect" ? 1 : 0.75);
    flash(lane, kind);
    render();
  };

  useEffect(() => {
    if (phase !== "run") return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const w = worldRef.current!;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      w.t += dt;

      for (const note of w.notes) {
        if (note.state !== "pending") continue;
        if (AUTO && w.t >= note.t) {
          note.state = "hit";
          note.kind = "perfect";
          note.settledAt = w.t;
          w.hits += 1;
          w.combo += 1;
          w.maxCombo = Math.max(w.maxCombo, w.combo);
          audioEngine.note(note.midi, 1);
          continue;
        }
        if (w.t > note.t + GOOD) {
          note.state = "miss";
          note.kind = "miss";
          note.settledAt = w.t;
          w.misses += 1;
          w.combo = 0;
          sfx("deny");
          flash(note.lane, "miss");
          shakePhone();
        }
      }

      if (w.t > lastNoteT + 1.2) {
        setPhase("over");
        sfx("achieve");
        onFinish({ hits: w.hits, total, combo: w.maxCombo });
        render();
        return;
      }
      render();
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, j: 0, k: 1, l: 2 };
      const lane = map[event.key.toLowerCase()];
      if (lane === undefined) return;
      event.preventDefault();
      hit(lane);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    Object.assign(worldRef.current!, makeWorld());
    flashRef.current = [null, null, null];
    sfx("select");
    setPhase("run");
    render();
  };

  const played = world.hits + world.misses;
  const accuracy = total > 0 ? world.hits / total : 0;
  const grade = RINGTONE.grades.find((g) => accuracy >= g.min) ?? RINGTONE.grades[RINGTONE.grades.length - 1];

  const visibleNote = (note: Note) => {
    if (note.state === "pending") return note.t - world.t <= TRAVEL && world.t <= note.t + GOOD;
    return note.settledAt !== null && world.t <= note.settledAt + LINGER;
  };

  return (
    <div className="night__stage">
      <div className={`night__crt ring ${phase === "over" ? "is-done" : ""}`}>
        <div className="night__top">
          <span className="night__clock">{RINGTONE.title} · WAV</span>
          <span className="night__counter">
            ♪ {played} / {total}
            {world.combo >= 4 ? ` · серия ×${world.combo}` : ""}
          </span>
        </div>

        {phase === "intro" ? (
          <>
            <p className="night__text">«{RINGTONE.title}»</p>
            <p className="night__note">
              Сименс, 2005 год. Ноты падают по трём линиям — бей клавишей, когда нота долетит
              до черты. Сыграешь песенку — она станет рингтоном. Не сыграешь — так и останется
              «Пиликающей №3».
            </p>
            <PixelButton variant="primary" className="btn--big" icon="note" onClick={start}>
              {savedResult ? "Сыграть ещё раз" : "Сыграть песенку"}
            </PixelButton>
            <p className="night__hint">
              Клавиши 1 · 2 · 3 (или J · K · L), а можно просто тыкать по кнопкам.
            </p>
            {savedResult ? (
              <p className="night__hint">
                Прошлый раз: попаданий {savedResult.hits}/{savedResult.total}, серия ×{savedResult.combo}.
              </p>
            ) : null}
          </>
        ) : null}

        {phase === "run" ? (
          <>
            <div className="ring__phone" ref={phoneRef}>
              <div className="ring__lanes">
                {[0, 1, 2].map((lane) => (
                  <div key={lane} className="ring__lane">
                    {world.notes
                      .filter((note) => note.lane === lane && visibleNote(note))
                      .map((note) => {
                        const top =
                          note.state === "pending"
                            ? LINE - ((note.t - world.t) / TRAVEL) * LINE
                            : LINE;
                        return (
                          <span
                            key={note.t}
                            className={`ring__note is-${note.state}`}
                            style={{ top: `${top}%` }}
                            aria-hidden="true"
                          >
                            ♪
                          </span>
                        );
                      })}
                    {flashRef.current[lane] ? (
                      <span
                        key={flashRef.current[lane]!.seq}
                        className={`ring__flash is-${flashRef.current[lane]!.kind}`}
                      >
                        {FLASH_LABEL[flashRef.current[lane]!.kind]}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              <span className="ring__line" aria-hidden="true" />
            </div>

            <div className="ring__keys" role="group" aria-label="Клавиши сименса">
              {["1", "2", "3"].map((key, lane) => (
                <button
                  key={key}
                  type="button"
                  className="ring__key"
                  onPointerDown={() => hit(lane)}
                  aria-label={`Клавиша ${key}`}
                >
                  {key}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {phase === "over" ? (
          <div className="night__verdict" role="status">
            <p className="night__tally">
              попаданий {world.hits}/{total} · серия ×{world.maxCombo} · точность {Math.round(accuracy * 100)}%
            </p>
            <span className="ring__grade">{grade.name}</span>
            <p className="night__verdict-text">{grade.text}</p>
            <PixelButton variant="primary" className="btn--big" icon="note" onClick={start}>
              Ещё раз
            </PixelButton>
          </div>
        ) : null}
      </div>

      <aside className="night__log ring__book" aria-label="Записная книжка">
        <span className="night__log-title">ЗАПИСНАЯ КНИЖКА</span>
        <ol>
          {RINGTONE.phonebook.map((entry) => (
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