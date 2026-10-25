import { ART } from "../game/art";
import { SCHOOL_CHOICES } from "../game/content";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

const MARKS: Record<string, string> = { good: "A", trouble: "B", games: "C" };

export function SchoolScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const active = SCHOOL_CHOICES.find((c) => c.id === state.schoolChoice) ?? null;
  const tried = state.schoolTried.length;

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="03"
          kicker="ШКОЛА · ОДНА ПАРТА НА ДВОИХ"
          title="Одна парта на двоих"
          lead="Одна парта, два хулигана."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("profile")}>
            ← Профиль
          </PixelButton>
          <PixelButton
            disabled={!active}
            onClick={() => {
              sfx("confirm");
              go("minigame");
            }}
          >
            {active ? "Глава 04: погрузка →" : "Сначала выбери, каким ты был"}
          </PixelButton>
        </div>
      }
    >
      <div className="split split--story">
        <ArtImage
          asset={ART.classroom}
          caption={
            <>
              <span className="art__tag">2000-е</span>
              Один класс, две фамилии в журнале, одна парта на двоих.
            </>
          }
        />

        <div className="panel story-panel">
          <div className="panel__bar">
            <span className="panel__bar-title">ГЛАВА 03 · ВОСПОМИНАНИЕ</span>
            <span className="panel__bar-meta">запись 1 из 1</span>
          </div>

          <p className="story">
            Мы сидели за одной партой и хулиганили: фишки, суефа, ржач на уроках, дрались
            бывало. После уроков шли то друг к другу, то в «Художку». На сименсах и моторолах
            у всех были одни и те же wav-песенки. Половину уже не вспомнить, но смешно до сих
            пор.
          </p>
          <p className="story story--small">
            Выбери, каким ты был на уроке. Правильного варианта нет, я проверял.
          </p>

          <div className="choices" role="group" aria-label="Выбор в школьной сцене">
            {SCHOOL_CHOICES.map((choice) => {
              const selected = state.schoolChoice === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={`choice ${selected ? "is-selected" : ""}`}
                  onClick={() => {
                    if (selected) return;
                    sfx(choice.id === "games" ? "select" : "confirm");
                    dispatch({ type: "school", id: choice.id });
                  }}
                  aria-pressed={selected}
                >
                  <span className="choice__mark">{MARKS[choice.id]}</span>
                  <span className="choice__body">
                    <span className="choice__label">{choice.label}</span>
                    {choice.hint ? <span className="choice__hint">{choice.hint}</span> : null}
                  </span>
                  {state.schoolTried.includes(choice.id) ? (
                    <span className="choice__tick" aria-label="Уже попробовано">
                      <PixelIcon name="check" size={12} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p className="panel__note">
            Варианты можно пройти заново: открой настройки или вернись сюда позже. Пробовано:{" "}
            {tried}/3.
          </p>
        </div>
      </div>

      {active ? (
        <div className="reaction" key={active.id}>
          <div className="reaction__head">
            <span className="reaction__tag">РЕАКЦИЯ</span>
            <span className="reaction__name">{active.label}</span>
            <span className="reaction__ach">
              <PixelIcon name={active.achievement === "class-good" ? "crown" : "gamepad"} size={12} />
              достижение открыто
            </span>
          </div>
          <ol className="reaction__lines">
            {active.reaction.map((line, i) => (
              <li key={line} style={{ ["--i" as string]: i }}>
                {line}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </ChapterLayout>
  );
}