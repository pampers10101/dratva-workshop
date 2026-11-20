import { Check, Tag, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';
import {
  calculateEstimate,
  formatRubles,
  LEATHER_ITEMS,
  REPAIR_OPERATIONS,
  type EstimateResult,
  type LeatherItemId,
  type RepairOperationId,
} from '../utils/estimator';

interface PriceEstimatorProps {
  itemType: LeatherItemId;
  repairIds: RepairOperationId[];
  urgent: boolean;
  promoCode: string;
  bestPromoCode: string | null;
  bestDiscountPct: number;
  onItemChange: (item: LeatherItemId) => void;
  onToggleRepair: (id: RepairOperationId) => void;
  onUrgentChange: (urgent: boolean) => void;
  onPromoCodeChange: (code: string) => void;
  onTransferToIntake: (estimate: EstimateResult) => void;
}

export function PriceEstimator({
  itemType,
  repairIds,
  urgent,
  promoCode,
  bestPromoCode,
  bestDiscountPct,
  onItemChange,
  onToggleRepair,
  onUrgentChange,
  onPromoCodeChange,
  onTransferToIntake,
}: PriceEstimatorProps) {
  const reduced = usePrefersReducedMotion();
  const [stampedKey, setStampedKey] = useState(0);

  const estimate = calculateEstimate({
    itemType,
    repairIds,
    urgent,
    promoCode,
  });
  const activeItem = LEATHER_ITEMS.find((entry) => entry.id === itemType) ?? LEATHER_ITEMS[0];

  const handleTransfer = () => {
    setStampedKey((prev) => prev + 1);
    onTransferToIntake(estimate);
  };

  return (
    <section
      id="estimator"
      className="workshop-atelier-slate seam-divider"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" style={{ overflowAnchor: 'none' }}>
        <div className="max-w-2xl">
          <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">
            Калькулятор без сюрпризов
          </p>
          <h2
            className="font-display mt-2.5 text-[clamp(1.65rem,2.9vw,2.6rem)] font-bold leading-[1.12] tracking-tight text-[#EEF1F6]"
            style={{ textWrap: 'balance' }}
          >
            Прикиньте цену до поездки в мастерскую
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#A2ABBC]">
            Отметьте вещь и поломку. Я сразу покажу реальную вилку и честно предупрежу, если
            ремонт выйдет дороже здравого смысла.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left: Item & Operations Picker */}
          <div className="space-y-8 lg:col-span-7" style={{ overflowAnchor: 'none' }}>
            <div>
              <h3 className="text-sm font-semibold text-[#EEF1F6]">1. Что будем спасать?</h3>
              <div
                role="radiogroup"
                aria-label="Выбор типа изделия"
                className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              >
                {LEATHER_ITEMS.map((item) => {
                  const selected = item.id === itemType;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onItemChange(item.id)}
                      className={`flex min-h-[58px] flex-col justify-center rounded-lg border px-4 py-3 text-left transition-all ${
                        selected
                          ? 'border-[#EEF1F6] bg-[#EEF1F6] text-[#0B0C10] shadow-[0_8px_24px_rgba(220,227,239,0.12)]'
                          : 'border-[rgba(220,227,239,0.15)] bg-[#13151B] text-[#EEF1F6] hover:border-[rgba(220,227,239,0.4)] hover:bg-[#191C24]'
                      }`}
                    >
                      <span className="text-sm font-bold">{item.label}</span>
                      <span
                        className={`mt-0.5 text-xs ${
                          selected ? 'text-[#394150]' : 'text-[#A2ABBC]'
                        }`}
                      >
                        {item.example}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#EEF1F6]">
                2. Что случилось с кожей? (можно выбрать несколько)
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {REPAIR_OPERATIONS.map((op) => {
                  const checked = repairIds.includes(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggleRepair(op.id)}
                      className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all ${
                        checked
                          ? 'border-[#E85D2A] bg-[#191D26] shadow-[0_0_0_1px_rgba(232,93,42,0.35)]'
                          : 'border-[rgba(220,227,239,0.14)] bg-[#13151B] hover:border-[rgba(220,227,239,0.32)]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                          checked
                            ? 'border-[#E85D2A] bg-[#E85D2A] text-[#0B0C10]'
                            : 'border-[rgba(220,227,239,0.3)] bg-[#0B0C10]'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#EEF1F6]">
                          {op.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#A2ABBC]">
                          {op.detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="chrome-surface flex flex-wrap items-center justify-between gap-4 rounded-xl px-4 py-4">
              <div>
                <span className="block text-sm font-semibold text-[#EEF1F6]">
                  Срочно к поездке (за 48 часов)
                </span>
                <span className="text-xs text-[#A2ABBC]">
                  Беру вне очереди с наценкой +30%, если технология сушки позволяет.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={urgent}
                onClick={() => onUrgentChange(!urgent)}
                className={`min-h-[42px] rounded-md border px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  urgent
                    ? 'border-[#E85D2A] bg-[#E85D2A] text-[#0B0C10]'
                    : 'border-[rgba(220,227,239,0.22)] bg-[#0B0C10] text-[#EEF1F6] hover:border-[#DCE3EF]'
                }`}
              >
                {urgent ? 'Срочно: включено (+30%)' : 'Обычная очередь'}
              </button>
            </div>
          </div>

          {/* Right: Brushed Chrome Workshop Estimate Slip */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div
              data-testid="estimate-slip"
              className="chrome-surface relative rounded-xl p-6 text-[#EEF1F6]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-2.5 h-2.5 w-2.5 border-l border-t border-[rgba(220,227,239,0.45)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-2.5 h-2.5 w-2.5 border-r border-t border-[rgba(220,227,239,0.45)]"
              />
              <div className="flex items-baseline justify-between border-b border-dashed border-[rgba(220,227,239,0.2)] pb-4">
                <div>
                  <span className="font-mono-craft text-[11px] text-[#A2ABBC]">
                    ЧЕРНОВИК СМЕТЫ
                  </span>
                  <h3 className="font-display mt-1 text-lg font-bold text-[#EEF1F6]">
                    {activeItem.label}
                  </h3>
                </div>
                <span className="font-mono-craft text-xs font-semibold text-[#E85D2A]">
                  САМАРА
                </span>
              </div>

              <div className="mt-5">
                {estimate.isEmpty ? (
                  <p className="text-sm text-[#A2ABBC]">
                    Отметьте слева хотя бы одну задачу — расчёт появится мгновенно.
                  </p>
                ) : (
                  <div style={{ overflowAnchor: 'none' }}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-[#A2ABBC]">Ориентир по цене</span>
                      <div className="text-right">
                        {estimate.promoApplied && (
                          <span className="block font-mono-craft text-xs text-[#768095] line-through">
                            {formatRubles(estimate.baseMinPrice)} —{' '}
                            {formatRubles(estimate.baseMaxPrice)}
                          </span>
                        )}
                        <motion.span
                          key={`${estimate.minPrice}-${estimate.maxPrice}`}
                          initial={reduced ? false : { opacity: 0.5, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          data-testid="estimate-price"
                          className="font-mono-craft text-2xl font-bold text-[#EEF1F6]"
                        >
                          {formatRubles(estimate.minPrice)} — {formatRubles(estimate.maxPrice)}
                        </motion.span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between gap-4">
                      <span className="text-xs text-[#A2ABBC]">Срок на верстаке</span>
                      <span className="font-mono-craft text-sm font-semibold text-[#52E0A1]">
                        {estimate.daysLabel}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-1.5 border-t border-[rgba(220,227,239,0.12)] pt-4 text-xs text-[#C6CEDB]">
                      {estimate.repairLabels.map((label) => (
                        <li key={label} className="flex items-center justify-between gap-2">
                          <span>{label}</span>
                          <span className="font-mono-craft text-[#A2ABBC]">включено</span>
                        </li>
                      ))}
                      {repairIds.length >= 2 && (
                        <li className="flex items-center justify-between text-[#52E0A1]">
                          <span>Скидка за комплекс работ</span>
                          <span className="font-mono-craft">−8% на доп. этапы</span>
                        </li>
                      )}
                      {estimate.promoApplied && estimate.promoCodeNormalized && (
                        <li
                          data-testid="estimate-promo-line"
                          className="flex items-center justify-between text-[#52E0A1]"
                        >
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                            Промокод ({estimate.promoCodeNormalized})
                          </span>
                          <span className="font-mono-craft font-semibold">
                            −{estimate.promoDiscountPercent}% (−
                            {formatRubles(estimate.promoDiscountMin)})
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Promo Code Input / Unlock from Workbench Mini-Game */}
              <div className="mt-5 border-t border-[rgba(220,227,239,0.12)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="estimator-promo-code"
                    className="font-mono-craft text-[11px] font-medium text-[#A2ABBC]"
                  >
                    Промокод из верстак-игры (до −15%)
                  </label>
                  {estimate.promoDiscountPercent < 15 && (
                    <a
                      href="#workbench-game"
                      className="text-[11px] font-semibold text-[#E85D2A] underline decoration-[#E85D2A]/50 underline-offset-4 hover:text-[#FF713D]"
                    >
                      {estimate.promoApplied ? 'Улучшить до −15% ↑' : 'Выиграть до −15% ↑'}
                    </a>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="estimator-promo-code"
                    type="text"
                    value={promoCode}
                    onChange={(e) => onPromoCodeChange(e.target.value)}
                    placeholder="Например, DRATVA-12"
                    className="font-mono-craft min-h-[40px] min-w-0 flex-1 rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 text-xs uppercase text-[#EEF1F6] placeholder:text-[#768095]"
                  />
                  {promoCode ? (
                    <button
                      type="button"
                      onClick={() => onPromoCodeChange('')}
                      aria-label="Очистить промокод"
                      className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] text-[#A2ABBC] hover:border-[#EEF1F6] hover:text-[#EEF1F6]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : bestPromoCode && bestDiscountPct > 0 ? (
                    <button
                      type="button"
                      onClick={() => onPromoCodeChange(bestPromoCode)}
                      className="min-h-[40px] shrink-0 rounded-md border border-[#52E0A1]/50 bg-[#0B0C10] px-3 text-xs font-semibold text-[#52E0A1] hover:bg-[#52E0A1] hover:text-[#0B0C10]"
                    >
                      Вставить {bestPromoCode}
                    </button>
                  ) : null}
                </div>
                {promoCode.trim().length > 0 && !estimate.promoApplied && (
                  <p className="mt-1.5 text-[11px] text-[#E85D2A]">
                    Код не подошёл. Пройдите мини-игру выше, чтобы открыть код на −5%…−15%.
                  </p>
                )}
              </div>

              {/* Honest Master Advice */}
              <div className="mt-5 rounded-lg border border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/85 p-4">
                <p className="text-xs font-semibold text-[#EEF1F6]">Честная ремарка Алексея</p>
                <p className="mt-1 text-xs leading-relaxed text-[#C6CEDB]">
                  {estimate.honestAdvice}
                </p>
              </div>

              {/* Stamped ink seal when user transfers calculation */}
              {stampedKey > 0 && (
                <div
                  key={stampedKey}
                  aria-live="polite"
                  className="stamp-impact mt-4 inline-block rounded-sm border-2 border-[#52E0A1] px-3 py-1 font-mono-craft text-[11px] font-semibold tracking-wider text-[#52E0A1]"
                >
                  ПЕРЕНЕСЕНО В КВИТАНЦИЮ · САМАРА
                </div>
              )}

              <button
                type="button"
                onClick={handleTransfer}
                className="chrome-sheen mt-5 flex min-h-[46px] w-full items-center justify-center rounded-md bg-[#E85D2A] px-5 py-3 text-sm font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D]"
              >
                Перенести расчёт в заявку
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
