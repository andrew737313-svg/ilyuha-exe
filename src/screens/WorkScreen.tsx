import { WORK_CHOICES } from "../game/content";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { FactoryScene } from "../components/FactoryScene";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

const MARKS: Record<string, string> = { panic: "A", fix: "B", pretend: "C" };

export function WorkScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const active = WORK_CHOICES.find((c) => c.id === state.workChoice) ?? null;

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="06"
          kicker="РАБОТА · МОЛОЧНЫЙ ЗАВОД"
          title="Ночная смена"
          lead="Ночная смена, линия розлива и один очень спокойный человек в белом."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("family")}>
            ← Семья
          </PixelButton>
          <PixelButton
            disabled={!active}
            onClick={() => {
              sfx("confirm");
              go("patch");
            }}
          >
            {active ? "Глава 07: патч 32.0 →" : "Сначала разберись со сменой"}
          </PixelButton>
        </div>
      }
    >
      <div className="work">
        <div className="work__scene">
          <FactoryScene />
          <div className="work__alert">
            <span className="work__alert-dot" aria-hidden="true" />
            <span>
              <strong>ЛИНИЯ ОСТАНОВЛЕНА</strong>
              <em>датчик уровня · защита насоса</em>
            </span>
          </div>
          <span className="work__stamp">СМЕНА · 03:20</span>
        </div>

        <div className="panel work__panel">
          <div className="panel__bar">
            <span className="panel__bar-title">ГЛАВА 06 · СМЕНА</span>
            <span className="panel__bar-meta">{state.workTried.length}/3 реакций</span>
          </div>

          <p className="story">
            Половина четвёртого. Линия розлива встала, молоко стоит, смена смотрит на тебя.
            Инженер уже идёт, но у тебя есть секунда, чтобы выбрать лицо.
          </p>

          <div className="choices choices--compact" role="group" aria-label="Решение на смене">
            {WORK_CHOICES.map((choice) => {
              const selected = state.workChoice === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={`choice ${selected ? "is-selected" : ""}`}
                  onClick={() => {
                    if (selected) return;
                    sfx("select");
                    dispatch({ type: "work", id: choice.id });
                  }}
                  aria-pressed={selected}
                >
                  <span className="choice__mark">{MARKS[choice.id]}</span>
                  <span className="choice__body">
                    <span className="choice__label">{choice.label}</span>
                    {choice.hint ? <span className="choice__hint">{choice.hint}</span> : null}
                  </span>
                  {state.workTried.includes(choice.id) ? (
                    <span className="choice__tick" aria-label="Уже попробовано">
                      <PixelIcon name="check" size={12} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {active ? (
            <div className="reaction reaction--inline" key={active.id}>
              <div className="reaction__head">
                <span className="reaction__tag">РЕАКЦИЯ</span>
                <span className="reaction__name">{active.label}</span>
              </div>
              <ol className="reaction__lines">
                {active.reaction.map((line, i) => (
                  <li key={line} style={{ ["--i" as string]: i }}>
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="panel__note">
              Любой вариант — рабочая ситуация. Никто не пострадал, кроме молока.
            </p>
          )}
        </div>
      </div>
    </ChapterLayout>
  );
}