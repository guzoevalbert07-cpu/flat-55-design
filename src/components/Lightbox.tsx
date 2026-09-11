import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Просмотр на весь экран: план, развёртки (SVG) и фото открываются крупно, с кнопками +/− и прокруткой.
 * Базовая ширина — не меньше 1000 px даже на телефоне, чтобы подписи на схемах читались.
 */
type Item = { title: string; node: ReactNode; base?: number };
type Ctx = { open: (item: Item) => void };
const LightboxCtx = createContext<Ctx>({ open: () => undefined });

export function useLightbox() {
  return useContext(LightboxCtx);
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<Item | null>(null);
  const [zoom, setZoom] = useState(1);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const open = useCallback((it: Item) => {
    setItem(it);
    setZoom(1);
  }, []);
  const close = useCallback(() => setItem(null), []);

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.25));
    };
    window.addEventListener('keydown', onKey);
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, close]);

  const ctx = useMemo(() => ({ open }), [open]);
  const base = item ? Math.max(item.base ?? 1000, typeof window !== 'undefined' ? window.innerWidth - 16 : 1000) : 1000;

  return (
    <LightboxCtx.Provider value={ctx}>
      {children}
      {item && (
        <div className="lb" role="dialog" aria-modal="true" aria-label={item.title}>
          <div className="lb-bar">
            <div className="lb-title">{item.title}</div>
            <div className="lb-ctl" role="group" aria-label="Масштаб">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Уменьшить">
                −
              </button>
              <button onClick={() => setZoom(1)} aria-label="Сбросить масштаб">
                {Math.round(zoom * 100)} %
              </button>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label="Увеличить">
                +
              </button>
            </div>
            <button className="lb-close" ref={closeBtn} onClick={close} aria-label="Закрыть">
              ✕
            </button>
          </div>
          <div className="lb-body" onDoubleClick={() => setZoom((z) => (z >= 2 ? 1 : z + 1))}>
            <div className="lb-content" style={{ width: Math.round(base * zoom) }}>
              {item.node}
            </div>
          </div>
          <div className="lb-hint">Прокручивайте схему пальцем, кнопки + / − меняют масштаб, двойной тап — крупнее</div>
        </div>
      )}
    </LightboxCtx.Provider>
  );
}

/** Кнопка «Открыть крупно» для карточки со схемой или фото. */
export function OpenLarge({ title, node, base, label = 'Открыть крупно' }: { title: string; node: ReactNode; base?: number; label?: string }) {
  const { open } = useLightbox();
  return (
    <button className="open-large" onClick={() => open({ title, node, base })}>
      ⤢ {label}
    </button>
  );
}
