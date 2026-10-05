/**
 * Billing arithmetic, kept pure and DB-free so it can be unit-tested and
 * reasoned about on its own. Everything is integer paise.
 */

export type BillInput = {
  rentPaise: number;
  ratePaisePerUnit: number;
  prevReading: number | null;
  newReading: number | null;
};

export type BillComputation = {
  unitsConsumed: number | null;
  electricityPaise: number | null;
  totalPaise: number | null;
  /** True once there is enough information to bill and share. */
  isComplete: boolean;
};

export function computeBill(input: BillInput): BillComputation {
  const { rentPaise, ratePaisePerUnit, prevReading, newReading } = input;

  if (prevReading == null || newReading == null) {
    return {
      unitsConsumed: null,
      electricityPaise: null,
      // Rent alone is not a bill — without a reading the owner has not
      // finished entering the month, and showing a total would imply they had.
      totalPaise: null,
      isComplete: false,
    };
  }

  // Clamp at zero. A reading below the previous one is almost always a typo,
  // and a negative electricity charge silently crediting a tenant is worse
  // than a visible zero. The UI warns separately.
  const unitsConsumed = Math.max(0, newReading - prevReading);
  const electricityPaise = unitsConsumed * ratePaisePerUnit;

  return {
    unitsConsumed,
    electricityPaise,
    totalPaise: rentPaise + electricityPaise,
    isComplete: true,
  };
}

export type ReadingWarning =
  | { kind: 'belowPrevious'; prev: number; next: number }
  | { kind: 'impossibleSpike'; units: number; typical: number }
  | { kind: 'zeroConsumption' };

/**
 * Warnings, never blocks. A meter really can be replaced (resetting to zero),
 * a flat really can sit empty for a month, and a tenant really can run three
 * ACs in May. Refusing the input would just teach the owner to fake numbers.
 *
 * @param typicalUnits median of this unit's recent consumption, if known
 */
export function checkReading(
  prevReading: number | null,
  newReading: number | null,
  typicalUnits?: number | null
): ReadingWarning | null {
  if (prevReading == null || newReading == null) return null;

  if (newReading < prevReading) {
    return { kind: 'belowPrevious', prev: prevReading, next: newReading };
  }

  const units = newReading - prevReading;
  if (units === 0) return { kind: 'zeroConsumption' };

  if (typicalUnits && typicalUnits > 0 && units > typicalUnits * 5 && units > 100) {
    return { kind: 'impossibleSpike', units, typical: typicalUnits };
  }

  return null;
}

export function warningMessage(w: ReadingWarning): string {
  switch (w.kind) {
    case 'belowPrevious':
      return `New reading (${w.next.toLocaleString('en-IN')}) is lower than the previous one (${w.prev.toLocaleString('en-IN')}). Electricity will be charged as zero. Was the meter replaced?`;
    case 'impossibleSpike':
      return `${w.units.toLocaleString('en-IN')} units is about ${Math.round(w.units / w.typical)}× this unit's usual usage. Worth double-checking the reading.`;
    case 'zeroConsumption':
      return 'No units consumed this month. Fine if the unit was empty — otherwise check the reading.';
  }
}

export type PeriodTotals = {
  billedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  paidCount: number;
  unpaidCount: number;
  billedCount: number;
};

/** What a bill has to expose to be counted. Narrower than the stored row. */
type Summarisable = {
  totalPaise: number | null;
  isPaid: boolean;
};

/**
 * Month totals across a set of bills.
 *
 * A bill with no total has not been finished, so it is excluded entirely
 * rather than counted as zero — otherwise an untouched unit would read as
 * "billed ₹0" on the home screen.
 */
export function summarise(bills: readonly Summarisable[]): PeriodTotals {
  const totals: PeriodTotals = {
    billedPaise: 0,
    collectedPaise: 0,
    outstandingPaise: 0,
    paidCount: 0,
    unpaidCount: 0,
    billedCount: 0,
  };

  for (const bill of bills) {
    if (bill.totalPaise == null) continue;

    totals.billedCount++;
    totals.billedPaise += bill.totalPaise;

    if (bill.isPaid) {
      totals.collectedPaise += bill.totalPaise;
      totals.paidCount++;
    } else {
      totals.unpaidCount++;
    }
  }

  totals.outstandingPaise = totals.billedPaise - totals.collectedPaise;
  return totals;
}

/** Median is the right centre here: one freak summer month must not drag the baseline. */
export function medianUnits(samples: number[]): number | null {
  const valid = samples.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : Math.round((valid[mid - 1] + valid[mid]) / 2);
}
