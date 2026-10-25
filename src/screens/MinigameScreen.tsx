import { ART } from "../game/art";
import { useAudio } from "../audio/AudioProvider";
import { RingtoneGame } from "../components/RingtoneGame";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { ChapterLayout, type ScreenProps } from "./types";

export function MinigameScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const done = state.ring !== null || state.reached.includes("family");

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="04"
          kicker="МИНИ-ИГРА · СИМЕНС · 2005"
          title="Поставь на звонок"
          lead="Три клавиши, сорок нот и главный вопрос года: что будет у тебя на звонке."
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
            {done ? "Глава 05: семья →" : "Открыто после песенки"}
          </PixelButton>
        </div>
      }
    >
      <div className="night">
        <RingtoneGame
          savedResult={state.ring}
          onFinish={(result) => dispatch({ type: "minigame-finish", result })}
        />

        <div className="night__art">
          <ArtImage
            asset={ART.gamer}
            ratio="2.2 / 1"
            caption={
              <>
                <span className="art__tag">2005</span>
                Сименс, палец и главная мелодия двора.
              </>
            }
          />
        </div>
      </div>

      {done ? (
        <div className="award-panel">
          <span className="award-panel__icon" aria-hidden="true">
            <PixelIcon name="note" size={22} />
          </span>
          <div>
            <span className="award-panel__kicker">Достижение</span>
            <strong>Поставил на звонок</strong>
            <p>WAV-песенка сыграна до конца. 2005-й одобряет.</p>
          </div>
        </div>
      ) : null}
    </ChapterLayout>
  );
}