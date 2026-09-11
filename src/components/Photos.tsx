import type { Option } from '../data/options';
import photos from '../data/photos.json';
import { useLightbox } from './Lightbox';

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
  license?: string;
  query: string;
};

/** Секция скрыта, пока scripts/fetch-photos.ts не заполнил src/data/photos.json (нужен ключ в .env). */
export default function Photos({ opt }: { opt: Option }) {
  const list = (photos as Photo[]).filter((p) => p.option === opt.key);
  const { open } = useLightbox();
  if (list.length === 0) return null;
  return (
    <section className="section" id="photos" aria-labelledby="photos-h">
      <div className="wrap">
        <div className="kicker">Фотореференсы · {opt.name}</div>
        <h2 id="photos-h">Как это выглядит вживую</h2>
        <p className="lead">Бесплатные фото с открытой лицензией в стилистике опции — для настроения, не проект этой квартиры. Нажмите на фото, чтобы открыть крупно.</p>
        <div className="photos">
          {list.map((p) => (
            <figure key={p.src} style={{ margin: 0 }}>
              <img
                src={`${import.meta.env.BASE_URL}${p.src}`}
                width={p.width}
                height={p.height}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                role="button"
                tabIndex={0}
                onClick={() => open({ title: `${p.alt} — ${p.author}`, node: <img src={`${import.meta.env.BASE_URL}${p.src}`} alt={p.alt} />, base: 0 })}
                onKeyDown={(e) => e.key === 'Enter' && open({ title: `${p.alt} — ${p.author}`, node: <img src={`${import.meta.env.BASE_URL}${p.src}`} alt={p.alt} />, base: 0 })}
              />
              <figcaption className="cap">
                <a href={p.authorUrl} target="_blank" rel="noopener">
                  {p.author}
                </a>{' '}
                · {p.source}
                {p.license ? ` · ${p.license}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
