import { useCallback, useEffect, useRef, useState } from "react";
import { PixelIcon } from "./PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { loadTrack, TRACK_CHANGED_EVENT } from "../audio/track-store";

const base = import.meta.env.BASE_URL;

/** Название подарка. Оно же висит над плеером, независимо от имени файла. */
export const TRACK_TITLE = "Илюха, с днём рождения";

/** Файл, который надо положить в public/audio/. Можно любое из расширений. */
export const TRACK_PATH = "public/audio/Илюха, с днём рождения.mp3";

type Candidate = { url: string; placeholder?: boolean };

/**
 * Кириллицу и пробелы кодируем, а запятую оставляем как есть: некоторые
 * статические серверы не находят файл по пути с %2C и отдают index.html.
 */
function audioPath(fileName: string): string {
  return `${base}audio/${encodeURIComponent(fileName).replace(/%2C/gi, ",")}`;
}

const BUNDLED_CANDIDATES: Candidate[] = [
  // Основной путь: файл с русским именем, как его и положили в папку.
  { url: audioPath("Илюха, с днём рождения.mp3") },
  { url: audioPath("Илюха, с днём рождения.m4a") },
  // Запасной путь на случай, если файл переименуют латиницей.
  { url: audioPath("ilyuha-happy-birthday.mp3") },
  { url: audioPath("ilyuha-happy-birthday.m4a") },
  // Пока настоящего трека нет, играет короткая демо-заготовка.
  { url: audioPath("old-save-demo.wav"), placeholder: true },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function describeMediaError(err: MediaError | null): string {
  if (!err) return "Не удалось воспроизвести файл.";
  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Воспроизведение прервано.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Файл не загрузился: проверь, что он лежит рядом с игрой.";
    case MediaError.MEDIA_ERR_DECODE:
      return "Браузер не смог декодировать этот файл. Попробуй mp3, m4a или wav.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Формат не поддерживается этим браузером.";
    default:
      return "Неизвестная ошибка воспроизведения.";
  }
}

export function FinalPlayer({ onPlayed }: { onPlayed: () => void }) {
  const { setMusicEnabled, settings } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);

  const [placeholder, setPlaceholder] = useState(false);
  const [hasTrack, setHasTrack] = useState(false);
  const [custom, setCustom] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  // Пока играет трек, фоновая музыка не приглушается, а выключается целиком.
  const musicRef = useRef(settings.musicOn);
  musicRef.current = settings.musicOn;
  const musicWasOn = useRef(false);

  const silenceMusic = useCallback(() => {
    musicWasOn.current = musicRef.current;
    if (musicRef.current) setMusicEnabled(false);
  }, [setMusicEnabled]);

  const restoreMusic = useCallback(() => {
    if (musicWasOn.current) setMusicEnabled(true);
    musicWasOn.current = false;
  }, [setMusicEnabled]);

  // Ушли с финального экрана во время песни — музыка должна вернуться.
  // Эффект с пустыми зависимостями: иначе cleanup срабатывает на каждом ре-рендере.
  const restoreRef = useRef(restoreMusic);
  restoreRef.current = restoreMusic;
  useEffect(() => () => restoreRef.current(), []);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  // Трек из админки важнее файла в сборке.
  const loadSource = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);

    const stored = await loadTrack();
    if (stored) {
      releaseObjectUrl();
      const url = URL.createObjectURL(stored.blob);
      objectUrl.current = url;
      audio.src = url;
      setHasTrack(true);
      setCustom(true);
      setPlaceholder(false);
      setLoading(false);
      return;
    }

    for (const candidate of BUNDLED_CANDIDATES) {
      try {
        const res = await fetch(candidate.url, { method: "HEAD", cache: "no-store" });
        if (!res.ok) continue;
        const type = res.headers.get("content-type") ?? "";
        if (!/audio|ogg|mpeg|wav|mp4/.test(type)) continue;
        audio.src = candidate.url;
        setHasTrack(true);
        setCustom(false);
        setPlaceholder(Boolean(candidate.placeholder));
        setLoading(false);
        return;
      } catch {
        /* пробуем следующий файл */
      }
    }

    setHasTrack(false);
    setPlaceholder(false);
    setLoading(false);
  }, [releaseObjectUrl]);

  useEffect(() => {
    void loadSource();
    const onChanged = () => {
      void loadSource();
    };
    window.addEventListener(TRACK_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(TRACK_CHANGED_EVENT, onChanged);
  }, [loadSource]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !hasTrack) return;
    if (audio.paused) {
      try {
        setError(null);
        await audio.play();
        setStarted(true);
        onPlayed();
      } catch {
        setError("Браузер не дал запустить воспроизведение. Нажми ещё раз.");
      }
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration)) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  return (
    <div className="player" aria-label={`Трек «${TRACK_TITLE}»`}>
      <div className="player__head">
        <span className="player__kicker">Музыкальный подарок</span>
        <h2 className="player__title">{TRACK_TITLE}</h2>
        {custom ? (
          <span className="player__badge player__badge--local">тестовый трек · только этот браузер</span>
        ) : placeholder ? (
          <span className="player__badge player__badge--local">демо · ждёт твой файл</span>
        ) : hasTrack ? (
          <span className="player__badge">из сборки</span>
        ) : null}
      </div>

      {loading ? (
        <p className="player__empty">Ищу трек в сборке…</p>
      ) : !hasTrack ? (
        <div className="player__empty">
          <PixelIcon name="note" size={18} />
          <p>
            <strong>Трек ещё не в сборке.</strong>
            <span>
              Положи файл <code>public/audio/Илюха, с днём рождения.mp3</code> — и он заиграет
              здесь.
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="player__controls">
            <button
              type="button"
              className="player__play"
              onClick={toggle}
              aria-label={playing ? "Пауза" : `Включить трек «${TRACK_TITLE}»`}
            >
              <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            </button>

            <div className="player__timeline">
              <input
                type="range"
                min={0}
                max={Math.max(1, duration || 1)}
                step={0.1}
                value={Math.min(current, duration || 0)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Перемотка трека"
                disabled={!duration}
              />
              <div className="player__times">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <p className="player__error" role="alert">
              {error}
            </p>
          ) : null}

          {started && !error ? (
            <p className="player__hint">Фоновая музыка выключена, пока играет трек.</p>
          ) : null}
        </>
      )}

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          silenceMusic();
        }}
        onPause={() => {
          setPlaying(false);
          restoreMusic();
        }}
        onEnded={() => {
          setPlaying(false);
          restoreMusic();
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setError(null);
        }}
        onError={(e) => {
          setPlaying(false);
          restoreMusic();
          setError(describeMediaError(e.currentTarget.error));
        }}
      />
    </div>
  );
}