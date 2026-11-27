import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { repairRequests, reviews, users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed (getOrCreateUser):', error);
    throw new Error('Не удалось синхронизировать профиль пользователя.', { cause: error });
  }
}

export interface CreateRepairRequestInput {
  ticketCode: string;
  userId?: number | null;
  clientName: string;
  contact: string;
  itemType: string;
  repairs: string[];
  urgent: boolean;
  estimatedMin: number;
  estimatedMax: number;
  estimatedDays: string;
  notes?: string;
}

export async function createRepairRequest(input: CreateRepairRequestInput) {
  try {
    const result = await db
      .insert(repairRequests)
      .values({
        ticketCode: input.ticketCode,
        userId: input.userId ?? null,
        clientName: input.clientName,
        contact: input.contact,
        itemType: input.itemType,
        repairs: JSON.stringify(input.repairs),
        urgent: input.urgent,
        estimatedMin: input.estimatedMin,
        estimatedMax: input.estimatedMax,
        estimatedDays: input.estimatedDays,
        notes: input.notes || null,
        status: 'new',
        masterComment: 'Заявка получена. Алексей посмотрит описание и ответит в течение рабочего дня.',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed (createRepairRequest):', error);
    throw new Error('Не удалось сохранить заявку в журнал мастерской.', { cause: error });
  }
}

export async function findRepairRequestByCode(ticketCode: string) {
  try {
    const normalized = ticketCode.trim().toUpperCase();
    const rows = await db
      .select()
      .from(repairRequests)
      .where(eq(repairRequests.ticketCode, normalized))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed (findRepairRequestByCode):', error);
    throw new Error('Не удалось проверить статус квитанции.', { cause: error });
  }
}

export async function getUserRepairRequests(uid: string) {
  try {
    const rows = await db
      .select({
        id: repairRequests.id,
        ticketCode: repairRequests.ticketCode,
        clientName: repairRequests.clientName,
        contact: repairRequests.contact,
        itemType: repairRequests.itemType,
        repairs: repairRequests.repairs,
        urgent: repairRequests.urgent,
        estimatedMin: repairRequests.estimatedMin,
        estimatedMax: repairRequests.estimatedMax,
        estimatedDays: repairRequests.estimatedDays,
        notes: repairRequests.notes,
        status: repairRequests.status,
        masterComment: repairRequests.masterComment,
        createdAt: repairRequests.createdAt,
      })
      .from(repairRequests)
      .innerJoin(users, eq(repairRequests.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(repairRequests.createdAt));

    return rows;
  } catch (error) {
    console.error('Database query failed (getUserRepairRequests):', error);
    throw new Error('Не удалось загрузить список ваших квитанций.', { cause: error });
  }
}

export async function updateRepairRequestStatus(
  id: number,
  uid: string,
  status: string,
  masterComment?: string
) {
  try {
    const userRow = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRow[0]) {
      return null;
    }

    const existing = await db
      .select()
      .from(repairRequests)
      .where(eq(repairRequests.id, id))
      .limit(1);

    if (!existing[0] || existing[0].userId !== userRow[0].id) {
      return null;
    }

    const updated = await db
      .update(repairRequests)
      .set({
        status,
        masterComment: masterComment ?? existing[0].masterComment,
      })
      .where(eq(repairRequests.id, id))
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed (updateRepairRequestStatus):', error);
    throw new Error('Не удалось обновить статус квитанции.', { cause: error });
  }
}

export async function listReviews() {
  try {
    return await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(12);
  } catch (error) {
    console.error('Database query failed (listReviews):', error);
    throw new Error('Не удалось загрузить отзывы.', { cause: error });
  }
}

export interface CreateReviewInput {
  userId: number;
  authorName: string;
  district: string;
  itemRestored: string;
  beforeSummary: string;
  outcomeText: string;
}

export async function createReview(input: CreateReviewInput) {
  try {
    const result = await db
      .insert(reviews)
      .values({
        userId: input.userId,
        authorName: input.authorName,
        district: input.district,
        itemRestored: input.itemRestored,
        beforeSummary: input.beforeSummary,
        outcomeText: input.outcomeText,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed (createReview):', error);
    throw new Error('Не удалось сохранить отзыв.', { cause: error });
  }
}

