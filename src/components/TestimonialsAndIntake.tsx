import { Check, CheckCircle2, Copy, Gamepad2, HelpCircle, LogIn, LogOut, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { POST_RECEIPT_CARE_TIPS, SEED_REVIEWS, type SeedReview } from '../data/workshop';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';
import {
  calculateEstimate,
  formatRubles,
  getItemLabel,
  LEATHER_ITEMS,
  parsePromoDiscountPercent,
  parseRepairList,
  REPAIR_OPERATIONS,
  TICKET_STATUS_META,
  validateLeadForm,
  type LeatherItemId,
  type RepairOperationId,
  type TicketStatus,
} from '../utils/estimator';

interface TicketResponse {
  id?: number;
  ticketCode: string;
  clientName: string;
  itemType: string;
  repairs: string;
  urgent: boolean;
  estimatedMin: number;
  estimatedMax: number;
  estimatedDays: string;
  status: TicketStatus;
  statusMeta?: { label: string; stepIndex: number; description: string };
  masterComment: string | null;
  createdAt: string;
}

interface TestimonialsAndIntakeProps {
  itemType: LeatherItemId;
  repairIds: RepairOperationId[];
  urgent: boolean;
  promoCode: string;
  bestDiscountPct: number;
  onItemChange: (item: LeatherItemId) => void;
  onToggleRepair: (id: RepairOperationId) => void;
  onUrgentChange: (urgent: boolean) => void;
  onOpenCraftQuiz: () => void;
}

const STATUS_STEPS: TicketStatus[] = ['new', 'inspecting', 'in_work', 'ready', 'picked_up'];
const STATUS_STEP_SHORT_LABELS: Record<TicketStatus, string> = {
  new: 'Принята',
  inspecting: 'Осмотр',
  in_work: 'Верстак',
  ready: 'Готова',
  picked_up: 'Выдана',
};

export function TestimonialsAndIntake({
  itemType,
  repairIds,
  urgent,
  promoCode,
  bestDiscountPct,
  onItemChange,
  onToggleRepair,
  onUrgentChange,
  onOpenCraftQuiz,
}: TestimonialsAndIntakeProps) {
  const reduced = usePrefersReducedMotion();
  const { user, loading: authLoading, signInLoading, authError, signInWithGoogle, logout, getIdToken } = useAuth();

  // Reviews state (PostgreSQL backed with deterministic seed fallback)
  const [reviews, setReviews] = useState<SeedReview[]>(SEED_REVIEWS);

  // Lead intake form state
  const [clientName, setClientName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<TicketResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Ticket tracker state
  const [lookupCode, setLookupCode] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackedTicket, setTrackedTicket] = useState<TicketResponse | null>(null);

  // Signed-in cabinet state
  const [myOrders, setMyOrders] = useState<TicketResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reviewItem, setReviewItem] = useState('');
  const [reviewDistrict, setReviewDistrict] = useState('Октябрьский район');
  const [reviewBefore, setReviewBefore] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState('');
  const [reviewStatusMsg, setReviewStatusMsg] = useState<string | null>(null);

  const promoDiscountPct = parsePromoDiscountPercent(promoCode);
  const promoApplied = promoDiscountPct > 0;
  const normalizedPromoCode = promoApplied ? `DRATVA-${promoDiscountPct}` : null;

  const currentEstimate = calculateEstimate({
    itemType,
    repairIds,
    urgent,
    promoCode,
  });

  useEffect(() => {
    let active = true;
    fetch('/api/reviews')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {
        // Keep deterministic SEED_REVIEWS if API is unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  const loadAccountOrders = useCallback(async () => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/account/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch {
      // Handled quietly
    } finally {
      setOrdersLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    loadAccountOrders();
  }, [loadAccountOrders]);

  const handleTrackTicket = async (codeOverride?: string) => {
    const code = (codeOverride ?? lookupCode).trim().toUpperCase();
    if (!code) {
      setTrackingError('Введите номер квитанции, например DRT-2401.');
      return;
    }
    setLookupCode(code);
    setTrackingError(null);
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setTrackedTicket(null);
        setTrackingError(data.error || 'Квитанция не найдена.');
        return;
      }
      setTrackedTicket(data.ticket);
    } catch {
      setTrackingError('Не удалось связаться с журналом мастерской. Попробуйте снова.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyTicketCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleCopyWorkshopAddress = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText('г. Самара, ул. Революционная, 70, лит. 3 (Мастерская «Дратва»)')
        .catch(() => {});
    }
    setCopiedAddress(true);
    window.setTimeout(() => setCopiedAddress(false), 2400);
  };

  const handleLeadSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const trimmedNotes = notes.trim();
    const combinedNotes =
      promoApplied && normalizedPromoCode
        ? `${trimmedNotes}${trimmedNotes ? ' · ' : ''}Промокод из игры: ${normalizedPromoCode} (−${promoDiscountPct}%)`
        : trimmedNotes;

    const validation = validateLeadForm({
      clientName,
      contact,
      itemType,
      repairIds,
      notes: combinedNotes,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors as Record<string, string>);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientName,
          contact,
          itemType,
          repairIds,
          urgent,
          promoCode: normalizedPromoCode ?? undefined,
          notes: combinedNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        setSubmitError(data.error || 'Не удалось оформить заявку.');
        return;
      }

      setCreatedReceipt(data.ticket);
      setLookupCode(data.ticket.ticketCode);
      setClientName('');
      setContact('');
      setNotes('');
      if (user) {
        loadAccountOrders();
      }
    } catch {
      setSubmitError('Сеть не отвечает. Попробуйте отправить заявку ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPickedUp = async (orderId: number) => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/account/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'picked_up',
        masterComment: 'Клиент подтвердил получение вещи в личном кабинете.',
      }),
    });
    if (res.ok) {
      loadAccountOrders();
    }
  };

  const handleReviewSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setReviewStatusMsg(null);
    const token = await getIdToken();
    if (!token) return;

    const res = await fetch('/api/account/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        authorName: user?.displayName || 'Клиент мастерской',
        district: reviewDistrict,
        itemRestored: reviewItem,
        beforeSummary: reviewBefore,
        outcomeText: reviewOutcome,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setReviewStatusMsg(data.error || 'Не удалось опубликовать отзыв.');
      return;
    }

    setReviews((prev) => [data.review, ...prev]);
    setReviewItem('');
    setReviewBefore('');
    setReviewOutcome('');
    setReviewStatusMsg('Спасибо! Отзыв опубликован в журнале.');
  };

  const receiptCareTip = createdReceipt
    ? POST_RECEIPT_CARE_TIPS[(createdReceipt.itemType as LeatherItemId) ?? 'bag'] ??
      POST_RECEIPT_CARE_TIPS.bag
    : null;

  return (
    <>
      {/* Testimonials Section */}
      <section
        id="reviews"
        className="workshop-atelier-slate seam-divider"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">
                Живые отзывы из Самары
              </p>
              <h2
                className="font-display mt-2.5 text-[clamp(1.65rem,2.9vw,2.6rem)] font-bold leading-[1.12] tracking-tight text-[#EEF1F6]"
                style={{ textWrap: 'balance' }}
              >
                Что говорят люди, которые забрали вещи с верстака
              </h2>
            </div>

            <a
              href="#intake"
              className="font-mono-craft text-xs font-semibold text-[#E85D2A] underline decoration-[#E85D2A]/45 underline-offset-4 hover:text-[#FF713D] whitespace-nowrap shrink-0"
            >
              Записаться на осмотр →
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {reviews.slice(0, 6).map((review, index) => (
              <motion.article
                key={`${review.id}-${index}`}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="chrome-surface chrome-surface-interactive relative flex flex-col justify-between rounded-xl p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#A2ABBC]">
                      <span className="font-semibold text-[#EEF1F6]">{review.authorName}</span>
                      <span aria-hidden="true" className="text-[#E85D2A]">
                        ·
                      </span>
                      <span>{review.district}</span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="font-mono-craft text-[11px] font-bold text-[#768095]"
                    >
                      0{index + 1}
                    </span>
                  </div>

                  <p className="mt-2 font-mono-craft text-xs font-medium text-[#E85D2A]">
                    {review.itemRestored}
                  </p>

                  <p className="mt-3 border-l-2 border-[rgba(220,227,239,0.2)] pl-3 text-xs leading-relaxed text-[#A2ABBC]">
                    Было: {review.beforeSummary}
                  </p>

                  <p className="mt-3.5 text-sm leading-[1.68] text-[#DCE3EF]">
                    «{review.outcomeText}»
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Intake & Ticket Tracker Section */}
      <section
        id="intake"
        className="workshop-atelier-dark seam-divider"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left: Intake Form & Generated Workshop Receipt */}
            <div className="lg:col-span-7">
              <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">Приёмка в работу</p>
              <h2
                className="font-display mt-2.5 text-[clamp(1.65rem,2.8vw,2.5rem)] font-bold leading-[1.12] tracking-tight text-[#EEF1F6]"
                style={{ textWrap: 'balance' }}
              >
                Оставьте заявку — выпишу квитанцию и отвечу по цене
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#A2ABBC]">
                После отправки вы получите номер квитанции вида{' '}
                <span className="font-mono-craft font-semibold text-[#EEF1F6]">DRT-XXXX</span>. По
                нему можно в любой момент проверить, на каком этапе ваша вещь.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#A2ABBC]">
                <span className="inline-flex items-center gap-1.5 text-[#DCE3EF]">
                  <MapPin className="h-3.5 w-3.5 text-[#E85D2A] shrink-0" aria-hidden="true" />
                  Самара, ул. Революционная, 70, лит. 3
                </span>
                <button
                  type="button"
                  onClick={handleCopyWorkshopAddress}
                  className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] px-2.5 font-mono-craft text-[11px] font-semibold text-[#DCE3EF] transition-colors hover:border-[#52E0A1] hover:text-[#52E0A1]"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="h-3 w-3 text-[#52E0A1]" aria-hidden="true" />
                      Адрес скопирован
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Скопировать адрес
                    </>
                  )}
                </button>
              </div>

              <form
                onSubmit={handleLeadSubmit}
                noValidate
                className="chrome-surface mt-8 space-y-5 rounded-xl p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="lead-name"
                      className="block text-xs font-semibold text-[#EEF1F6]"
                    >
                      Как к вам обращаться *
                    </label>
                    <input
                      id="lead-name"
                      name="clientName"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Например, Дмитрий"
                      aria-invalid={Boolean(formErrors.clientName)}
                      className="mt-1.5 min-h-[44px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3.5 text-sm text-[#EEF1F6] placeholder:text-[#768095]"
                    />
                    {formErrors.clientName && (
                      <p role="alert" className="mt-1 text-xs font-medium text-[#FF7D52]">
                        {formErrors.clientName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="lead-contact"
                      className="block text-xs font-semibold text-[#EEF1F6]"
                    >
                      Телефон или Telegram *
                    </label>
                    <input
                      id="lead-contact"
                      name="contact"
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+7 (927) ... или @username"
                      aria-invalid={Boolean(formErrors.contact)}
                      className="mt-1.5 min-h-[44px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3.5 text-sm text-[#EEF1F6] placeholder:text-[#768095]"
                    />
                    {formErrors.contact && (
                      <p role="alert" className="mt-1 text-xs font-medium text-[#FF7D52]">
                        {formErrors.contact}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="lead-item"
                      className="block text-xs font-semibold text-[#EEF1F6]"
                    >
                      Тип изделия
                    </label>
                    <select
                      id="lead-item"
                      value={itemType}
                      onChange={(e) => onItemChange(e.target.value as LeatherItemId)}
                      className="mt-1.5 min-h-[44px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 text-sm text-[#EEF1F6]"
                    >
                      {LEATHER_ITEMS.map((item) => (
                        <option key={item.id} value={item.id} className="bg-[#13151B] text-[#EEF1F6]">
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-md border border-[rgba(220,227,239,0.18)] bg-[#0B0C10] px-3.5 text-xs font-medium text-[#EEF1F6]">
                      <input
                        type="checkbox"
                        checked={urgent}
                        onChange={(e) => onUrgentChange(e.target.checked)}
                        className="h-4 w-4 accent-[#E85D2A]"
                      />
                      <span>Срочно за 48 часов (+30%)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-[#EEF1F6]">
                    Отмеченные работы
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REPAIR_OPERATIONS.map((op) => {
                      const active = repairIds.includes(op.id);
                      return (
                        <button
                          key={op.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onToggleRepair(op.id)}
                          className={`min-h-[38px] rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'border-[#EEF1F6] bg-[#EEF1F6] text-[#0B0C10]'
                              : 'border-[rgba(220,227,239,0.18)] bg-[#0B0C10] text-[#C6CEDB] hover:border-[#DCE3EF] hover:text-[#EEF1F6]'
                          }`}
                        >
                          {op.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.repairs && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-[#FF7D52]">
                      {formErrors.repairs}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="lead-notes"
                    className="block text-xs font-semibold text-[#EEF1F6]"
                  >
                    Пара слов о поломке (по желанию)
                  </label>
                  <textarea
                    id="lead-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Например: потёрлись нижние углы чёрного портфеля и заедает бегунок..."
                    className="mt-1.5 w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] p-3.5 text-sm text-[#EEF1F6] placeholder:text-[#768095]"
                  />
                  {formErrors.notes && (
                    <p role="alert" className="mt-1 text-xs font-medium text-[#FF7D52]">
                      {formErrors.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(220,227,239,0.12)] pt-4">
                  <div className="text-xs text-[#A2ABBC]">
                    <span>Ориентир: </span>
                    <span className="font-mono-craft font-semibold text-[#EEF1F6]">
                      {currentEstimate.isEmpty
                        ? 'после осмотра'
                        : `${formatRubles(currentEstimate.minPrice)} — ${formatRubles(currentEstimate.maxPrice)}`}
                    </span>
                    {promoApplied && normalizedPromoCode && (
                      <span className="ml-2 font-mono-craft font-semibold text-[#52E0A1]">
                        ({normalizedPromoCode} −{promoDiscountPct}%)
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="chrome-sheen inline-flex min-h-[46px] items-center justify-center rounded-md bg-[#E85D2A] px-6 py-3 text-sm font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D] disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {submitting ? 'Выписываем квитанцию...' : 'Выписать квитанцию'}
                  </button>
                </div>

                {submitError && (
                  <p role="alert" className="text-xs font-medium text-[#FF7D52]">
                    {submitError}
                  </p>
                )}
              </form>

              {/* Created Workshop Receipt + Post-Submission Interactive Care & Activity Card */}
              {createdReceipt && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid="created-receipt"
                  className="mt-6 rounded-xl border-2 border-dashed border-[#52E0A1]/70 bg-[#13151B] p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#52E0A1]">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Квитанция зарегистрирована</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2.5">
                        <p className="font-mono-craft text-2xl font-bold text-[#EEF1F6]">
                          {createdReceipt.ticketCode}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyTicketCode(createdReceipt.ticketCode)}
                          aria-label="Скопировать код квитанции"
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-2.5 text-[11px] font-semibold text-[#DCE3EF] hover:border-[#52E0A1] hover:text-[#52E0A1]"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-3 w-3 text-[#52E0A1]" aria-hidden="true" />
                              Скопировано
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              Копия
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <span className="stamp-impact rounded-sm border-2 border-[#E85D2A] px-2.5 py-1 font-mono-craft text-[11px] font-semibold text-[#E85D2A]">
                      ДРАТВА · ПРИНЯТО
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-[#C6CEDB]">
                    {createdReceipt.clientName}, заявка по изделию «
                    <strong className="text-[#EEF1F6]">
                      {getItemLabel(createdReceipt.itemType)}
                    </strong>
                    » ({formatRubles(createdReceipt.estimatedMin)} —{' '}
                    {formatRubles(createdReceipt.estimatedMax)}) записана в журнал мастерской.
                  </p>

                  {/* Personalized care reminder while waiting for Алексей */}
                  {receiptCareTip && (
                    <div className="mt-4 rounded-lg border border-[rgba(220,227,239,0.14)] bg-[#0B0C10]/90 p-4">
                      <p className="font-mono-craft text-[11px] font-semibold text-[#E85D2A]">
                        ПОКА АЛЕКСЕЙ СМОТРИТ ЗАЯВКУ · {receiptCareTip.title.toUpperCase()}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#DCE3EF]">
                        {receiptCareTip.tip}
                      </p>
                    </div>
                  )}

                  {/* Interactive post-submission actions */}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleTrackTicket(createdReceipt.ticketCode)}
                      className="inline-flex min-h-[40px] items-center rounded-md border border-[rgba(220,227,239,0.28)] bg-[#0B0C10] px-4 py-2 text-xs font-semibold text-[#EEF1F6] transition-colors hover:border-[#EEF1F6] hover:bg-[#EEF1F6] hover:text-[#0B0C10]"
                    >
                      Проверить статус {createdReceipt.ticketCode}
                    </button>

                    <button
                      type="button"
                      onClick={onOpenCraftQuiz}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.22)] bg-[#0B0C10] px-4 py-2 text-xs font-semibold text-[#DCE3EF] transition-colors hover:border-[#52E0A1] hover:text-[#52E0A1]"
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Тест «Миф или правда» (1 мин)
                    </button>

                    {bestDiscountPct < 15 && (
                      <a
                        href="#workbench-game"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#E85D2A]/50 bg-[#E85D2A]/12 px-4 py-2 text-xs font-semibold text-[#E85D2A] transition-colors hover:bg-[#E85D2A] hover:text-[#0B0C10]"
                      >
                        <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Попробовать игру ради −15%
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Ticket Tracker + Optional Google Client Cabinet */}
            <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
              <div className="chrome-surface rounded-xl p-6">
                <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">
                  Проверка статуса
                </p>
                <h3 className="font-display mt-1 text-lg font-bold text-[#EEF1F6]">
                  Где сейчас моя вещь?
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTrackTicket();
                  }}
                  className="mt-4 flex gap-2"
                >
                  <label htmlFor="ticket-lookup" className="sr-only">
                    Номер квитанции
                  </label>
                  <input
                    id="ticket-lookup"
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    placeholder="DRT-2401"
                    className="font-mono-craft min-h-[44px] min-w-0 flex-1 rounded-md border border-[rgba(220,227,239,0.22)] bg-[#0B0C10] px-3.5 text-sm uppercase text-[#EEF1F6] placeholder:text-[#768095]"
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    aria-label="Проверить квитанцию"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-[#EEF1F6] px-4 text-xs font-bold text-[#0B0C10] transition-colors hover:bg-[#E85D2A] whitespace-nowrap shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    Найти
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#A2ABBC]">
                  <span>Образцы квитанций:</span>
                  {['DRT-2401', 'DRT-2408'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => handleTrackTicket(sample)}
                      className="font-mono-craft font-semibold text-[#DCE3EF] underline decoration-[rgba(220,227,239,0.35)] underline-offset-4 hover:text-[#E85D2A]"
                    >
                      {sample}
                    </button>
                  ))}
                </div>

                {trackingError && (
                  <p role="alert" className="mt-4 text-xs font-medium text-[#FF7D52]">
                    {trackingError}
                  </p>
                )}

                {trackedTicket && (
                  <div
                    data-testid="tracked-ticket-result"
                    className="mt-5 border-t border-[rgba(220,227,239,0.14)] pt-5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono-craft text-lg font-bold text-[#EEF1F6]">
                        {trackedTicket.ticketCode}
                      </span>
                      <span className="text-xs font-semibold text-[#52E0A1]">
                        {TICKET_STATUS_META[trackedTicket.status]?.label ?? trackedTicket.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[#A2ABBC]">
                      {getItemLabel(trackedTicket.itemType)} ·{' '}
                      {parseRepairList(trackedTicket.repairs).join(', ')}
                    </p>

                    {/* 5-step progress indicator */}
                    <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Этапы реставрации">
                      {STATUS_STEPS.map((stepKey, idx) => {
                        const currentStep =
                          TICKET_STATUS_META[trackedTicket.status]?.stepIndex ?? 1;
                        const reached = idx + 1 <= currentStep;
                        return (
                          <li key={stepKey} className="flex flex-col gap-1">
                            <span
                              className={`h-1.5 w-full rounded-xs ${
                                reached ? 'bg-[#52E0A1]' : 'bg-[rgba(220,227,239,0.14)]'
                              }`}
                            />
                            <span className="text-[10px] leading-tight text-[#A2ABBC]">
                              {idx + 1}. {STATUS_STEP_SHORT_LABELS[stepKey]}
                            </span>
                          </li>
                        );
                      })}
                    </ol>

                    {trackedTicket.masterComment && (
                      <div className="mt-4 rounded-lg border border-[rgba(220,227,239,0.1)] bg-[#0B0C10]/85 p-3.5 text-xs leading-relaxed text-[#C6CEDB]">
                        <span className="font-semibold text-[#EEF1F6]">Заметка мастера: </span>
                        {trackedTicket.masterComment}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between font-mono-craft text-xs text-[#A2ABBC]">
                      <span>
                        Смета: {formatRubles(trackedTicket.estimatedMin)} —{' '}
                        {formatRubles(trackedTicket.estimatedMax)}
                      </span>
                      <span>{trackedTicket.estimatedDays}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Client Cabinet (Firebase Google Sign-In) */}
              <div className="chrome-surface rounded-xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">
                      Личный кабинет
                    </p>
                    <h3 className="font-display mt-1 text-base font-bold text-[#EEF1F6]">
                      История квитанций и отзыв
                    </h3>
                  </div>

                  {user ? (
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.22)] bg-[#0B0C10] px-3 py-1.5 text-xs font-semibold text-[#EEF1F6] hover:border-[#EEF1F6] whitespace-nowrap shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Выйти
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        signInWithGoogle();
                      }}
                      disabled={signInLoading}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.24)] bg-[#0B0C10] px-3.5 py-1.5 text-xs font-semibold text-[#EEF1F6] transition-colors hover:border-[#E85D2A] hover:bg-[#E85D2A] hover:text-[#0B0C10] disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Войти через Google
                    </button>
                  )}
                </div>

                {authError && (
                  <p role="alert" className="mt-3 text-xs font-medium text-[#FF7D52]">
                    {authError}
                  </p>
                )}

                {!user ? (
                  <p className="mt-3 text-xs leading-relaxed text-[#A2ABBC]">
                    Если войти перед отправкой заявки, все ваши квитанции автоматически привяжутся
                    к профилю, и вы сможете оставить подтверждённый отзыв после выдачи вещи.
                  </p>
                ) : (
                  <div className="mt-4 space-y-5">
                    <p className="text-xs text-[#C6CEDB]">
                      Вы вошли как <span className="font-semibold text-[#EEF1F6]">{user.email}</span>
                    </p>

                    <div>
                      <p className="text-xs font-semibold text-[#EEF1F6]">Ваши квитанции</p>
                      {ordersLoading ? (
                        <p className="mt-2 text-xs text-[#A2ABBC]">Загружаем список...</p>
                      ) : myOrders.length === 0 ? (
                        <p className="mt-2 text-xs text-[#A2ABBC]">
                          Пока нет привязанных квитанций. Отправьте форму слева — заказ сразу
                          появится здесь.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {myOrders.map((order) => (
                            <li
                              key={order.ticketCode}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[rgba(220,227,239,0.14)] bg-[#0B0C10] px-3 py-2.5 text-xs"
                            >
                              <div>
                                <span className="font-mono-craft font-semibold text-[#EEF1F6]">
                                  {order.ticketCode}
                                </span>{' '}
                                <span className="text-[#A2ABBC]">
                                  · {getItemLabel(order.itemType)} ·{' '}
                                  {TICKET_STATUS_META[order.status]?.label ?? order.status}
                                </span>
                              </div>
                              {order.id && order.status !== 'picked_up' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPickedUp(order.id!)}
                                  className="text-xs font-semibold text-[#52E0A1] underline underline-offset-2"
                                >
                                  Подтвердить получение
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <form
                      onSubmit={handleReviewSubmit}
                      className="space-y-2.5 border-t border-[rgba(220,227,239,0.14)] pt-4"
                    >
                      <p className="text-xs font-semibold text-[#EEF1F6]">
                        Оставить отзыв о работе
                      </p>
                      <input
                        type="text"
                        value={reviewItem}
                        onChange={(e) => setReviewItem(e.target.value)}
                        placeholder="Какую вещь делали? (напр., Портфель из телячьей кожи)"
                        className="min-h-[40px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 text-xs text-[#EEF1F6] placeholder:text-[#768095]"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={reviewDistrict}
                          onChange={(e) => setReviewDistrict(e.target.value)}
                          placeholder="Район Самары"
                          className="min-h-[40px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 text-xs text-[#EEF1F6] placeholder:text-[#768095]"
                        />
                        <input
                          type="text"
                          value={reviewBefore}
                          onChange={(e) => setReviewBefore(e.target.value)}
                          placeholder="Что было до ремонта?"
                          className="min-h-[40px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 text-xs text-[#EEF1F6] placeholder:text-[#768095]"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={reviewOutcome}
                        onChange={(e) => setReviewOutcome(e.target.value)}
                        placeholder="Как носится после реставрации?"
                        className="w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] p-3 text-xs text-[#EEF1F6] placeholder:text-[#768095]"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] rounded-md bg-[#52E0A1] px-4 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#72EBB5]"
                      >
                        Опубликовать отзыв
                      </button>
                      {reviewStatusMsg && (
                        <p className="text-xs font-medium text-[#52E0A1]">{reviewStatusMsg}</p>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

