import type { Option } from '../data/options';
import renders from '../data/renders.json';
import photos from '../data/photos.json';
import { useLightbox } from './Lightbox';

type Render = { option: Option['key']; view: string; order: number; title: string; src: string; width: number; height: number; kind: 'kontext' | 'schnell'; frame: string | null };
type Photo = { option: Option['key']; src: string; width: number; height: number; alt: string; author: string; authorUrl: string; source: string; sourceUrl: string; license?: string };

const NOW = [
  { src: 'renders/now-entrance.jpg', title: 'Вход: керамогранит уже уложен' },
  { src: 'renders/now-corridor.jpg', title: 'Проход к с/у: плитка в проёме' },
  { src: 'renders/now-wc.jpg', title: 'С/у: плитка, унитаз, колонка' },
  { src: 'renders/now-shower.jpg', title: 'Душевая: подиум и ниша' },
];

export default function Renders({ opt }: { opt: Option }) {
  const { open } = useLightbox();
  const base = import.meta.env.BASE_URL;
  const list = (renders as Render[]).filter((r) => r.option === opt.key).sort((a, b) => a.order - b.order);
  const stock = (photos as Photo[]).filter((p) => p.option === opt.key);
  if (stock.length === 0 && list.length === 0) return null;
  const img = (src: string, alt: string) => <img src={`${base}${src}`} alt={alt} />;
  return (
    <section className="section" id="photos" aria-labelledby="renders-h">
      <div className="wrap">
        <div className="kicker">Визуализации квартиры · {opt.name}</div>
        <h2 id="renders-h">Как будет выглядеть квартира в опции {opt.name}</h2>
        <p className="lead">
          {list.length >= 15
            ? `${list.length} видов по планировочному решению и материалам опции. `
            : `Пока ${list.length} ${list.length === 1 ? 'вид' : 'вида'} — полный набор из 16 видов на опцию (вход, коридор, с/у, душевая, кухня, зал, спальня, лоджия, детали) догружается. `}
          Вход, коридор и санузлы нарисованы по отделке из видео: тот же керамогранит у входа, ониксовая плитка, ниша и подиум душа, колонка за люком;
          остальные комнаты — по размерам плана. Нажмите на картинку, чтобы открыть крупно. Это иллюстрации замысла, сгенерированные нейросетью, а не
          рабочие чертежи: реальные модели мебели и техники — по смете и ссылкам ниже.
        </p>
        <div className="renders">
          {list.map((r) => (
            <figure className="render" key={r.view}>
              <img
                src={`${base}${r.src}`}
                width={r.width}
                height={r.height}
                alt={`${r.title} — опция ${opt.name}`}
                loading="lazy"
                decoding="async"
                role="button"
                tabIndex={0}
                onClick={() => open({ title: `${r.title} — ${opt.name}`, node: img(r.src, r.title), base: 0 })}
                onKeyDown={(e) => e.key === 'Enter' && open({ title: `${r.title} — ${opt.name}`, node: img(r.src, r.title), base: 0 })}
              />
              <figcaption>
                <b>{r.title}</b>
                {r.kind === 'kontext' && <span className="pill" style={{ marginLeft: 6 }}>по отделке из видео</span>}
              </figcaption>
            </figure>
          ))}
        </div>

        <details style={{ marginTop: 14 }}>
          <summary>Как сейчас — кадры из видео (что уже сделано)</summary>
          <div className="renders now">
            {NOW.map((n) => (
              <figure className="render" key={n.src}>
                <img
                  src={`${base}${n.src}`}
                  alt={n.title}
                  loading="lazy"
                  role="button"
                  tabIndex={0}
                  onClick={() => open({ title: n.title, node: img(n.src, n.title), base: 0 })}
                  onKeyDown={(e) => e.key === 'Enter' && open({ title: n.title, node: img(n.src, n.title), base: 0 })}
                />
                <figcaption>{n.title}</figcaption>
              </figure>
            ))}
          </div>
        </details>

        {stock.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary>Референсы стиля из открытых источников ({stock.length})</summary>
            <div className="photos" style={{ marginTop: 10 }}>
              {stock.map((p) => (
                <figure key={p.src} style={{ margin: 0 }}>
                  <img
                    src={`${base}${p.src}`}
                    width={p.width}
                    height={p.height}
                    alt={p.alt}
                    loading="lazy"
                    role="button"
                    tabIndex={0}
                    onClick={() => open({ title: `${p.alt} — ${p.author}`, node: img(p.src, p.alt), base: 0 })}
                    onKeyDown={(e) => e.key === 'Enter' && open({ title: `${p.alt} — ${p.author}`, node: img(p.src, p.alt), base: 0 })}
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
          </details>
        )}
      </div>
    </section>
  );
}
