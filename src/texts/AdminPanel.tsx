import { useEffect, useMemo, useRef, useState } from "react";
import { SCREENS } from "../game/content";
import { useTexts } from "./TextsProvider";
import {
  collectEditableTexts,
  isTextOverrideMap,
  normalizeText,
} from "./text-overrides";
import catalogData from "./catalog.json";
import {
  clearTrack,
  formatTrackSize,
  loadTrack,
  notifyTrackChanged,
  saveTrack,
} from "../audio/track-store";

type CatalogEntry = { text: string; group: string; context: string };

type PanelRow = {
  key: string;
  original: string;
  current: string;
  context: string;
  group: string;
  /** Text is on screen right now (vs. catalog-only — applies when its chapter opens). */
  live: boolean;
};

const GROUP_ORDER = [
  "boot",
  "profile",
  "school",
  "minigame",
  "family",
  "work",
  "patch",
  "final",
  "settings",
  "chrome",
  "tab",
] as const;

const GROUP_LABELS: Record<string, string> = {
  settings: "Настройки и достижения",
  chrome: "Шапка и подвал",
  tab: "Заголовок вкладки",
};

function groupLabel(group: string): string {
  if (GROUP_LABELS[group]) return GROUP_LABELS[group];
  const screen = SCREENS.find((s) => s.id === group);
  return screen ? `${screen.chapter} · ${screen.title}` : group;
}

/** The game keeps its state in localStorage — read the current chapter from it. */
function currentGameScreen(): string {
  try {
    const raw = window.localStorage.getItem("ilyuha-exe-patch32-v1");
    if (!raw) return "boot";
    const screen = JSON.parse(raw)?.screen;
    return typeof screen === "string" ? screen : "boot";
  } catch {
    return "boot";
  }
}

function groupOfContext(context: string, fallback: string): string {
  if (context.includes("заголовок вкладки")) return "tab";
  if (context.includes("site-foot") || context.includes("hud")) return "chrome";
  if (context.includes("sheet")) return "settings";
  return fallback;
}

function buildRows(merged: Record<string, string>): PanelRow[] {
  const rows: PanelRow[] = [];
  const seen = new Set<string>();

  // 1. Everything on screen right now (edits apply instantly).
  const screen = currentGameScreen();
  for (const live of collectEditableTexts(document.body, merged)) {
    if (seen.has(live.key)) continue;
    seen.add(live.key);
    rows.push({
      key: live.key,
      original: live.original,
      current: merged[live.key] ?? live.key,
      context: live.context,
      group: groupOfContext(live.context, screen),
      live: true,
    });
  }

  // 2. The rest of the game from the catalog (edits apply when the chapter opens).
  for (const entry of (catalogData as CatalogEntry[]).filter((e) => !seen.has(e.text))) {
    seen.add(entry.text);
    rows.push({
      key: entry.text,
      original: entry.text,
      current: merged[entry.text] ?? entry.text,
      context: entry.context,
      group: entry.group,
      live: false,
    });
  }

  rows.sort(
    (a, b) =>
      GROUP_ORDER.indexOf(a.group as (typeof GROUP_ORDER)[number]) -
        GROUP_ORDER.indexOf(b.group as (typeof GROUP_ORDER)[number]) ||
      Number(b.live) - Number(a.live),
  );
  return rows;
}

