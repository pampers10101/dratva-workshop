import { ArrowDownRight, Check, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { SERVICES_LIST } from '../data/workshop';
import type { LeatherItemId, RepairOperationId } from '../utils/estimator';

interface ServicesSectionProps {
  selectedRepairs: RepairOperationId[];
  activeServiceIndexes: number[];
  liveEstimateLabel?: string | null;
  onToggleServicePreset: (
    serviceTitle: string,
    item: LeatherItemId,
    repairs: RepairOperationId[],
    serviceIndex: number
  ) => void;
}

const SERVICE_PRESETS: Array<{ item: LeatherItemId; repairs: RepairOperationId[] }> = [
  { item: 'briefcase', repairs: ['scuffs_dye', 'edge_handles'] },
  { item: 'jacket', repairs: ['crack_patch', 'scuffs_dye'] },
  { item: 'bag', repairs: ['zipper'] },
  { item: 'briefcase', repairs: ['edge_handles'] },
  { item: 'boots', repairs: ['salt_wax'] },
];

export function ServicesSection({
  selectedRepairs,
  activeServiceIndexes,
  liveEstimateLabel,
  onToggleServicePreset,
}: ServicesSectionProps) {
  return (
    <section
      id="services"
      className="workshop-atelier-dark seam-divider"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" style={{ overflowAnchor: 'none' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#A2ABBC]">Что делаем на верстаке</p>
            <h2
              className="font-display mt-3 text-[clamp(1.65rem,2.9vw,2.6rem)] font-bold leading-[1.12] text-[#EEF1F6]"
              style={{ textWrap: 'balance' }}
            >
              Пять направлений ремонта — без поточной спешки
            </h2>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="max-w-sm text-sm leading-relaxed text-[#A2ABBC] md:text-right">
              Отмечайте нужные пункты прямо здесь — они соберутся в ваш перечень расчёта без резкой
              прокрутки страницы.
            </p>
            {selectedRepairs.length > 0 && (
              <a
                href="#estimator"
                className="inline-flex flex-wrap items-center gap-1.5 font-mono-craft text-xs font-semibold text-[#52E0A1] underline decoration-[#52E0A1]/40 underline-offset-4 transition-colors hover:text-[#7CEBB9]"
              >
                <span>
                  В перечне: {selectedRepairs.length}
                  {liveEstimateLabel ? ` · ${liveEstimateLabel}` : ''}
                </span>
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Открыть расчёт</span>
              </a>
            )}
          </div>
        </motion.div>

        {/* Asymmetric Neo-Y2K Bento Grid (first card spans 2 cols on lg) */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES_LIST.map((service, index) => {
            const preset = SERVICE_PRESETS[index] ?? SERVICE_PRESETS[0];
            const isAdded = activeServiceIndexes.includes(index);

            return (
              <motion.article
                key={service.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`chrome-surface chrome-surface-interactive group flex flex-col justify-between rounded-xl p-6 transition-all ${
                  service.featured ? 'md:col-span-2' : ''
                } ${
                  isAdded
                    ? 'border-[#52E0A1]/55 shadow-[0_0_0_1px_rgba(82,224,161,0.22),0_18px_42px_rgba(0,0,0,0.42)]'
                    : ''
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono-craft text-sm font-bold text-[#E85D2A]">
                      {service.number}
                    </span>
                    <div className="flex items-center gap-3 font-mono-craft text-[#A2ABBC]">
                      {isAdded && (
                        <span className="font-semibold text-[#52E0A1]">В перечне ✓</span>
                      )}
                      <span>{service.turnaround}</span>
                    </div>
                  </div>

                  <h3 className="font-display mt-4 text-lg font-bold leading-snug text-[#EEF1F6]">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-[1.68] text-[#C6CEDB]">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-[rgba(220,227,239,0.12)] pt-4">
                  <p className="text-xs leading-relaxed text-[#A2ABBC]">{service.craftNote}</p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono-craft text-base font-bold text-[#EEF1F6]">
                      {service.priceFrom}
                    </span>

                    <button
                      type="button"
                      aria-pressed={isAdded}
                      onClick={() =>
                        onToggleServicePreset(service.title, preset.item, preset.repairs, index)
                      }
                      className={`chrome-sheen inline-flex min-h-[42px] items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                        isAdded
                          ? 'border-[#52E0A1]/70 bg-[#52E0A1]/15 text-[#52E0A1] hover:bg-[#52E0A1]/25'
                          : 'border-[rgba(220,227,239,0.22)] bg-[#0B0C10] text-[#EEF1F6] hover:border-[#E85D2A] hover:bg-[#E85D2A] hover:text-[#0B0C10]'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                          <span>В перечне · убрать</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                          <span>Добавить в перечень</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

