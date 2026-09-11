import photos from '../data/photos.json';
import type { Estimate } from '../types';

export default function Footer({ estimate }: { estimate: Estimate }) {
  const d = new Date(estimate.meta.generatedAt);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const credits = (photos as { author: string; authorUrl: string; source: string; sourceUrl: string; license?: string; licenseUrl?: string }[]).filter(
    (p, i, a) => a.findIndex((x) => x.sourceUrl === p.sourceUrl) === i,
  );
  return (
    <footer>
      <div className="wrap">
        <p>
          <b>Дата:</b> смета выгружена {date} {estimate.meta.priceNote || 'Цены — ориентир; перед закупкой сверяйте по ссылкам.'}
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
            <b>Фото (бесплатные, с открытой лицензией; это референсы стиля, не проект этой квартиры):</b>
            <ul>
              {credits.map((c) => (
                <li key={c.sourceUrl}>
                  <a href={c.authorUrl} target="_blank" rel="noopener">
                    {c.author}
                  </a>{' '}
                  —{' '}
                  <a href={c.sourceUrl} target="_blank" rel="noopener">
                    {c.source}
                  </a>
                  {c.license ? (
                    <>
                      {' · '}
                      {c.licenseUrl ? (
                        <a href={c.licenseUrl} target="_blank" rel="noopener">
                          {c.license}
                        </a>
                      ) : (
                        c.license
                      )}
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted small">Фотореференсы: `npm run photos` (см. README).</p>
        )}
        <p className="muted small">План и развёртки — схематичные, масштаб условный, размеры по плану БТИ и правкам брата. Рабочие чертежи делаются после выбора опции.</p>
      </div>
    </footer>
  );
}
