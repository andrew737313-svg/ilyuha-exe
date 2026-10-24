import { useEffect, useMemo, useRef, useState } from "react";
import { useTexts } from "./TextsProvider";
import {
  collectEditableTexts,
  isTextOverrideMap,
  normalizeText,
  type EditableText,
} from "./text-overrides";
import {
  clearTrack,
  formatTrackSize,
  loadTrack,
  notifyTrackChanged,
  saveTrack,
} from "../audio/track-store";

export function AdminPanel() {
  const { overrides, shipped, merged, setText, removeText, reset, replaceAll, isOpen, setOpen } =
    useTexts();
  const [rows, setRows] = useState<EditableText[]>([]);
  const [query, setQuery] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [track, setTrack] = useState<{ name: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setRows(collectEditableTexts(document.body, merged));
  };

  useEffect(() => {
    if (!isOpen) return;
    setRows(collectEditableTexts(document.body, merged));
    setJsonDraft(JSON.stringify(merged, null, 2));
    setNotice(null);
    void loadTrack().then((stored) => {
      setTrack(stored ? { name: stored.name, size: stored.size } : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  const visible = useMemo(() => {
    const needle = normalizeText(query).toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.context} ${row.original} ${row.current}`.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  if (!isOpen) return null;

  const valueFor = (row: EditableText) => overrides[row.key] ?? shipped[row.key] ?? row.original;

  const onEdit = (row: EditableText, value: string) => {
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
      window.setTimeout(() => setRows(collectEditableTexts(document.body, parsed)), 60);
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
      window.setTimeout(() => setRows(collectEditableTexts(document.body, parsed)), 60);
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
          placeholder="Поиск: «парта», «письмо», «завод»…"
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
        Меняй текст прямо здесь — страница обновится сразу, правки сохраняются в этом браузере.
        Чтобы их увидел Илюха, нажми «Экспорт texts.json» и положи файл в <code>public/</code> перед
        сборкой (или рядом с <code>index.html</code> на хостинге) — он подхватится при загрузке.
        Окно открывается по <code>?admin</code>, <code>#admin</code>, Ctrl+Alt+A или пятью кликами
        по логотипу.
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
        {visible.map((row) => {
          const value = valueFor(row);
          const edited = overrides[row.key] !== undefined;
          return (
            <label key={row.key} className={`tx__row ${edited ? "is-edited" : ""}`}>
              <span className="tx__row-meta">
                <span className="tx__row-context">{row.context}</span>
                <span className="tx__row-state">{edited ? "изменено" : "по умолчанию"}</span>
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
        {visible.length === 0 ? <p className="tx__empty">Ничего не нашлось.</p> : null}
      </div>
    </div>
  );
}