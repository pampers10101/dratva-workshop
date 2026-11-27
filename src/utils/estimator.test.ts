import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimate,
  formatPromoCode,
  formatRubles,
  generateTicketCode,
  isPromoCodeValid,
  MAX_WORKSHOP_DISCOUNT_PCT,
  parsePromoDiscountPercent,
  validateLeadForm,
} from './estimator';

test('calculateEstimate applies multi-operation bundle discount and item multiplier', () => {
  const single = calculateEstimate({
    itemType: 'bag',
    repairIds: ['scuffs_dye'],
    urgent: false,
  });
  assert.equal(single.isEmpty, false);
  assert.equal(single.minPrice, 1800);
  assert.equal(single.maxPrice, 3100);
  assert.equal(single.promoApplied, false);
  assert.equal(single.promoDiscountPercent, 0);

  const jacketUrgent = calculateEstimate({
    itemType: 'jacket',
    repairIds: ['crack_patch', 'zipper'],
    urgent: true,
  });
  assert.equal(jacketUrgent.daysLabel, '1–2 дня (срочно)');
  assert.ok(jacketUrgent.minPrice > single.minPrice);
});

test('parsePromoDiscountPercent honors 5%-15% tiers and strictly rejects invalid or >15% codes', () => {
  assert.equal(parsePromoDiscountPercent('DRATVA-5'), 5);
  assert.equal(parsePromoDiscountPercent(' dratva-8 '), 8);
  assert.equal(parsePromoDiscountPercent('DRATVA-10'), 10);
  assert.equal(parsePromoDiscountPercent('DRATVA-12'), 12);
  assert.equal(parsePromoDiscountPercent('DRATVA-15'), MAX_WORKSHOP_DISCOUNT_PCT);

  assert.equal(parsePromoDiscountPercent('DRATVA-16'), 0);
  assert.equal(parsePromoDiscountPercent('DRATVA-25'), 0);
  assert.equal(parsePromoDiscountPercent('DRATVA-0'), 0);
  assert.equal(parsePromoDiscountPercent('INVALID'), 0);
  assert.equal(isPromoCodeValid(formatPromoCode(15)), true);
  assert.equal(isPromoCodeValid('DRATVA-20'), false);
});

test('calculateEstimate applies variable skill-based discounts up to 15% max', () => {
  const base = calculateEstimate({
    itemType: 'briefcase',
    repairIds: ['edge_handles', 'scuffs_dye'],
    urgent: false,
  });

  const tier8 = calculateEstimate({
    itemType: 'briefcase',
    repairIds: ['edge_handles', 'scuffs_dye'],
    urgent: false,
    promoCode: 'DRATVA-8',
  });

  const tier15 = calculateEstimate({
    itemType: 'briefcase',
    repairIds: ['edge_handles', 'scuffs_dye'],
    urgent: false,
    promoCode: 'DRATVA-15',
  });

  assert.equal(tier8.promoApplied, true);
  assert.equal(tier8.promoDiscountPercent, 8);
  assert.equal(tier15.promoApplied, true);
  assert.equal(tier15.promoDiscountPercent, 15);
  assert.equal(tier15.promoCodeNormalized, 'DRATVA-15');
  assert.ok(tier15.minPrice < tier8.minPrice);
  assert.ok(tier8.minPrice < base.minPrice);
  assert.equal(tier15.promoDiscountMin, base.minPrice - tier15.minPrice);
});

test('validateLeadForm catches missing fields and accepts phone or telegram handle', () => {
  const invalid = validateLeadForm({
    clientName: 'А',
    contact: 'abc',
    itemType: 'bag',
    repairIds: [],
    notes: 'коротко',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.clientName);
  assert.ok(invalid.errors.contact);
  assert.ok(invalid.errors.repairs);

  const validTelegram = validateLeadForm({
    clientName: 'Дмитрий',
    contact: '@dmitry_samara',
    itemType: 'briefcase',
    repairIds: ['edge_handles'],
    notes: '',
  });
  assert.equal(validTelegram.valid, true);
});

test('formatRubles and generateTicketCode produce consistent output', () => {
  assert.equal(formatRubles(4200), '4\u00A0200 ₽');
  assert.equal(generateTicketCode(42), 'DRT-1042');
  assert.match(generateTicketCode(), /^DRT-\d{4}$/);
});

