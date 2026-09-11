import photos from '../data/photos.json';
import type { Estimate } from '../types';

export default function Footer({ estimate }: { estimate: Estimate }) {
  const d = new Date(estimate.meta.generatedAt);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const credits = (photos as { author: string; authorUrl: string; source: string; sourceUrl: string }[]).filter(
    (p, i, a) => a.findIndex((x) => x.author === p.author) === i,
  );
  return (
    <footer>
      <div className="wrap">
        <p>
          <b>Дата:</b> смета выгружена {date} Цены — ориентир по Саратову на сентябрь 2026; перед закупкой сверяйте по ссылкам.
        </p>
        <p>
          <b>Источники цен:</b> Лемана ПРО Саратов, Профком, Сантехника.ру Саратов, Паркет73, Олимп Паркета, потолочные компании Саратова
          (СуперПотолок, РВС-Сервис, НатПотолокСрт), Hoff Саратов (Happy Молл), DNS Саратов, фабрика «Мария», Profi.ru Саратов. Файл сметы:{' '}
          {estimate.meta.source}.
        </p>
        <p>
          <b>Не учтено:</b> входная дверь (стоит — не трогаем), окна, лоджия, стояки, демонтаж и перенос стен (уже сделаны).
        </p>
        {credits.length > 0 ? (
          <div>
            <b>Фото:</b>
            <ul>
              {credits.map((c) => (
                <li key={c.author}>
                  <a href={c.authorUrl} target="_blank" rel="noopener">
                    {c.author}
                  </a>{' '}
                  —{' '}
                  <a href={c.sourceUrl} target="_blank" rel="noopener">
                    {c.source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted small">Фотореференсы появятся после подключения ключа Unsplash или Pexels (см. README).</p>
        )}
        <p className="muted small">План и развёртки — схематичные, масштаб условный, размеры по плану БТИ и правкам брата. Рабочие чертежи делаются после выбора опции.</p>
      </div>
    </footer>
  );
}
