import { useEffect, useState } from "react";
import { ART } from "../game/art";
import { ACHIEVEMENTS, FINAL_LETTER } from "../game/content";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { FinalPlayer } from "../components/FinalPlayer";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

export function FinalScreen({ state, dispatch }: ScreenProps) {
  const { sfx } = useAudio();
  const [restarted, setRestarted] = useState(false);

  useEffect(() => {
    dispatch({ type: "finish" });
  }, [dispatch]);

  const owned = Object.values(ACHIEVEMENTS).filter((a) => state.achievements.includes(a.id));

  return (
    <ChapterLayout
      className="chapter--final"
      head={
        <ChapterHeader
          chapter="08"
          kicker="ФИНАЛ · СТАРЫЙ СЕЙВ"
          title="Старый сейв, новая глава"
          lead="Патч 32.0 установлен. Всё лучшее — с собой."
        />
      }
      nav={
        <div className="nav-row nav-row--center">
          <PixelButton
            variant="ghost"
            onClick={() => {
              sfx("click");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ↑ Наверх
          </PixelButton>
          <PixelButton
            variant="primary"
            onClick={() => {
              if (restarted) return;
              setRestarted(true);
              sfx("confirm");
              dispatch({ type: "reset" });
            }}
            disabled={restarted}
          >
            {restarted ? "Перезапусти экран" : "Пройти заново"}
          </PixelButton>
        </div>
      }
    >
      <div className="final">
        <ArtImage
          asset={ART.park}
          priority
          className="final__hero"
          caption={
            <>
              <span className="art__tag">ПАРК</span>
              Двое, которые когда-то делили парту. Слева — Илюха, справа — автор этой сборки.
            </>
          }
        />

        <div className="final__grid">
          <article className="letter">
            <span className="letter__stamp" aria-hidden="true">
              PATCH 32.0 — INSTALLED
            </span>
            {FINAL_LETTER.map((paragraph, i) => (
              <p key={paragraph} className={i === 0 ? "letter__hello" : ""}>
                {paragraph}
              </p>
            ))}
            <p className="letter__sign">— твой сосед по парте</p>
            <p className="letter__ps">
              P.S. Детство не удаляй. Оно ещё пригодится.
            </p>
          </article>

          <aside className="final__side">
            <FinalPlayer onPlayed={() => dispatch({ type: "track-played" })} />

            <div className="final__achievements">
              <div className="final__achievements-head">
                <span>Достижения</span>
                <span>
                  {owned.length}/{Object.keys(ACHIEVEMENTS).length}
                </span>
              </div>
              <ul>
                {owned.map((ach) => (
                  <li key={ach.id}>
                    <PixelIcon name={ach.icon} size={12} />
                    <span>{ach.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="final__credits">
              <span>Иллюстрации: папка assets/</span>
              <span>Музыка: процедурный чиптюн</span>
              <span>Шрифты: Pixelify Sans, Press Start 2P, IBM Plex Mono</span>
            </div>
          </aside>
        </div>
      </div>
    </ChapterLayout>
  );
}