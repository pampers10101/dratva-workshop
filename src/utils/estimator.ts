export type LeatherItemId = 'bag' | 'briefcase' | 'jacket' | 'boots' | 'small';

export type RepairOperationId =
  | 'scuffs_dye'
  | 'crack_patch'
  | 'zipper'
  | 'edge_handles'
  | 'lining'
  | 'salt_wax';

export type TicketStatus = 'new' | 'inspecting' | 'in_work' | 'ready' | 'picked_up';

export const ALLOWED_PROMO_DISCOUNTS = [5, 8, 10, 12, 15] as const;
export type WorkshopDiscountTier = (typeof ALLOWED_PROMO_DISCOUNTS)[number];

export const MAX_WORKSHOP_DISCOUNT_PCT = 15;
export const WORKSHOP_PROMO_CODE = 'DRATVA-10';
export const MAX_WORKSHOP_PROMO_CODE = 'DRATVA-15';
export const WORKSHOP_PROMO_RATE = 0.1;

export interface LeatherItemOption {
  id: LeatherItemId;
  label: string;
  shortLabel: string;
  multiplier: number;
  example: string;
}

export interface RepairOperationOption {
  id: RepairOperationId;
  label: string;
  shortLabel: string;
  detail: string;
  minPrice: number;
  maxPrice: number;
  days: number;
}

export interface EstimateInput {
  itemType: LeatherItemId;
  repairIds: RepairOperationId[];
  urgent: boolean;
  promoCode?: string;
}

export interface EstimateResult {
  minPrice: number;
  maxPrice: number;
  baseMinPrice: number;
  baseMaxPrice: number;
  promoApplied: boolean;
  promoDiscountPercent: number;
  promoCodeNormalized: string | null;
  promoDiscountMin: number;
  daysMin: number;
  daysMax: number;
  daysLabel: string;
  honestAdvice: string;
  repairLabels: string[];
  isEmpty: boolean;
}

export interface LeadFormInput {
  clientName: string;
  contact: string;
  itemType: LeatherItemId;
  repairIds: RepairOperationId[];
  notes: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<'clientName' | 'contact' | 'repairs' | 'notes', string>>;
}

export const LEATHER_ITEMS: LeatherItemOption[] = [
  {
    id: 'bag',
    label: 'Сумка или шоппер',
    shortLabel: 'Сумка',
    multiplier: 1.0,
    example: 'повседневная, кросс-боди, тоут',
  },
  {
    id: 'briefcase',
    label: 'Портфель или саквояж',
    shortLabel: 'Портфель',
    multiplier: 1.25,
    example: 'деловой, дорожная сумка, рюкзак',
  },
  {
    id: 'jacket',
    label: 'Кожаная куртка или плащ',
    shortLabel: 'Куртка',
    multiplier: 1.4,
    example: 'косуха, пилот, пиджак из наппы',
  },
  {
    id: 'boots',
    label: 'Ботинки или сапоги',
    shortLabel: 'Обувь',
    multiplier: 0.95,
    example: 'рантовая пара, челси, высокие сапоги',
  },
  {
    id: 'small',
    label: 'Ремень или кошелёк',
    shortLabel: 'Мелкая галантерея',
    multiplier: 0.65,
    example: 'портмоне, ремень, ключница, обложка',
  },
];

