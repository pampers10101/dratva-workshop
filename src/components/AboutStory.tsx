import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { STUDIO_MEDIA } from '../data/workshop';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';
import { ChromeTiltCard } from './ChromeTiltCard';

export function AboutStory() {
  const toolRef = useRef<HTMLDivElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setParallaxY(0);
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const el = toolRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const offset = (rect.top + rect.height / 2 - viewportCenter) * -0.04;
      setParallaxY(Math.max(-14, Math.min(14, offset)));
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reduced]);

  return (
    <section
      id="about"
      className="workshop-atelier-slate seam-divider"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-[#A2ABBC]">О мастерской</p>
            <h2
              className="font-display mt-3 text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-[1.12] text-[#EEF1F6]"
              style={{ textWrap: 'balance' }}
            >
              Не химчистка на потоке, а один верстак на Революционной
            </h2>

            <div
              ref={toolRef}
              style={{ transform: `translate3d(0, ${parallaxY}px, 0)` }}
              className="mt-7"
            >
              <ChromeTiltCard
                maxTilt={4}
                className="chrome-surface overflow-hidden rounded-xl p-3"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[rgba(220,227,239,0.16)] bg-[#0B0C10]">
                  {!imgFailed ? (
                    <img
                      src={STUDIO_MEDIA.workshopTools}
                      alt="3D-фотография инструментов кожевенного верстака: стальное шило, хромовый кризер, блок пчелиного воска, металлическая молния YKK и шпуля вощёной дратвы"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#13151B] p-6 text-center text-xs text-[#A2ABBC]">
                      Шорное шило, кризер, воск и молния YKK на верстаке
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0C10]/90 to-transparent"
                  />
                  <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2 font-mono-craft text-[11px] text-[#DCE3EF]">
                    <span>Шило · Кризер · Воск · YKK</span>
                    <span className="text-[#E85D2A]">Самара</span>
                  </div>
                </div>
              </ChromeTiltCard>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between lg:col-span-7"
          >
            <div className="space-y-5 text-base leading-[1.75] text-[#C6CEDB]">
              <p>
                Большинство сумок и курток умирают не от старости, а от двух вещей: самарской
                зимней соли и фабричной резиновой краски на ручках, которая через два сезона
                начинает трескаться и липнуть к ладоням. В потоковых мастерских такое либо
                заливают толстым глянцем, либо разводят руками — «проще купить новую».
              </p>
              <p>
                Я начинал с перетяжки сёдел и ремонта отцовского кожаного портфеля, который
                пережил три переезда. За одиннадцать лет выработал простое правило: каждую вещь
                смотрю сам, краску мешаю вручную при дневной лампе и никогда не отдаю заказ
                сырым, даже если клиент просит «ещё вчера». Анилиновый слой должен встать как
                положено — иначе вы вернётесь с обидой, а мне это не нужно.
              </p>
              <p>
                У меня нет колл-центра и менеджера по продажам. Вы присылаете фото или приносите
                вещь на Революционную — я честно говорю, что получится идеально, где останется
                лёгкий след, а за что вообще не стоит платить деньги.
              </p>
            </div>

            <dl className="mt-10 grid grid-cols-1 gap-6 border-t border-[rgba(220,227,239,0.14)] pt-8 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[#A2ABBC]">Опыт работы с кожей</dt>
                <dd className="font-mono-craft chrome-metallic-text mt-1.5 text-2xl font-semibold">
                  11 лет
                </dd>
                <p className="mt-1 text-xs leading-relaxed text-[#A2ABBC]">
                  Более 1 400 восстановленных сумок, портфелей и курток в Самаре.
                </p>
              </div>

              <div>
                <dt className="text-xs text-[#A2ABBC]">Гарантия на работу</dt>
                <dd className="font-mono-craft chrome-metallic-text mt-1.5 text-2xl font-semibold">
                  6 мес.
                </dd>
                <p className="mt-1 text-xs leading-relaxed text-[#A2ABBC]">
                  На ручной шов, установленную молнию и запайку уреза по квитанции.
                </p>
              </div>

              <div>
                <dt className="text-xs text-[#A2ABBC]">Осмотр и честный вердикт</dt>
                <dd className="font-mono-craft mt-1.5 text-2xl font-semibold text-[#E85D2A]">
                  0 ₽
                </dd>
                <p className="mt-1 text-xs leading-relaxed text-[#A2ABBC]">
                  Оценка по фото или в мастерской бесплатно — даже если отговорю от ремонта.
                </p>
              </div>
            </dl>
          </motion.div>
        </div>

        {/* 4-Step Transparent Workshop Workflow Strip */}
        <div className="mt-14 border-t border-[rgba(220,227,239,0.12)] pt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono-craft text-xs font-semibold text-[#E85D2A]">
              КАК ВЕЩЬ ПРОХОДИТ ВЕРСТАК
            </p>
            <p className="text-xs text-[#A2ABBC]">
              Четыре понятных шага без скрытых доплат
            </p>
          </div>

          <ol className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Осмотр и точная вилка',
                detail: 'Проверяем кожу на разрыв, называем честную цену до начала работ — осмотр 0 ₽.',
              },
              {
                step: '02',
                title: 'Вытяжка и подготовка',
                detail: 'Убираем самарскую соль, старую липкую резину и жируем пересохшие заломы.',
              },
              {
                step: '03',
                title: 'Шов, урез и колер',
                detail: 'Мешаем анилиновый пигмент под дневной лампой, прошиваем в две иглы и паяем урез.',
              },
              {
                step: '04',
                title: 'Контроль и гарантия',
                detail: 'Сушим по технологии без спешки и выдаём по квитанции с гарантией 6 месяцев.',
              },
            ].map((item) => (
              <li
                key={item.step}
                className="chrome-surface rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-craft text-xs font-bold text-[#E85D2A]">
                    {item.step}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gradient-to-r from-[rgba(220,227,239,0.22)] to-transparent"
                  />
                </div>
                <p className="mt-2.5 text-sm font-bold text-[#EEF1F6]">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#A2ABBC]">{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
