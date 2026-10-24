import { ART } from "../game/art";
import { MINIGAME_STEPS } from "../game/content";
import { MINIGAME_CLICKS } from "../game/state";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

export function MinigameScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const clicks = state.clicks;
  const done = clicks >= MINIGAME_CLICKS;
  const step = clicks > 0 ? MINIGAME_STEPS[Math.min(clicks, MINIGAME_CLICKS) - 1] : null;
  const clock = step ? step.time : "22:10";

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="04"
          kicker="МИНИ-ИГРА · НОЧНАЯ СЕССИЯ"
          title="Ещё пять минут"
          lead="Нажми шесть раз. Дальше — как пойдёт."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("school")}>
            ← Школа
          </PixelButton>
          <PixelButton
            disabled={!done}
            onClick={() => {
              sfx("confirm");
              go("family");
            }}
          >
            {done ? "Глава 05: семья →" : `Открыто после ${MINIGAME_CLICKS} нажатий`}
          </PixelButton>
        </div>
      }
    >
      <div className="night">
        <div className="night__stage">
          <div className={`night__crt ${done ? "is-done" : ""}`}>
            <div className="night__top">
              <span className="night__clock" aria-label={`Время ${clock}`}>
                {clock}
              </span>
              <span className="night__counter">
                {clicks} / {MINIGAME_CLICKS} нажатий
              </span>
            </div>

            <div className="night__quote" key={clicks}>
              {step ? (
                <>
                  <span className="night__speaker">{step.speaker}</span>
                  <p className="night__text">«{step.quote}»</p>
                  <p className="night__note">{step.note}</p>
                </>
              ) : (
                <>
                  <span className="night__speaker">Система</span>
                  <p className="night__text">«Ну что, ещё пять минут?»</p>
                  <p className="night__note">
                    Мама уже спит. Комп гудит. Игра на самом интересном месте.
                  </p>
                </>
              )}
            </div>

            <div
              className="night__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={MINIGAME_CLICKS}
              aria-valuenow={clicks}
              aria-label="Прогресс ночной сессии"
            >
              {Array.from({ length: MINIGAME_CLICKS }, (_, i) => (
                <span key={i} className={`night__seg ${i < clicks ? "is-on" : ""}`} />
              ))}
            </div>

            <PixelButton
              variant="primary"
              className="btn--big"
              onClick={() => {
                if (done) return;
                sfx("select");
                dispatch({ type: "minigame-click" });
              }}
              disabled={done}
              icon="gamepad"
            >
              {done ? "Сессия завершена" : "Ещё пять минут"}
            </PixelButton>

            <p className="night__hint">
              {done
                ? "Дальше — только в кровать. Или на работу."
                : "Кнопку можно нажимать мышью, пальцем или клавишей Enter."}
            </p>
          </div>

          <aside className="night__log" aria-label="Журнал сессии">
            <span className="night__log-title">ЖУРНАЛ</span>
            <ol>
              {MINIGAME_STEPS.map((s, i) => (
                <li key={s.time} className={i < clicks ? "is-done" : ""}>
                  <span className="night__log-time">{s.time}</span>
                  <span className="night__log-text">{s.quote}</span>
                  <span className="night__log-mark" aria-hidden="true">
                    {i < clicks ? <PixelIcon name="check" size={10} /> : "·"}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <div className="night__art">
          <ArtImage
            asset={ART.gamer}
            ratio="2.2 / 1"
            caption={
              <>
                <span className="art__tag">НОЧЬ</span>
                Илюха, кружка и «ещё пять минут».
              </>
            }
          />
        </div>
      </div>

      {done ? (
        <div className="award-panel">
          <span className="award-panel__icon" aria-hidden="true">
            <PixelIcon name="disk" size={22} />
          </span>
          <div>
            <span className="award-panel__kicker">Достижение</span>
            <strong>Не удалил сейв с детства</strong>
            <p>
              Шесть нажатий, ноль сожалений. За окном уже светает.
            </p>
          </div>
        </div>
      ) : null}
    </ChapterLayout>
  );
}