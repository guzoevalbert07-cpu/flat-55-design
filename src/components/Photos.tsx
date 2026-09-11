import type { Option } from '../data/options';
import photos from '../data/photos.json';

export type Photo = {
  option: Option['key'];
  src: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  authorUrl: string;
  source: string;
  sourceUrl: string;
  query: string;
};

/** Секция скрыта, пока scripts/fetch-photos.ts не заполнил src/data/photos.json (нужен ключ в .env). */
export default function Photos({ opt }: { opt: Option }) {
  const list = (photos as Photo[]).filter((p) => p.option === opt.key);
  if (list.length === 0) return null;
  return (
    <section className="section" id="photos" aria-labelledby="photos-h">
      <div className="wrap">
        <div className="kicker">Фотореференсы · {opt.name}</div>
        <h2 id="photos-h">Как это выглядит вживую</h2>
        <p className="lead">Бесплатные стоковые фото в стилистике опции — для настроения, не проект этой квартиры.</p>
        <div className="photos">
          {list.map((p) => (
            <figure key={p.src} style={{ margin: 0 }}>
              <img src={`${import.meta.env.BASE_URL}${p.src}`} width={p.width} height={p.height} alt={p.alt} loading="lazy" decoding="async" />
              <figcaption className="cap">
                <a href={p.authorUrl} target="_blank" rel="noopener">
                  {p.author}
                </a>{' '}
                · {p.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
