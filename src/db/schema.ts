import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Conventions that apply to every table, chosen now so adding cloud sync
 * later is a driver swap rather than a migration of every row:
 *
 * - `id` is a client-generated UUID (expo-crypto), never an autoincrement.
 *   A server can then never hand back an id that collides with a local one.
 * - `updatedAt` is epoch ms, touched on every write. This is the basis for
 *   last-write-wins reconciliation.
 * - `deletedAt` is a soft delete. A hard DELETE cannot be synced — the peer
 *   has no way to learn the row ever existed.
 * - Money is integer **paise**. Never a float, never rupees.
 */

const syncColumns = {
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
};

export const building = sqliteTable('building', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Drives unit vocabulary: 'Flat 101' vs 'Room 1' vs 'Shop 1'. */
  type: text('type', { enum: ['apartment', 'independent', 'pg', 'mixed'] })
    .notNull()
    .default('apartment'),
  currencySymbol: text('currency_symbol').notNull().default('₹'),
  /** Dialing code without '+', prefixed to tenant numbers for wa.me links. */
  countryCode: text('country_code').notNull().default('91'),
  /** Defaults a new unit inherits; each unit can override. */
  defaultRentPaise: integer('default_rent_paise').notNull().default(0),
  ratePaisePerUnit: integer('rate_paise_per_unit').notNull().default(0),
  ...syncColumns,
});

export const floor = sqliteTable(
  'floor',
  {
    id: text('id').primaryKey(),
    buildingId: text('building_id')
      .notNull()
      .references(() => building.id),
    /** 1-based, counting up from the ground floor. */
    level: integer('level').notNull(),
    label: text('label'),
    ...syncColumns,
  },
  (t) => [index('floor_building_idx').on(t.buildingId, t.level)]
);

export const unit = sqliteTable(
  'unit',
  {
    id: text('id').primaryKey(),
    floorId: text('floor_id')
      .notNull()
      .references(() => floor.id),
    label: text('label').notNull(),
    /** Left-to-right order within the floor, for the building elevation. */
    position: integer('position').notNull(),

    tenantName: text('tenant_name'),
    /** Local digits only, no country code — that lives on the building. */
    tenantPhone: text('tenant_phone'),

    /** null = inherit the building default. */
    rentPaise: integer('rent_paise'),
    ratePaisePerUnit: integer('rate_paise_per_unit'),

    /** Expected digit count on the meter dial — narrows OCR candidates. */
    meterDigits: integer('meter_digits').notNull().default(5),
    /**
     * The reading typed once, at setup. Every later month derives its
     * previous reading from the prior bill instead.
     */
    openingReading: integer('opening_reading'),

    ...syncColumns,
  },
  (t) => [index('unit_floor_idx').on(t.floorId, t.position)]
);

export const bill = sqliteTable(
  'bill',
  {
    id: text('id').primaryKey(),
    unitId: text('unit_id')
      .notNull()
      .references(() => unit.id),
    /** 'YYYY-MM'. Sorts lexicographically and is timezone-proof. */
    period: text('period').notNull(),

    /**
     * Rent and rate are SNAPSHOT onto the bill, not read through to the unit.
     * Raising the rate in March must not silently rewrite February's bill —
     * a ledger that changes its own history is not a ledger.
     */
    rentPaise: integer('rent_paise').notNull(),
    ratePaisePerUnit: integer('rate_paise_per_unit').notNull(),

    prevReading: integer('prev_reading'),
    newReading: integer('new_reading'),
    /** Derived, but stored so history survives later edits upstream. */
    unitsConsumed: integer('units_consumed'),
    electricityPaise: integer('electricity_paise'),
    totalPaise: integer('total_paise'),

    isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
    paidAt: integer('paid_at'),

    note: text('note'),
    /** Local file URI of the meter photo kept as proof. */
    photoUri: text('photo_uri'),

    ...syncColumns,
  },
  (t) => [
    // One bill per unit per month — the invariant the whole app rests on.
    uniqueIndex('bill_unit_period_idx').on(t.unitId, t.period),
    index('bill_period_idx').on(t.period),
  ]
);

export type Building = typeof building.$inferSelect;
export type BuildingType = Building['type'];
export type Floor = typeof floor.$inferSelect;
export type Unit = typeof unit.$inferSelect;
export type Bill = typeof bill.$inferSelect;
