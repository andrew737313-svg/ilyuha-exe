import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { audioEngine, type SfxName } from "./engine";

const AUDIO_KEY = "ilyuha-exe-audio-v1";

type AudioSettings = {
  musicOn: boolean;
  sfxOn: boolean;
  musicVolume: number;
  sfxVolume: number;
};

const defaultSettings: AudioSettings = {
  musicOn: true,
  sfxOn: true,
  musicVolume: 0.5,
  sfxVolume: 0.65,
};

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      musicOn: typeof parsed.musicOn === "boolean" ? parsed.musicOn : defaultSettings.musicOn,
      sfxOn: typeof parsed.sfxOn === "boolean" ? parsed.sfxOn : defaultSettings.sfxOn,
      musicVolume:
        typeof parsed.musicVolume === "number"
          ? Math.min(1, Math.max(0, parsed.musicVolume))
          : defaultSettings.musicVolume,
      sfxVolume:
        typeof parsed.sfxVolume === "number"
          ? Math.min(1, Math.max(0, parsed.sfxVolume))
          : defaultSettings.sfxVolume,
    };
  } catch {
    return defaultSettings;
  }
}

type AudioApi = {
  settings: AudioSettings;
  unlocked: boolean;
  unavailable: boolean;
  unlock: () => Promise<void>;
  sfx: (name: SfxName) => void;
  setMusicEnabled: (on: boolean) => void;
  setSfxEnabled: (on: boolean) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  duck: (on: boolean) => void;
};

const AudioContextValue = createContext<AudioApi | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(loadSettings);
  const [unlocked, setUnlocked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Push settings into the engine (safe before unlock: they are just stored).
  useEffect(() => {
    audioEngine.setMusicEnabled(settings.musicOn);
    audioEngine.setSfxEnabled(settings.sfxOn);
    audioEngine.setMusicVolume(settings.musicVolume);
    audioEngine.setSfxVolume(settings.sfxVolume);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const unlock = useCallback(async () => {
    if (!("AudioContext" in window) && !("webkitAudioContext" in window)) {
      setUnavailable(true);
      return;
    }
    await audioEngine.unlock();
    const active = audioEngine.unlocked && audioEngine.debugState().context === "running";
    setUnlocked(active);
    if (active) {
      audioEngine.setMusicEnabled(settingsRef.current.musicOn);
      audioEngine.setMusicVolume(settingsRef.current.musicVolume);
      audioEngine.setSfxVolume(settingsRef.current.sfxVolume);
    }
  }, []);

  const sfx = useCallback((name: SfxName) => {
    audioEngine.sfx(name);
  }, []);

  const value = useMemo<AudioApi>(
    () => ({
      settings,
      unlocked,
      unavailable,
      unlock,
      sfx,
      duck: (on: boolean) => audioEngine.setDucked(on),
      setMusicEnabled: (on) => {
        setSettings((s) => ({ ...s, musicOn: on }));
        audioEngine.setMusicEnabled(on);
      },
      setSfxEnabled: (on) => {
        setSettings((s) => ({ ...s, sfxOn: on }));
        audioEngine.setSfxEnabled(on);
      },
      setMusicVolume: (v) => {
        setSettings((s) => ({ ...s, musicVolume: v }));
        audioEngine.setMusicVolume(v);
      },
      setSfxVolume: (v) => {
        setSettings((s) => ({ ...s, sfxVolume: v }));
        audioEngine.setSfxVolume(v);
      },
    }),
    [settings, unlocked, unavailable, unlock, sfx],
  );

  return <AudioContextValue.Provider value={value}>{children}</AudioContextValue.Provider>;
}

export function useAudio(): AudioApi {
  const ctx = useContext(AudioContextValue);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}