export const REPAIR_OPERATIONS: RepairOperationOption[] = [
  {
    id: 'scuffs_dye',
    label: 'Потёртости и точечная покраска',
    shortLabel: 'Покраска и тон',
    detail: 'Подбор колера вручную, матовый или сатиновый лак без эффекта клеёнки.',
    minPrice: 1800,
    maxPrice: 3100,
    days: 3,
  },
  {
    id: 'crack_patch',
    label: 'Разрыв, трещина или скрытая заплатка',
    shortLabel: 'Ремонт разрыва',
    detail: 'Подклейка бахтармой изнутри, шпатлевание микротрещин или аккуратная накладка.',
    minPrice: 1600,
    maxPrice: 2800,
    days: 3,
  },
  {
    id: 'zipper',
    label: 'Замена молнии (металл YKK / Riri)',
    shortLabel: 'Замена молнии',
    detail: 'Вшиваем в старые проколы, чтобы не перфорировать край кожи повторно.',
    minPrice: 1900,
    maxPrice: 3400,
    days: 2,
  },
  {
    id: 'edge_handles',
    label: 'Урез, ручки и хром-фурнитура',
    shortLabel: 'Урез и ручки',
    detail: 'Снимаем потрескавшуюся резину, запаиваем 3 слоя Fenice, меняем карабины.',
    minPrice: 2100,
    maxPrice: 3700,
    days: 4,
  },
  {
    id: 'lining',
    label: 'Полная замена подкладки',
    shortLabel: 'Новая подкладка',
    detail: 'Плотная саржа или хлопок-ёлочка, переносим внутренние карманы и бирку.',
    minPrice: 2600,
    maxPrice: 4400,
    days: 5,
  },
  {
    id: 'salt_wax',
    label: 'Выведение реагентов и воскование',
    shortLabel: 'Соль и воск',
    detail: 'Убираем белёсые следы самарских зим, жируем и закрываем пчелиным воском.',
    minPrice: 1200,
    maxPrice: 2100,
    days: 2,
  },
];

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; stepIndex: number; description: string }
> = {
  new: {
    label: 'Принята в оценку',
    stepIndex: 1,
    description: 'Квитанция зарегистрирована. Мастер посмотрит описание и уточнит детали.',
  },
  inspecting: {
    label: 'Осмотр и подбор кожи',
    stepIndex: 2,
    description: 'Подбираем тон краски, нить и фурнитуру перед началом работ.',
  },
  in_work: {
    label: 'На верстаке',
    stepIndex: 3,
    description: 'Вещь в работе: прошивка, сушка слоёв или запайка уреза.',
  },
  ready: {
    label: 'Готова к выдаче',
    stepIndex: 4,
    description: 'Можно забирать на ул. Революционной, 70 (лит. 3) с 10:00 до 19:30.',
  },
  picked_up: {
    label: 'Выдана владельцу',
    stepIndex: 5,
    description: 'Заказ закрыт. Гарантия на шов и фурнитуру — 6 месяцев.',
  },
};

const roundToHundred = (value: number): number => Math.round(value / 100) * 100;

export function formatPromoCode(discountPercent: WorkshopDiscountTier): string {
  return `DRATVA-${discountPercent}`;
}

/**
 * Parses a workshop promo code earned in the workbench mini-game.
 * Supports DRATVA-5, DRATVA-8, DRATVA-10, DRATVA-12, DRATVA-15 (strictly capped at 15%).
 */
export function parsePromoDiscountPercent(code?: string): number {
  const normalized = (code ?? '').trim().toUpperCase();
  const match = /^DRATVA-(\d{1,2})$/.exec(normalized);
  if (!match) return 0;
  const parsed = Number(match[1]);
  if (
    parsed > MAX_WORKSHOP_DISCOUNT_PCT ||
    !(ALLOWED_PROMO_DISCOUNTS as readonly number[]).includes(parsed)
  ) {
    return 0;
  }
  return parsed;
}

