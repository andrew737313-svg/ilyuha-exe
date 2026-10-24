/**
 * Renders the built-in "Старый сейв" demo track to a WAV file.
 *
 * The game's foreground music is a live Web Audio loop; this file is the same
 * composition bounced to disk so the final chapter ships with a real, playable
 * audio file out of the box. Replace public/audio/old-save.wav with the actual
 * Suno export (old-save.mp3) and the player will prefer it automatically.
 *
 * Run: node tools/render-audio.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ARP,
  BASS,
  DRUMS,
  LOOP_SECONDS,
  MELODY,
  STEP_SECONDS,
} from "../src/audio/chiptune.ts";

const SR = 22050;
const TAIL = 2.2;
const DURATION = LOOP_SECONDS + TAIL;
const TOTAL = Math.floor(DURATION * SR);
const mix = new Float32Array(TOTAL);

const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Deterministic PRNG so rebuilds are byte-identical. */
let seed = 0x2f6e2b1;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
};

function addPulse(start: number, freq: number, length: number, gain: number, duty: number) {
  const startSample = Math.floor(start * SR);
  const lengthSamples = Math.floor(length * SR);
  const attack = Math.max(1, Math.floor(0.006 * SR));
  const release = Math.max(1, Math.floor(0.05 * SR));
  const harmonics: { n: number; amp: number }[] = [];
  for (let n = 1; n * freq < SR / 2 - 200 && n < 28; n += 1) {
    const amp = (2 / (n * Math.PI)) * Math.sin(Math.PI * n * duty);
    if (Math.abs(amp) > 1e-4) harmonics.push({ n, amp });
  }

  for (let i = 0; i < lengthSamples; i += 1) {
    const idx = startSample + i;
    if (idx >= TOTAL) break;
    const t = i / SR;
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > lengthSamples - release) env = Math.max(0, (lengthSamples - i) / release);
    const decay = Math.exp(-t * 1.15);
    let sample = 0;
    for (const h of harmonics) {
      sample += h.amp * Math.sin(2 * Math.PI * freq * h.n * t);
    }
    mix[idx] += sample * gain * env * decay * 0.55;
  }
}

function addTriangle(start: number, freq: number, length: number, gain: number) {
  const startSample = Math.floor(start * SR);
  const lengthSamples = Math.floor(length * SR);
  for (let i = 0; i < lengthSamples; i += 1) {
    const idx = startSample + i;
    if (idx >= TOTAL) break;
    const t = i / SR;
    const phase = (freq * t) % 1;
    const tri = 4 * Math.abs(phase - 0.5) - 1;
    const env = Math.min(1, i / (0.01 * SR)) * Math.exp(-t * 1.6);
    mix[idx] += tri * gain * env;
  }
}

function addKick(start: number) {
  const startSample = Math.floor(start * SR);
  for (let i = 0; i < 0.18 * SR; i += 1) {
    const idx = startSample + i;
    if (idx >= TOTAL) break;
    const t = i / SR;
    const f = 150 * Math.exp(-t * 24) + 44;
    const env = Math.exp(-t * 22);
    mix[idx] += Math.sin(2 * Math.PI * f * t) * 0.5 * env;
  }
}

function addSnare(start: number) {
  const startSample = Math.floor(start * SR);
  let lp = 0;
  for (let i = 0; i < 0.13 * SR; i += 1) {
    const idx = startSample + i;
    if (idx >= TOTAL) break;
    const t = i / SR;
    const env = Math.exp(-t * 34);
    const noise = rand();
    lp = lp * 0.55 + noise * 0.45;
    mix[idx] += (lp * 0.5 + Math.sin(2 * Math.PI * 190 * t) * 0.18) * env;
  }
}

function addHat(start: number) {
  const startSample = Math.floor(start * SR);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < 0.035 * SR; i += 1) {
    const idx = startSample + i;
    if (idx >= TOTAL) break;
    const t = i / SR;
    const noise = rand();
    hp = 0.92 * (hp + noise - prev);
    prev = noise;
    mix[idx] += hp * 0.09 * Math.exp(-t * 90);
  }
}

const at = (step: number) => step * STEP_SECONDS;

for (const ev of MELODY) {
  const freq = NOTE(ev.midi);
  const len = ev.len * STEP_SECONDS;
  addPulse(at(ev.step), freq, len, 0.16, 0.25);
  addPulse(at(ev.step), freq * 1.0015, len, 0.06, 0.25);
}
for (const ev of BASS) {
  addTriangle(at(ev.step), NOTE(ev.midi), ev.len * STEP_SECONDS, 0.26);
}
for (const ev of ARP) {
  addPulse(at(ev.step), NOTE(ev.midi), Math.max(0.05, ev.len * STEP_SECONDS * 0.85), 0.035, 0.125);
}
for (const hit of DRUMS) {
  if (hit.kind === "kick") addKick(at(hit.step));
  else if (hit.kind === "snare") addSnare(at(hit.step));
  else addHat(at(hit.step));
}

// Gentle one-pole low-pass + master fade in/out + soft clip.
let lp = 0;
const fadeIn = 1.0 * SR;
const fadeOut = 2.0 * SR;
for (let i = 0; i < TOTAL; i += 1) {
  lp = lp * 0.55 + mix[i] * 0.45;
  let sample = lp;
  if (i < fadeIn) sample *= i / fadeIn;
  if (i > TOTAL - fadeOut) sample *= (TOTAL - i) / fadeOut;
  mix[i] = Math.tanh(sample * 1.15) * 0.92;
}

// Normalise to a comfortable peak.
let peak = 0;
for (let i = 0; i < TOTAL; i += 1) peak = Math.max(peak, Math.abs(mix[i]));
const norm = peak > 0 ? 0.94 / peak : 1;

const bytes = Buffer.alloc(44 + TOTAL * 2);
bytes.write("RIFF", 0, "ascii");
bytes.writeUInt32LE(36 + TOTAL * 2, 4);
bytes.write("WAVE", 8, "ascii");
bytes.write("fmt ", 12, "ascii");
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22); // mono
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36, "ascii");
bytes.writeUInt32LE(TOTAL * 2, 40);
for (let i = 0; i < TOTAL; i += 1) {
  const v = Math.max(-1, Math.min(1, mix[i] * norm));
  bytes.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

const out = resolve(import.meta.dirname, "..", "public", "audio", "old-save-demo.wav");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, bytes);
console.log(
  `wrote public/audio/old-save-demo.wav — ${DURATION.toFixed(1)} s, ${(bytes.length / 1024 / 1024).toFixed(2)} MB`,
);