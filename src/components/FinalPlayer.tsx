import { useCallback, useEffect, useRef, useState } from "react";
import { PixelIcon } from "./PixelIcon";
import { useAudio } from "../audio/AudioProvider";
import { loadTrack, TRACK_CHANGED_EVENT } from "../audio/track-store";

const base = import.meta.env.BASE_URL;
const BUNDLED_CANDIDATES = [
  { url: `${base}audio/old-save.mp3`, label: "old-save.mp3" },
  { url: `${base}audio/old-save.m4a`, label: "old-save.m4a" },
  { url: `${base}audio/old-save.ogg`, label: "old-save.ogg" },
  { url: `${base}audio/old-save-demo.wav`, label: "old-save-demo.wav" },
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
      return "Браузер не смог декодировать этот файл. Попробуй mp3, m4a, ogg или wav.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Формат не поддерживается этим браузером.";
    default:
      return "Неизвестная ошибка воспроизведения.";
  }
}

export function FinalPlayer({ onPlayed }: { onPlayed: () => void }) {
  const { duck, sfx } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrl = useRef<string | null>(null);

  const [trackName, setTrackName] = useState<string | null>(null);
  const [trackKind, setTrackKind] = useState<"bundled" | "local" | "custom" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  // A track added in the hidden admin panel wins; otherwise the bundled file.
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
      setTrackName(stored.name);
      setTrackKind("custom");
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
        setTrackName(candidate.label);
        setTrackKind("bundled");
        setLoading(false);
        return;
      } catch {
        /* try the next candidate */
      }
    }

    setTrackName(null);
    setTrackKind(null);
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
    if (!audio || !trackName) return;
    if (audio.paused) {
      try {
        setError(null);
        await audio.play();
        setStarted(true);
        onPlayed();
      } catch {
        setError(
          "Браузер не дал запустить воспроизведение. Нажми ещё раз или выбери другой файл.",
        );
      }
    } else {
      audio.pause();
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|ogg|oga|wav|flac|aac)$/i.test(file.name)) {
      setError("Это не похоже на аудиофайл. Нужен mp3, m4a, ogg или wav.");
      return;
    }

    audio.pause();
    releaseObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    audio.src = url;
    setTrackName(file.name);
    setTrackKind("local");
    setError(null);
    setCurrent(0);
    setDuration(0);
    setPlaying(false);
    sfx("select");
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration)) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  return (
    <div className="player" aria-label="Персональный трек «Старый сейв»">
      <div className="player__head">
        <span className="player__kicker">Музыкальный подарок</span>
        <h2 className="player__title">Старый сейв</h2>
        {trackKind === "bundled" ? (
          <span className="player__badge">встроенная чиптюн-версия</span>
        ) : trackKind === "custom" ? (
          <span className="player__badge player__badge--local">свой трек</span>
        ) : trackKind === "local" ? (
          <span className="player__badge player__badge--local">локальный файл</span>
        ) : null}
      </div>

      {loading ? (
        <p className="player__empty">Ищу трек в сборке…</p>
      ) : !trackName ? (
        <div className="player__empty">
          <PixelIcon name="note" size={18} />
          <p>
            <strong>Трек пока не загружен.</strong>
            <span>
              Положи mp3 в <code>public/audio/old-save.mp3</code> — или выбери файл вручную.
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="player__file">
            <PixelIcon name="note" size={14} />
            <span title={trackName}>{trackName}</span>
          </div>

          <div className="player__controls">
            <button
              type="button"
              className="player__play"
              onClick={toggle}
              aria-label={playing ? "Пауза" : "Воспроизвести"}
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
            <p className="player__hint">Фоновая музыка приглушена, пока играет трек.</p>
          ) : null}
        </>
      )}

      <div className="player__actions">
        <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>
          <PixelIcon name="disk" size={12} />
          <span className="btn__label">{trackName ? "Выбрать другой файл" : "Выбрать файл"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac"
          className="visually-hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <p className="player__note">
        Файл, выбранный вручную, звучит только в этом браузере. Чтобы песня была слышна по
        опубликованной ссылке, её нужно положить в проект и развернуть вместе с ним.
      </p>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          duck(true);
        }}
        onPause={() => {
          setPlaying(false);
          duck(false);
        }}
        onEnded={() => {
          setPlaying(false);
          duck(false);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setError(null);
        }}
        onError={(e) => {
          setPlaying(false);
          duck(false);
          setError(describeMediaError(e.currentTarget.error));
        }}
      />
    </div>
  );
}