export function isPromoCodeValid(code?: string): boolean {
  return parsePromoDiscountPercent(code) > 0;
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const item = LEATHER_ITEMS.find((entry) => entry.id === input.itemType) ?? LEATHER_ITEMS[0];
  const selectedOps = REPAIR_OPERATIONS.filter((op) => input.repairIds.includes(op.id));
  const promoDiscountPercent = parsePromoDiscountPercent(input.promoCode);
  const promoApplied = promoDiscountPercent > 0;
  const promoCodeNormalized = promoApplied ? `DRATVA-${promoDiscountPercent}` : null;

  if (selectedOps.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      baseMinPrice: 0,
      baseMaxPrice: 0,
      promoApplied,
      promoDiscountPercent,
      promoCodeNormalized,
      promoDiscountMin: 0,
      daysMin: 0,
      daysMax: 0,
      daysLabel: 'Выберите хотя бы одну задачу',
      honestAdvice:
        'Отметьте, что случилось с вещью — сразу покажу вилку цены и честно скажу, стоит ли овчинка выделки.',
      repairLabels: [],
      isEmpty: true,
    };
  }

  let rawMin = 0;
  let rawMax = 0;
  let totalDays = 0;

  selectedOps.forEach((op, index) => {
    const bundleFactor = index === 0 ? 1 : 0.92;
    rawMin += op.minPrice * item.multiplier * bundleFactor;
    rawMax += op.maxPrice * item.multiplier * bundleFactor;
    totalDays += index === 0 ? op.days : Math.max(1, Math.round(op.days * 0.5));
  });

  const urgencyMultiplier = input.urgent ? 1.3 : 1.0;
  const baseMinPrice = roundToHundred(rawMin * urgencyMultiplier);
  const baseMaxPrice = Math.max(baseMinPrice + 400, roundToHundred(rawMax * urgencyMultiplier));

  const discountFactor = promoApplied ? 1 - promoDiscountPercent / 100 : 1;
  const minPrice = promoApplied ? roundToHundred(baseMinPrice * discountFactor) : baseMinPrice;
  const maxPrice = promoApplied
    ? Math.max(minPrice + 300, roundToHundred(baseMaxPrice * discountFactor))
    : baseMaxPrice;
  const promoDiscountMin = Math.max(0, baseMinPrice - minPrice);

  const daysMin = input.urgent ? 1 : Math.max(2, totalDays - 1);
  const daysMax = input.urgent ? 2 : Math.min(12, totalDays + 2);
  const daysLabel = input.urgent ? '1–2 дня (срочно)' : `${daysMin}–${daysMax} дн.`;

  let honestAdvice =
    'Точную сумму называю после осмотра вживую или по 2–3 фото при дневном свете — и она не растёт в процессе работы.';

  if (item.id === 'small' && baseMinPrice >= 2800) {
    honestAdvice =
      'Честно: если ремень или кошелёк стоил меньше 5 000 ₽, ремонт экономически спорный. Берём, если вещь дорога как память или кожа действительно толстая.';
  } else if (item.id === 'jacket' && selectedOps.some((op) => op.id === 'crack_patch')) {
    honestAdvice =
      'Если кожа на куртке уже «бумажная» и рвётся пальцами от пересыхания, заплатка не удержит — проверю запас прочности бесплатно при встрече.';
  } else if (selectedOps.length === 1 && selectedOps[0].id === 'salt_wax') {
    honestAdvice =
      'Совет до визита: не сушите мокрую кожу на батарее и не трите влажными салфетками со спиртом — приносите как есть, вытянем соль мягко.';
  } else if (input.urgent) {
    honestAdvice =
      'Срочный режим (+30%) доступен не для всех красок: анилиновый лак должен просохнуть минимум 14 часов, иначе пойдёт пятнами.';
  }

  return {
    minPrice,
    maxPrice,
    baseMinPrice,
    baseMaxPrice,
    promoApplied,
    promoDiscountPercent,
    promoCodeNormalized,
    promoDiscountMin,
    daysMin,
    daysMax,
    daysLabel,
    honestAdvice,
    repairLabels: selectedOps.map((op) => op.shortLabel),
    isEmpty: false,
  };
}

export function validateLeadForm(input: LeadFormInput): ValidationResult {
  const errors: ValidationResult['errors'] = {};
  const trimmedName = input.clientName.trim();
  const trimmedContact = input.contact.trim();
  const trimmedNotes = input.notes.trim();

  if (trimmedName.length < 2) {
    errors.clientName = 'Напишите, как к вам обращаться (минимум 2 буквы).';
  }

  const isTelegram = /^@[a-zA-Z0-9_]{4,32}$/.test(trimmedContact);
  const digitsOnly = trimmedContact.replace(/\D/g, '');
  const isPhone = digitsOnly.length >= 10 && digitsOnly.length <= 12;

  if (!trimmedContact) {
    errors.contact = 'Укажите телефон или Telegram (@ник), чтобы я прислал оценку.';
  } else if (!isTelegram && !isPhone) {
    errors.contact = 'Похоже на опечатку: введите номер (+7...) или @username в Telegram.';
  }

  if (input.repairIds.length === 0 && trimmedNotes.length < 8) {
    errors.repairs = 'Выберите хотя бы один вид работ или кратко опишите поломку ниже.';
  }

  if (trimmedNotes.length > 600) {
    errors.notes = 'Слишком длинное описание — уложитесь в 600 символов, остальное обсудим по фото.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatRubles(amount: number): string {
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')} ₽`;
}

export function generateTicketCode(randomDigits?: number): string {
  const num =
    typeof randomDigits === 'number'
      ? Math.abs(Math.floor(randomDigits)) % 9000 + 1000
      : Math.floor(1000 + Math.random() * 9000);
  return `DRT-${num}`;
}

export function getItemLabel(id: string): string {
  return LEATHER_ITEMS.find((entry) => entry.id === id)?.label ?? id;
}

export function parseRepairList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return raw ? [raw] : [];
  }
}
