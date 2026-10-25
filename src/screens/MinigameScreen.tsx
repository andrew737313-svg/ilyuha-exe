import { ART } from "../game/art";
import { useAudio } from "../audio/AudioProvider";
import { StackerGame } from "../components/StackerGame";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { ChapterLayout, type ScreenProps } from "./types";

export function MinigameScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const done = state.stack !== null || state.reached.includes("family");

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="04"
          kicker="МИНИ-ИГРА · СКЛАД · НОЧЬ"
          title="Погрузи фуру"
          lead="Твоя смена, только в виде игры. Двенадцать ящиков, три промаха, фура в 07:00."
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
            {done ? "Глава 05: семья →" : "Загрузи фуру — дальше"}
          </PixelButton>
        </div>
      }
    >
      <div className="night">
        <StackerGame
          savedResult={state.stack}
          onFinish={(result) => dispatch({ type: "minigame-finish", result })}
        />

        <div className="night__art">
          <ArtImage
            asset={ART.gamer}
            ratio="2.2 / 1"
            caption={
              <>
                <span className="art__tag">СКЛАД</span>
                Ящики, фура и одна кнопка. Как в ту смену.
              </>
            }
          />
        </div>
      </div>

      {done ? (
        <div className="award-panel">
          <span className="award-panel__icon" aria-hidden="true">
            <PixelIcon name="factory" size={22} />
          </span>
          <div>
            <span className="award-panel__kicker">Достижение</span>
            <strong>Фура ушла полной</strong>
            <p>Двенадцать ящиков. Погрузка без крана.</p>
          </div>
        </div>
      ) : null}
    </ChapterLayout>
  );
}