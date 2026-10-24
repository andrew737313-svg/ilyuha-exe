import { ART } from "../game/art";
import { useAudio } from "../audio/AudioProvider";
import { NightShiftGame } from "../components/NightShiftGame";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { ChapterLayout, type ScreenProps } from "./types";

export function MinigameScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const done = state.night !== null;

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="04"
          kicker="МИНИ-ИГРА · НОЧНАЯ СМЕНА"
          title="Ещё пять минут"
          lead="Одна ночь, один уровень и кефиры, которым не до твоих игр."
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
            {done ? "Глава 05: семья →" : "Открыто после смены"}
          </PixelButton>
        </div>
      }
    >
      <div className="night">
        <NightShiftGame
          savedResult={state.night}
          onFinish={(result) => dispatch({ type: "minigame-finish", result })}
        />

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
            <strong>Не выключал до утра</strong>
            <p>«Ещё пять минут» повторялись до семи утра. Смена всё равно сдана.</p>
          </div>
        </div>
      ) : null}
    </ChapterLayout>
  );
}