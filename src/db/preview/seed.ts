import { computeBill } from '@/domain/bill';
import { currentPeriod, shiftPeriod } from '@/lib/period';

import { tables } from './store';

/**
 * Demo data for the browser preview.
 *
 * The preview exists so the interface can be judged on a desktop, and an
 * empty setup wizard shows almost none of it. This seeds a building that
 * exercises every state worth looking at: paid, due, overdue, not yet billed,
 * a unit with no tenant, uneven floors, and three months of history.
 *
 * Preview only. Device builds never import this file.
 */

const RENT = 650_000; // ₹6,500
const RATE = 650; // ₹6.50 per unit

type Seed = { label: string; tenant: string | null; phone: string | null; baseUsage: number };

/** Uneven on purpose — a real building is not a grid. */
const FLOORS: Seed[][] = [
  [
    { label: '101', tenant: 'Ramesh Kumar', phone: '9876543210', baseUsage: 142 },
    { label: '102', tenant: 'Sunita Devi', phone: '9876543211', baseUsage: 96 },
  ],
  [
    { label: '201', tenant: 'Imran Qureshi', phone: '9876543212', baseUsage: 210 },
    { label: '202', tenant: 'Priya Nair', phone: '9876543213', baseUsage: 118 },
    { label: '203', tenant: 'Arjun Mehta', phone: '9876543214', baseUsage: 165 },
  ],
  [
    { label: '301', tenant: 'Fatima Shaikh', phone: '9876543215', baseUsage: 134 },
    { label: '302', tenant: 'Vikram Rao', phone: '9876543216', baseUsage: 188 },
    { label: '303', tenant: null, phone: null, baseUsage: 0 },
  ],
];

export function seedPreview(): void {
  const now = Date.now();
  const thisMonth = currentPeriod();
  const months = [shiftPeriod(thisMonth, -2), shiftPeriod(thisMonth, -1), thisMonth];

  tables.buildings = [
    {
      id: 'building-main',
      name: 'Gupta Nivas',
      type: 'apartment',
      currencySymbol: '₹',
      countryCode: '91',
      defaultRentPaise: RENT,
      ratePaisePerUnit: RATE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];
  tables.floors = [];
  tables.units = [];
  tables.bills = [];

  FLOORS.forEach((unitsOnFloor, floorIndex) => {
    const floorId = `floor-${floorIndex + 1}`;

    tables.floors.push({
      id: floorId,
      buildingId: 'building-main',
      level: floorIndex + 1,
      label: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    unitsOnFloor.forEach((seed, position) => {
      const unitId = `unit-${seed.label}`;
      // Vacant units have no meter history at all.
      const opening = seed.tenant ? 4000 + floorIndex * 300 + position * 90 : null;

      tables.units.push({
        id: unitId,
        floorId,
        label: seed.label,
        position,
        tenantName: seed.tenant,
        tenantPhone: seed.phone,
        rentPaise: null,
        ratePaisePerUnit: null,
        meterDigits: 5,
        openingReading: opening,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      if (!seed.tenant || opening == null) return;

      let previous = opening;
      months.forEach((period, monthIndex) => {
        const isCurrentMonth = monthIndex === months.length - 1;

        // Leave the top floor unbilled this month so the "needs a reading"
        // state is visible on the home screen.
        if (isCurrentMonth && floorIndex === 2) return;

        // A little variation so the usage column does not look generated.
        const consumed = seed.baseUsage + ((position * 17 + monthIndex * 23) % 40) - 20;
        const reading = previous + Math.max(consumed, 10);
        const computed = computeBill({
          rentPaise: RENT,
          ratePaisePerUnit: RATE,
          prevReading: previous,
          newReading: reading,
        });

        tables.bills.push({
          id: `bill-${unitId}-${period}`,
          unitId,
          period,
          rentPaise: RENT,
          ratePaisePerUnit: RATE,
          prevReading: previous,
          newReading: reading,
          unitsConsumed: computed.unitsConsumed,
          electricityPaise: computed.electricityPaise,
          totalPaise: computed.totalPaise,
          // Past months are settled. This month is a realistic mix: the
          // ground floor has paid, the first floor has not.
          isPaid: isCurrentMonth ? floorIndex === 0 : true,
          paidAt: isCurrentMonth && floorIndex === 0 ? now : monthIndex < 2 ? now : null,
          note: null,
          photoUri: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });

        previous = reading;
      });
    });
  });
}
