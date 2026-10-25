import { ART } from "../game/art";
import { useAudio } from "../audio/AudioProvider";
import { SnakeGame } from "../components/SnakeGame";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { ChapterLayout, type ScreenProps } from "./types";

export function MinigameScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const done = state.snake !== null || state.reached.includes("family");

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="04"
          kicker="МИНИ-ИГРА · ДВОР · 2005"
          title="На ягуар не хватает"
          lead="Ночь, двор, в кармане пусто. Собери двенадцать банок — и «Художка» открыта."
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
            {done ? "Глава 05: семья →" : "Собери банки — дальше"}
          </PixelButton>
        </div>
      }
    >
      <div className="night">
        <SnakeGame
          savedResult={state.snake}
          onFinish={(result) => dispatch({ type: "minigame-finish", result })}
        />

        <div className="night__art">
          <ArtImage
            asset={ART.gamer}
            ratio="2.2 / 1"
            caption={
              <>
                <span className="art__tag">НОЧЬ</span>
                Двор, змейка и двенадцать банок на всю ночь.
              </>
            }
          />
        </div>
      </div>

      {done ? (
        <div className="award-panel">
          <span className="award-panel__icon" aria-hidden="true">
            <PixelIcon name="beer" size={22} />
          </span>
          <div>
            <span className="award-panel__kicker">Достижение</span>
            <strong>Собрал на ночь</strong>
            <p>Двенадцать банок ягуара. «Художка», открывай.</p>
          </div>
        </div>
      ) : null}
    </ChapterLayout>
  );
}