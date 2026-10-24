import { useEffect, useRef, useState } from "react";
import { ART } from "../game/art";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { EvolutionScene } from "../components/EvolutionScene";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

export function PatchScreen({ state, dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();
  const [flash, setFlash] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const activate = () => {
    if (state.beerBuff) return;
    dispatch({ type: "beer-buff" });
    sfx("buff");
    setFlash(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(false), 1500);
  };

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="07"
          kicker="ПАТЧ 32.0 · ИЗМЕНЕНИЯ"
          title="Пивной баф"
          lead="Не баг. Фича. И, судя по всему, единственная, которую нельзя откатить."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("work")}>
            ← Завод
          </PixelButton>
          <PixelButton
            disabled={!state.beerBuff}
            onClick={() => {
              sfx("confirm");
              go("final");
            }}
          >
            {state.beerBuff ? "Финал: старый сейв →" : "Сначала активируй баф"}
          </PixelButton>
        </div>
      }
    >
      <div className={`patch ${flash ? "is-flashing" : ""}`}>
        <div className="panel patch__panel">
          <div className="panel__bar">
            <span className="panel__bar-title">CHANGELOG · LVL 7 → LVL 32</span>
            <span className="panel__bar-meta">сборка 32.0</span>
          </div>

          <div className="patch__evo">
            <EvolutionScene active={state.beerBuff} />
            <div className="patch__evo-labels">
              <span>
                <strong>LVL 7</strong> высокий и худой
              </span>
              <span>
                <strong>LVL 32</strong> тот же человек, больше площади
              </span>
            </div>
          </div>

          <ul className="changelog">
            <li>
              <span className="changelog__tag">было</span>
              Ремень затягивался на последнюю дырку. Футболка болталась, как парус.
            </li>
            <li>
              <span className="changelog__tag changelog__tag--new">стало</span>
              Ремень теперь скорее рекомендация. Футболка сидит ровно.
            </li>
            <li>
              <span className="changelog__tag">добавлено</span>
              «Пивной баф» — пассивный навык. Открывается после тридцати, работает
              круглосуточно.
            </li>
          </ul>

          <div className="buff-row">
            <PixelButton
              variant="primary"
              className="btn--buff"
              onClick={activate}
              disabled={state.beerBuff}
              icon="beer"
            >
              {state.beerBuff ? "Баф уже активен" : "Получить пивной баф"}
            </PixelButton>
            <span className="buff-row__hint">одно нажатие · навсегда</span>
          </div>

          {state.beerBuff ? (
            <div className="buff-on" role="status">
              <span className="buff-on__icon" aria-hidden="true">
                <PixelIcon name="beer" size={16} />
              </span>
              <div>
                <strong>БАФ АКТИВЕН: Пивной баф</strong>
                <p>
                  Гибкость −1, скорость −2, уверенность +5. Действует
                  бессрочно, снимается только силой воли.
                </p>
              </div>
            </div>
          ) : (
            <p className="panel__note">
              Шутка дружеская. Ни одно лицо в этом патче не пострадало.
            </p>
          )}
        </div>

        <div className="patch__art">
          <ArtImage asset={ART.gamer} priority caption="Вечер, компьютер, кружка. Полный набор." />
          {state.beerBuff ? (
            <span className="patch__stamp">
              <PixelIcon name="beer" size={14} /> БАФ АКТИВЕН
            </span>
          ) : null}
        </div>

        {flash ? <span className="patch__flash" aria-hidden="true" /> : null}
      </div>
    </ChapterLayout>
  );
}