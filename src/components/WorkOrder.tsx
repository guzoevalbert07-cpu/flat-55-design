import type { Estimate } from '../types';

/** 6 шагов порядка работ — из docx §5 и листа «Видео_и_порядок» сметы. */
const STEPS: { title: string; text: string }[] = [
  { title: 'Обои', text: 'Финиш стен — до потолка и до пола: профиль натяжного потолка крепится к готовым стенам.' },
  { title: 'Электрика под потолок', text: 'Сборка щита, разводка потолочных линий в гофре, закладные под люстры, трек и карнизы. Розетки пока не ставить. Отдельная линия 32 А на индукцию.' },
  { title: 'Пол', text: 'Грунт, плёнка, подложка, ламинат / SPC. Ламинат должен отлежаться 48 ч, перепад стяжки ≤ 2 мм на 2 м.' },
  { title: 'Потолки', text: 'Натяжные: замер за 1–2 дня, монтаж 1 день. Условие: стены готовы, точки света разведены, t ≥ +10 °C. В санузлах — только ПВХ.' },
  { title: 'Двери', text: '3 стандартные 800 мм (спальня, душевая, с/у) + широкая в детскую. Ставятся после пола; плинтус — после дверей.' },
  { title: 'Сантехника, розетки, мебель', text: 'Унитаз, раковины, смесители, стекло душевой, полотенцесушитель, вентиляторы, розетки и светильники → плинтус → уборка → сборка кухни и мебели.' },
];

export default function WorkOrder({ estimate }: { estimate: Estimate }) {
  return (
    <section className="section" id="order" aria-labelledby="order-h">
      <div className="wrap">
        <div className="kicker">Порядок работ · общий для всех опций</div>
        <h2 id="order-h">Чтобы не переделывать</h2>
        <p className="lead">Обои → электрика под потолок → пол → потолки → двери → сантехника и розетки → мебель. Нарушение порядка = переделки.</p>
        <div className="grid grid-2">
          <div className="card">
            <ol className="steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <div>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h3>Что обязательно под натяжной потолок</h3>
            <ul style={{ paddingLeft: '1.1em', margin: 0 }}>
              {estimate.ceilingPrep.map((t) => (
                <li key={t} className="small" style={{ marginBottom: 6 }}>
                  {t.replace(/^—\s*/, '')}
                </li>
              ))}
            </ul>
            <h3 style={{ marginTop: 16 }}>Что решить до закупки</h3>
            <ul style={{ paddingLeft: '1.1em', margin: 0 }}>
              <li className="small" style={{ marginBottom: 6 }}>Сторона света окон — определяет температуру света и тон обоев.</li>
              <li className="small" style={{ marginBottom: 6 }}>Высота потолка: при ≤ 2.6 м теневой профиль и парящий потолок «съедают» 4–6 см.</li>
              <li className="small" style={{ marginBottom: 6 }}>Стиральная машина: в с/у 2.1 не встанет вместе с раковиной — планировать в кухню, в линию 2.4 м.</li>
              <li className="small">Двустворчатая или раздвижная дверь в детскую: при раздвижной нужен пенал в стене.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