export function AdminPanel() {
  const { overrides, shipped, merged, setText, removeText, reset, replaceAll, isOpen, setOpen } =
    useTexts();
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [query, setQuery] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [track, setTrack] = useState<{ name: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setRows(buildRows(merged));
  };

  useEffect(() => {
    if (!isOpen) return;
    setRows(buildRows(merged));
    setJsonDraft(JSON.stringify(merged, null, 2));
    setNotice(null);
    void loadTrack().then((stored) => {
      setTrack(stored ? { name: stored.name, size: stored.size } : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  // Must run before the early return below: the hook order has to stay stable
  // between the closed and the open state.
  const grouped = useMemo(() => {
    const needle = normalizeText(query).toLowerCase();
    const visible = needle
      ? rows.filter((row) =>
          `${row.group} ${row.context} ${row.original} ${row.current}`.toLowerCase().includes(needle),
        )
      : rows;
    const map = new Map<string, PanelRow[]>();
    for (const row of visible) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return [...map.entries()];
  }, [rows, query]);

  const onTrackFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await saveTrack(file);
      notifyTrackChanged();
      setTrack({ name: file.name, size: file.size });
      setNotice("Трек сохранён и уже играет в этом браузере.");
    } catch {
      setNotice("Не удалось сохранить трек в браузере (нет места или режим приватности).");
    }
  };

  const removeTrackFile = async () => {
    await clearTrack();
    notifyTrackChanged();
    setTrack(null);
    setNotice("Свой трек убран — играет встроенная чиптюн-версия.");
  };

  const downloadTrackFile = async () => {
    const stored = await loadTrack();
    if (!stored) return;
    const url = URL.createObjectURL(stored.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = stored.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  if (!isOpen) return null;

  const onEdit = (row: PanelRow, value: string) => {
    if (normalizeText(value) === normalizeText(row.original)) removeText(row.key);
    else setText(row.key, value);
  };

  const exportJson = () => {
    const payload = JSON.stringify(merged, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "texts.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNotice("texts.json скачан. Положи его в public/ перед сборкой или рядом с index.html.");
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isTextOverrideMap(parsed)) {
        setNotice("Файл не похож на texts.json: нужен объект «строка → строка».");
        return;
      }
      replaceAll(parsed);
      setJsonDraft(JSON.stringify(parsed, null, 2));
      setNotice(`Загружено правок: ${Object.keys(parsed).length}.`);
      window.setTimeout(() => setRows(buildRows(parsed)), 60);
    } catch {
      setNotice("Не получилось прочитать JSON.");
    }
  };

  const applyJson = () => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (!isTextOverrideMap(parsed)) {
        setNotice("Нужен объект вида { \"старый текст\": \"новый текст\" }.");
        return;
      }
      replaceAll(parsed);
      setNotice(`Применено правок: ${Object.keys(parsed).length}.`);
      window.setTimeout(() => setRows(buildRows(parsed)), 60);
    } catch {
      setNotice("Не получилось прочитать JSON.");
    }
  };

  return (
    <div
      className="tx"
      ref={panelRef}
      data-texts-ui=""
      role="dialog"
      aria-modal="true"
      aria-label="Редактор текстов"
    >
      <header className="tx__head">
        <div className="tx__title">
          <span className="tx__kicker">СЛУЖЕБНОЕ · НЕ ДЛЯ ГОСТЯ</span>
          <h2>Редактор текстов</h2>
        </div>
        <div className="tx__stats">
          <span>
            правок: <strong>{Object.keys(overrides).length}</strong>
          </span>
          <span>
            файл: <strong>{Object.keys(shipped).length}</strong>
          </span>
          <span>
            полей: <strong>{rows.length}</strong>
          </span>
        </div>
        <button type="button" className="tx__close" onClick={() => setOpen(false)}>
          Закрыть ✕
        </button>
      </header>

      <div className="tx__bar">
        <input
          type="search"
          className="tx__search"
          placeholder="Поиск по всем главам: «парта», «письмо», «завод»…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="tx__btn" onClick={refresh}>
          Обновить список
        </button>
        <button type="button" className="tx__btn" onClick={exportJson}>
          Экспорт texts.json
        </button>
        <button type="button" className="tx__btn" onClick={() => fileRef.current?.click()}>
          Импорт
        </button>
        <button type="button" className="tx__btn" onClick={() => setJsonOpen((open) => !open)}>
          {jsonOpen ? "Скрыть JSON" : "JSON"}
        </button>
        <button
          type="button"
          className="tx__btn tx__btn--danger"
          onClick={() => {
            if (!window.confirm("Убрать все правки текста в этом браузере?")) return;
            reset();
            setJsonDraft("{}");
            setNotice("Правки сброшены. Показаны тексты из сборки.");
            window.setTimeout(refresh, 60);
          }}
        >
          Сбросить всё
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="tx__file"
          onChange={(event) => {
            void importFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      <p className="tx__hint">
        Здесь собраны тексты всех восьми глав — искать и менять можно любую фразу, даже ту, что
        сейчас не на экране: правка применится, когда глава откроется. Строки текущей главы
        меняются мгновенно. Правки живут в этом браузере; чтобы их увидел Илюха — «Экспорт
        texts.json», файл в <code>public/</code> и коммит в репозиторий (сайт пересоберётся сам).
        Вход: <code>?admin</code>, <code>#admin</code>, Ctrl+Alt+A или пять кликов по логотипу.
      </p>

      <section className="tx__track">
        <div className="tx__track-head">
          <span className="tx__track-title">Финальный трек</span>
          <span className="tx__track-state">
            {track ? `${track.name} · ${formatTrackSize(track.size)}` : "встроенная чиптюн-версия"}
          </span>
        </div>
        <div className="tx__track-actions">
          <button type="button" className="tx__btn" onClick={() => trackRef.current?.click()}>
            Загрузить свой трек
          </button>
          {track ? (
            <button type="button" className="tx__btn" onClick={() => void downloadTrackFile()}>
              Скачать
            </button>
          ) : null}
          {track ? (
            <button type="button" className="tx__btn tx__btn--danger" onClick={() => void removeTrackFile()}>
              Убрать
            </button>
          ) : null}
        </div>
        <p className="tx__track-note">
          Свой трек звучит сразу в этом браузере (mp3, m4a, ogg, wav). Чтобы его услышал Илюха по
          ссылке — положи файл в <code>public/audio/old-save.mp3</code> и обнови сборку: на GitHub
          достаточно перетащить файл в эту папку, сайт пересоберётся сам.
        </p>
        <input
          ref={trackRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.ogg,.wav"
          className="tx__file"
          onChange={(event) => {
            void onTrackFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </section>

      {jsonOpen ? (
        <div className="tx__json">
          <textarea
            value={jsonDraft}
            spellCheck={false}
            onChange={(event) => setJsonDraft(event.target.value)}
            aria-label="JSON правок"
          />
          <div className="tx__json-actions">
            <button type="button" className="tx__btn" onClick={applyJson}>
              Применить JSON
            </button>
            <button
              type="button"
              className="tx__btn"
              onClick={() => setJsonDraft(JSON.stringify(merged, null, 2))}
            >
              Вернуть текущее
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="tx__notice">{notice}</p> : null}

      <div className="tx__list">
        {grouped.map(([group, groupRows]) => (
          <section key={group} className="tx__group">
            <h3 className="tx__group-title">
              {groupLabel(group)}
              <span className="tx__group-count">{groupRows.length}</span>
            </h3>
            {groupRows.map((row) => {
              const value = merged[row.key] ?? normalizeText(row.original);
              const edited = merged[row.key] !== undefined;
              return (
                <label key={row.key} className={`tx__row ${edited ? "is-edited" : ""}`}>
                  <span className="tx__row-meta">
                    <span className="tx__row-context">{row.context}</span>
                    <span className="tx__row-state">
                      {edited ? "изменено" : row.live ? "на экране" : "в каталоге"}
                    </span>
                    {edited ? (
                      <button
                        type="button"
                        className="tx__row-reset"
                        onClick={(event) => {
                          event.preventDefault();
                          removeText(row.key);
                        }}
                      >
                        вернуть
                      </button>
                    ) : null}
                  </span>
                  <textarea
                    value={value}
                    rows={Math.min(6, Math.max(2, Math.ceil(value.length / 70)))}
                    onChange={(event) => onEdit(row, event.target.value)}
                  />
                </label>
              );
            })}
          </section>
        ))}
        {grouped.length === 0 ? <p className="tx__empty">Ничего не нашлось.</p> : null}
      </div>
    </div>
  );
}