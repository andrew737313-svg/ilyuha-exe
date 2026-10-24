import { useEffect } from "react";
import { ART } from "../game/art";
import { PROFILE_BARS, PROFILE_STATS } from "../game/content";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

export function ProfileScreen({ dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();

  useEffect(() => {
    dispatch({ type: "award", id: "identified" });
    dispatch({ type: "reach", screen: "school" });
  }, [dispatch]);

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="02"
          kicker="ПРОФИЛЬ ПЕРСОНАЖА · LVL 32"
          title="Илюха"
          lead="Обычный человек. 32 года в сборке."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("boot")}>
            ← В начало
          </PixelButton>
          <PixelButton
            onClick={() => {
              sfx("confirm");
              go("school");
            }}
          >
            Глава 03: школа →
          </PixelButton>
        </div>
      }
    >
      <div className="split split--profile">
        <div className="portrait">
          <span className="portrait__label" aria-hidden="true">
            PORTRAIT
          </span>
          <ArtImage asset={ART.portrait} priority className="art--portrait" />
          <span className="portrait__badge">
            <PixelIcon name="crown" size={12} /> LVL 32
          </span>
          <span className="portrait__tag">муж · отец · смена на заводе</span>
        </div>

        <div className="panel stat-panel">
          <div className="panel__bar">
            <span className="panel__bar-title">ХАРАКТЕРИСТИКИ</span>
            <span className="panel__bar-meta">сохранено</span>
          </div>

          <dl className="stats">
            {PROFILE_STATS.map((row) => (
              <div key={row.label} className="stats__row">
                <dt>
                  <PixelIcon name={row.icon} size={12} />
                  {row.label}
                </dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="bars">
            {PROFILE_BARS.map((bar) => (
              <div key={bar.label} className="bars__item">
                <span className="bars__label">{bar.label}</span>
                <span className="bars__track">
                  <span
                    className={`bars__fill bars__fill--${bar.tone}`}
                    style={{ width: `${bar.value}%` }}
                  />
                </span>
                <span className="bars__value">{bar.value}</span>
              </div>
            ))}
          </div>

          <div className="perk">
            <span className="perk__icon" aria-hidden="true">
              <PixelIcon name="beer" size={20} />
            </span>
            <span className="perk__body">
              <span className="perk__kicker">Пассивная способность</span>
              <strong>Пивной баф</strong>
              <span className="perk__text">
                +5 к уверенности, −2 к скорости. Выдаётся автоматически после тридцати. Отключению не подлежит.
              </span>
            </span>
          </div>
        </div>
      </div>
    </ChapterLayout>
  );
}