import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createRepairRequest,
  createReview,
  findRepairRequestByCode,
  getOrCreateUser,
  getUserRepairRequests,
  listReviews,
  updateRepairRequestStatus,
} from './src/db/repository.ts';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { ensureSchema } from './src/db/init.ts';
import { pool } from './src/db/index.ts';
import {
  calculateEstimate,
  generateTicketCode,
  LEATHER_ITEMS,
  REPAIR_OPERATIONS,
  TICKET_STATUS_META,
  validateLeadForm,
  type LeatherItemId,
  type RepairOperationId,
  type TicketStatus,
} from './src/utils/estimator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_ITEMS = new Set(LEATHER_ITEMS.map((item) => item.id));
const VALID_REPAIRS = new Set(REPAIR_OPERATIONS.map((op) => op.id));
const VALID_STATUSES = new Set<TicketStatus>(['new', 'inspecting', 'in_work', 'ready', 'picked_up']);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/reviews', async (_req, res) => {
  try {
    const rows = await listReviews();
    res.json({ reviews: rows });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    res.status(500).json({ error: 'Не удалось загрузить отзывы.' });
  }
});

app.post('/api/leads', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    const itemType = (VALID_ITEMS.has(body.itemType) ? body.itemType : 'bag') as LeatherItemId;
    const repairIds = Array.isArray(body.repairIds)
      ? body.repairIds.filter((id: unknown): id is RepairOperationId =>
          typeof id === 'string' && VALID_REPAIRS.has(id as RepairOperationId)
        )
      : [];
    const urgent = Boolean(body.urgent);
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : undefined;

    const validation = validateLeadForm({
      clientName,
      contact,
      itemType,
      repairIds,
      notes,
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Проверьте поля заявки.',
        errors: validation.errors,
      });
    }

    const estimate = calculateEstimate({ itemType, repairIds, urgent, promoCode });
    const estimatedMin = estimate.isEmpty ? 1500 : estimate.minPrice;
    const estimatedMax = estimate.isEmpty ? 3500 : estimate.maxPrice;
    const estimatedDays = estimate.isEmpty ? '3–5 дн.' : estimate.daysLabel;
    const repairLabels =
      estimate.repairLabels.length > 0 ? estimate.repairLabels : ['Индивидуальный осмотр'];

    let userId: number | null = null;
    if (req.user?.uid && req.user?.email) {
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email, req.user.name);
      userId = dbUser.id;
    }

    let created = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ticketCode = generateTicketCode();
      try {
        created = await createRepairRequest({
          ticketCode,
          userId,
          clientName,
          contact,
          itemType,
          repairs: repairLabels,
          urgent,
          estimatedMin,
          estimatedMax,
          estimatedDays,
          notes,
        });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
      }
    }

    if (!created) {
      return res.status(500).json({ error: 'Не удалось выписать квитанцию. Попробуйте ещё раз.' });
    }

    return res.status(201).json({
      ticket: created,
    });
  } catch (error) {
    console.error('Failed to create lead:', error);
    return res.status(500).json({ error: 'Не удалось сохранить заявку. Попробуйте чуть позже.' });
  }
});

app.get('/api/tickets/:code', async (req, res) => {
  try {
    const code = (req.params.code ?? '').trim().toUpperCase();
    if (!/^DRT-\d{4}$/.test(code)) {
      return res.status(400).json({
        error: 'Формат квитанции — DRT-XXXX (например, DRT-2401).',
      });
    }

    const ticket = await findRepairRequestByCode(code);
    if (!ticket) {
      return res.status(404).json({
        error: `Квитанция ${code} не найдена. Проверьте цифры или напишите мастеру.`,
      });
    }

    const statusKey = (VALID_STATUSES.has(ticket.status as TicketStatus)
      ? ticket.status
      : 'new') as TicketStatus;

    return res.json({
      ticket: {
        ticketCode: ticket.ticketCode,
        clientName: ticket.clientName,
        itemType: ticket.itemType,
        repairs: ticket.repairs,
        urgent: ticket.urgent,
        estimatedMin: ticket.estimatedMin,
        estimatedMax: ticket.estimatedMax,
        estimatedDays: ticket.estimatedDays,
        status: statusKey,
        statusMeta: TICKET_STATUS_META[statusKey],
        masterComment: ticket.masterComment,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to track ticket:', error);
    return res.status(500).json({ error: 'Не удалось проверить статус квитанции.' });
  }
});

app.get('/api/account/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid || !req.user?.email) {
      return res.status(401).json({ error: 'Требуется авторизация.' });
    }
    await getOrCreateUser(req.user.uid, req.user.email, req.user.name);
    const orders = await getUserRepairRequests(req.user.uid);
    return res.json({ orders });
  } catch (error) {
    console.error('Failed to load user orders:', error);
    return res.status(500).json({ error: 'Не удалось загрузить ваши квитанции.' });
  }
});

app.patch('/api/account/orders/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Требуется авторизация.' });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Некорректный номер заказа.' });
    }
    const nextStatus = req.body?.status;
    if (!VALID_STATUSES.has(nextStatus)) {
      return res.status(400).json({ error: 'Недопустимый статус.' });
    }
    const masterComment =
      typeof req.body?.masterComment === 'string' ? req.body.masterComment.trim() : undefined;

    const updated = await updateRepairRequestStatus(id, req.user.uid, nextStatus, masterComment);
    if (!updated) {
      return res.status(404).json({ error: 'Квитанция не найдена или недоступна.' });
    }
    return res.json({ order: updated });
  } catch (error) {
    console.error('Failed to update order status:', error);
    return res.status(500).json({ error: 'Не удалось обновить статус.' });
  }
});

app.post('/api/account/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid || !req.user?.email) {
      return res.status(401).json({ error: 'Требуется авторизация.' });
    }
    const dbUser = await getOrCreateUser(req.user.uid, req.user.email, req.user.name);

    const authorName =
      typeof req.body?.authorName === 'string' && req.body.authorName.trim().length >= 2
        ? req.body.authorName.trim()
        : req.user.name || 'Клиент мастерской';
    const district =
      typeof req.body?.district === 'string' && req.body.district.trim().length >= 2
        ? req.body.district.trim()
        : 'Самара';
    const itemRestored =
      typeof req.body?.itemRestored === 'string' ? req.body.itemRestored.trim() : '';
    const beforeSummary =
      typeof req.body?.beforeSummary === 'string' ? req.body.beforeSummary.trim() : '';
    const outcomeText =
      typeof req.body?.outcomeText === 'string' ? req.body.outcomeText.trim() : '';

    if (itemRestored.length < 3 || outcomeText.length < 12) {
      return res.status(400).json({
        error: 'Укажите, какую вещь делали, и напишите пару слов о результате.',
      });
    }

    const saved = await createReview({
      userId: dbUser.id,
      authorName,
      district,
      itemRestored,
      beforeSummary: beforeSummary || 'Сложный ремонт и восстановление кожи',
      outcomeText,
    });

    return res.status(201).json({ review: saved });
  } catch (error) {
    console.error('Failed to create review:', error);
    return res.status(500).json({ error: 'Не удалось опубликовать отзыв.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  // Ensure DB tables exist
  try {
    await ensureSchema(pool);
  } catch (error) {
    console.error('Failed to ensure DB schema:', error);
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Dratva workshop server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
