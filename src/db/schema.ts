import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const repairRequests = pgTable('repair_requests', {
  id: serial('id').primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  clientName: text('client_name').notNull(),
  contact: text('contact').notNull(),
  itemType: text('item_type').notNull(),
  repairs: text('repairs').notNull(),
  urgent: boolean('urgent').default(false).notNull(),
  estimatedMin: integer('estimated_min').notNull(),
  estimatedMax: integer('estimated_max').notNull(),
  estimatedDays: text('estimated_days').notNull(),
  notes: text('notes'),
  status: text('status').default('new').notNull(),
  masterComment: text('master_comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  authorName: text('author_name').notNull(),
  district: text('district').notNull(),
  itemRestored: text('item_restored').notNull(),
  beforeSummary: text('before_summary').notNull(),
  outcomeText: text('outcome_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  repairRequests: many(repairRequests),
  reviews: many(reviews),
}));

export const repairRequestsRelations = relations(repairRequests, ({ one }) => ({
  user: one(users, {
    fields: [repairRequests.userId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export type UserRecord = typeof users.$inferSelect;
export type RepairRequestRecord = typeof repairRequests.$inferSelect;
export type ReviewRecord = typeof reviews.$inferSelect;

