/**
 * Single, app-wide audio engine.
 *
 * - exactly one AudioContext for the whole game (no per-screen instances);
 * - one chiptune loop scheduler with sample-accurate look-ahead, so the music is
 *   seamless and keeps running while screens change;
 * - separate music / SFX buses with independent volume and a ducking node used
 *   when the final "Старый сейв" track starts playing.
 *
 * Nothing is created until the player performs a real gesture (button press),
 * which is what browsers require for audio.
 */
import {
  ARP,
  BASS,
  DRUMS,
  MELODY,
  STEP_SECONDS,
  STEPS_PER_LOOP,
  LOOP_SECONDS,
  type ChipEvent,
} from "./chiptune";

export type SfxName =
  | "click"
  | "select"
  | "confirm"
  | "deny"
  | "achieve"
  | "type"
  | "power"
  | "buff"
  | "error";

const LOOKAHEAD_SECONDS = 0.18;
const TICK_MS = 30;
const DUCK_LEVEL = 0.16;

type DrumKind = "kick" | "snare" | "hat";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const perceptual = (v: number) => Math.pow(clamp01(v), 1.6);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private duckNode: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private waves: Partial<Record<"pulse25" | "pulse12" | "pulse50", PeriodicWave>> = {};
  private noise: AudioBuffer | null = null;

  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private playing = false;

  private musicOn = true;
  private sfxOn = true;
  private musicVolume = 0.55;
  private sfxVolume = 0.7;
  private ducked = false;

  get unlocked() {
    return this.ctx !== null;
  }

  get musicPlaying() {
    return this.playing;
  }

  /** Must be called from a user gesture. Idempotent. */
  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor({ latencyHint: "interactive" });
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      const softener = ctx.createBiquadFilter();
      softener.type = "lowpass";
      softener.frequency.value = 8200;
      const duck = ctx.createGain();
      duck.gain.value = 1;
      musicBus.connect(softener).connect(duck).connect(master);

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = 0;
      sfxBus.connect(master);

      this.musicBus = musicBus;
      this.duckNode = duck;
      this.sfxBus = sfxBus;

      this.waves.pulse12 = this.buildPulse(0.125);
      this.waves.pulse25 = this.buildPulse(0.25);
      this.waves.pulse50 = this.buildPulse(0.5);
      this.noise = this.buildNoise();

      this.applyVolumes();

      // Suspended contexts are resumed on the same gesture.
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          /* the player can retry by pressing again */
        }
      }
    } else if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (this.musicOn) this.startMusic();
  }

  private buildPulse(duty: number): PeriodicWave {
    const ctx = this.ctx!;
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i += 1) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private buildNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ---------------------------------------------------------------- transport

  private startMusic() {
    if (!this.ctx || this.playing) return;
    if (this.ctx.state !== "running") return;
    this.playing = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.rampGain(this.musicBus, this.musicGain());
    this.timer = window.setInterval(this.tick, TICK_MS);
    this.tick();
  }

  private stopMusic() {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.rampGain(this.musicBus, 0, 0.08);
  }

  private tick = () => {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    if (ctx.state !== "running") return;

    // After tab throttling or a long frame the queue can fall behind; rebase it.
    if (this.nextStepTime < ctx.currentTime - 0.25) {
      this.nextStepTime = ctx.currentTime + 0.05;
    }

    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % STEPS_PER_LOOP;
      this.nextStepTime += STEP_SECONDS;
    }
  };

  private scheduleStep(step: number, time: number) {
    const idx = this.ensureIndex();
    for (const ev of idx.melody.get(step) ?? []) this.playMelody(ev, time);
    for (const ev of idx.bass.get(step) ?? []) this.playBass(ev, time);
    for (const ev of idx.arp.get(step) ?? []) this.playArp(ev, time);
    for (const hit of this.drumIndex.get(step) ?? []) this.playDrum(hit, time);
  }

  private drums: Map<number, DrumKind[]> | null = null;

  private get drumIndex(): Map<number, DrumKind[]> {
    if (!this.drums) {
      const map = new Map<number, DrumKind[]>();
      for (const hit of DRUMS) {
        const list = map.get(hit.step);
        if (list) list.push(hit.kind);
        else map.set(hit.step, [hit.kind]);
      }
      this.drums = map;
    }
    return this.drums;
  }

  // Linear scans above are O(n) per step; index them once at first use instead.
  private index: { melody: Map<number, ChipEvent[]>; bass: Map<number, ChipEvent[]>; arp: Map<number, ChipEvent[]> } | null =
    null;

  private ensureIndex() {
    if (this.index) return this.index;
    const build = (events: ChipEvent[]) => {
      const map = new Map<number, ChipEvent[]>();
      for (const ev of events) {
        const list = map.get(ev.step);
        if (list) list.push(ev);
        else map.set(ev.step, [ev]);
      }
      return map;
    };
    this.index = { melody: build(MELODY), bass: build(BASS), arp: build(ARP) };
    return this.index;
  }

  // ------------------------------------------------------------------ voices

  private playMelody(ev: ChipEvent, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const freq = 440 * Math.pow(2, (ev.midi - 69) / 12);
    const len = ev.len * STEP_SECONDS;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.waves.pulse25!);
    osc.frequency.setValueAtTime(freq, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.008);
    gain.gain.linearRampToValueAtTime(0.1, time + Math.min(0.1, len * 0.5));
    gain.gain.setValueAtTime(0.1, time + Math.max(0.02, len - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + len);

    osc.connect(gain).connect(this.musicBus);
    osc.start(time);
    osc.stop(time + len + 0.02);
  }

  private playBass(ev: ChipEvent, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const freq = 440 * Math.pow(2, (ev.midi - 69) / 12);
    const len = ev.len * STEP_SECONDS;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + len);

    osc.connect(filter).connect(gain).connect(this.musicBus);
    osc.start(time);
    osc.stop(time + len + 0.02);
  }

  private playArp(ev: ChipEvent, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const freq = 440 * Math.pow(2, (ev.midi - 69) / 12);
    const len = Math.max(0.05, ev.len * STEP_SECONDS * 0.9);
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.waves.pulse12!);
    osc.frequency.setValueAtTime(freq, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.045, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + len);

    osc.connect(gain).connect(this.musicBus);
    osc.start(time);
    osc.stop(time + len + 0.02);
  }

  private playDrum(kind: DrumKind, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;

    if (kind === "kick") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(48, time + 0.13);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.34, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      osc.connect(gain).connect(this.musicBus);
      osc.start(time);
      osc.stop(time + 0.18);
      return;
    }

    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (kind === "snare") {
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1900, time);
      filter.Q.value = 0.9;
      gain.gain.setValueAtTime(0.13, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      src.connect(filter).connect(gain).connect(this.musicBus);
      src.start(time);
      src.stop(time + 0.14);
      return;
    }

    filter.type = "highpass";
    filter.frequency.setValueAtTime(7200, time);
    gain.gain.setValueAtTime(0.035, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    src.connect(filter).connect(gain).connect(this.musicBus);
    src.start(time);
    src.stop(time + 0.04);
  }

  // -------------------------------------------------------------------- buses

  private musicGain() {
    return this.musicOn ? perceptual(this.musicVolume) * 0.85 : 0;
  }

  private applyVolumes() {
    if (this.musicBus) this.rampGain(this.musicBus, this.playing ? this.musicGain() : 0, 0.12);
    if (this.sfxBus) this.rampGain(this.sfxBus, this.sfxOn ? perceptual(this.sfxVolume) : 0, 0.08);
    if (this.duckNode) this.rampGain(this.duckNode, this.ducked ? DUCK_LEVEL : 1, 0.25);
  }

  private rampGain(node: GainNode | null, value: number, seconds = 0.15) {
    const ctx = this.ctx;
    if (!ctx || !node) return;
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), now);
    node.gain.linearRampToValueAtTime(Math.max(0.0001, value), now + seconds);
  }

  // ------------------------------------------------------------------- public

  setMusicEnabled(on: boolean) {
    this.musicOn = on;
    if (!this.ctx) return;
    if (on && !this.playing) this.startMusic();
    else if (!on && this.playing) this.stopMusic();
    else this.applyVolumes();
  }

  setSfxEnabled(on: boolean) {
    this.sfxOn = on;
    this.applyVolumes();
  }

  setMusicVolume(v: number) {
    this.musicVolume = clamp01(v);
    this.applyVolumes();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = clamp01(v);
    this.applyVolumes();
  }

  /** Lower the chiptune while the personal track plays. */
  setDucked(on: boolean) {
    this.ducked = on;
    if (this.duckNode) this.rampGain(this.duckNode, on ? DUCK_LEVEL : 1, on ? 0.4 : 0.6);
  }

  /** Одна мелодическая нота (мини-игра «Поставь на звонок»). midi 69 = ля 440 Гц. */
  note(midi: number, velocity = 1) {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || !this.sfxOn || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const dur = 0.22;
    const peak = 0.16 * Math.min(1, Math.max(0.2, velocity));
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    // Лёгкая октава сверху — «сименсный» призвук.
    const overtone = ctx.createOscillator();
    overtone.type = "square";
    overtone.frequency.setValueAtTime(freq * 2, t);
    const ogain = ctx.createGain();
    ogain.gain.setValueAtTime(0.0001, t);
    ogain.gain.linearRampToValueAtTime(peak * 0.35, t + 0.008);
    ogain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
    overtone.connect(ogain).connect(bus);
    overtone.start(t);
    overtone.stop(t + dur);
  }

  sfx(name: SfxName) {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || !this.sfxOn || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const tone = (
      freq: number,
      dur: number,
      type: OscillatorType,
      peak: number,
      slideTo?: number,
      wave?: PeriodicWave,
    ) => {
      const osc = ctx.createOscillator();
      if (wave) osc.setPeriodicWave(wave);
      else osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    switch (name) {
      case "click":
        tone(720, 0.045, "square", 0.16);
        break;
      case "select":
        tone(520, 0.05, "square", 0.14);
        tone(780, 0.06, "square", 0.1);
        break;
      case "confirm":
        tone(523.25, 0.07, "square", 0.16);
        window.setTimeout(() => this.sfx("select"), 70);
        break;
      case "deny":
        tone(180, 0.12, "sawtooth", 0.12, 110);
        break;
      case "achieve":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          window.setTimeout(() => {
            if (this.sfxOn) tone(f, 0.12, "square", 0.15);
          }, i * 75),
        );
        break;
      case "type":
        tone(880 + Math.random() * 260, 0.018, "square", 0.035);
        break;
      case "power":
        tone(60, 0.7, "sawtooth", 0.14, 420);
        tone(320, 0.5, "triangle", 0.1, 880);
        break;
      case "buff":
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          window.setTimeout(() => {
            if (this.sfxOn) tone(f, 0.16, "square", 0.14);
          }, i * 60),
        );
        break;
      case "error":
        tone(240, 0.16, "square", 0.14, 170);
        break;
    }
  }

  /** Used by the automated browser check; not shown in the UI. */
  debugState() {
    return {
      context: this.ctx ? this.ctx.state : "none",
      playing: this.playing,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      musicOn: this.musicOn,
      sfxOn: this.sfxOn,
      ducked: this.ducked,
      loopSeconds: LOOP_SECONDS,
    };
  }
}

export const audioEngine = new AudioEngine();

if (typeof window !== "undefined") {
  (window as unknown as { __ILYUHA_AUDIO__?: AudioEngine }).__ILYUHA_AUDIO__ = audioEngine;
}