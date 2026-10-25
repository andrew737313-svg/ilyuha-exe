import { useEffect } from "react";
import { ART } from "../game/art";
import { ArtImage } from "../components/ArtImage";
import { ChapterHeader, PixelButton } from "../components/Ui";
import { PixelIcon } from "../components/PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { ChapterLayout, type ScreenProps } from "./types";

const JOURNAL = [
  {
    name: "Диана",
    icon: "heart" as const,
    text: "Рыжие волосы, светлые глаза, та самая улыбка. Держит дом, тебя и всё расписание.",
  },
  {
    name: "Маргарита",
    icon: "star" as const,
    text: "В этом году пошла в школу. Первый рюкзак, первый звонок, первые «я не хочу вставать».",
  },
  {
    name: "Богдан",
    icon: "crown" as const,
    text: "Скоро полгода. Пока в расписании поесть, поспать и собрать вокруг себя всю семью. Справляется лучше всех.",
  },
];

export function FamilyScreen({ dispatch, go }: ScreenProps) {
  const { sfx } = useAudio();

  useEffect(() => {
    dispatch({ type: "award", id: "new-game-plus" });
    dispatch({ type: "reach", screen: "work" });
  }, [dispatch]);

  return (
    <ChapterLayout
      head={
        <ChapterHeader
          chapter="05"
          kicker="СЕМЬЯ · ТЁПЛАЯ ЧАСТЬ"
          title="Новая игра+"
          lead="Сложность выше. Народу больше."
        />
      }
      nav={
        <div className="nav-row">
          <PixelButton variant="ghost" onClick={() => go("minigame")}>
            ← Погрузка
          </PixelButton>
          <PixelButton
            onClick={() => {
              sfx("confirm");
              go("work");
            }}
          >
            Глава 06: завод →
          </PixelButton>
        </div>
      }
    >
      <div className="split split--family">
        <ArtImage
          asset={ART.familyPortrait}
          caption={
            <>
              <span className="art__tag">СЕМЬЯ</span>
              Илюха, Диана, Маргарита и Богдан. Тёплый свет, шумно, хорошо.
            </>
          }
        />

        <div className="panel family-panel">
          <div className="panel__bar">
            <span className="panel__bar-title">ГЛАВА 05 · ДОМ</span>
            <span className="panel__bar-meta">без статистики</span>
          </div>

          <p className="story">
            Диана, Маргарита и Богдан. Дома шумно, тепло и кто-то опять не спит.
          </p>

          <ul className="journal">
            {JOURNAL.map((entry) => (
              <li key={entry.name} className="journal__item">
                <span className="journal__icon" aria-hidden="true">
                  <PixelIcon name={entry.icon} size={16} />
                </span>
                <span className="journal__body">
                  <strong>{entry.name}</strong>
                  <span>{entry.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="panel__note panel__note--warm">
            Здесь статистики не будет. Просто они, главное достижение.
          </p>
        </div>
      </div>
    </ChapterLayout>
  );
}