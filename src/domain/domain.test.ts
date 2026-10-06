import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkReading, computeBill, medianUnits, summarise } from './bill.ts';
import { deriveStatus } from './status.ts';
import { effectiveRatePaise, effectiveRentPaise, unitLabelFor } from './units.ts';
import { formatPhoneForDisplay, toInternational } from '../lib/phone.ts';
import { formatMoney, formatUnits, parseInteger, parseMoneyToPaise } from '../lib/money.ts';
import {
  currentPeriod,
  formatPeriod,
  isFuturePeriod,
  nextPeriod,
  prevPeriod,
} from '../lib/period.ts';

/**
 * Pure-logic tests. These modules deliberately import nothing from React
 * Native, so they run under plain `node --experimental-strip-types` with no
 * test framework, no jest-expo, no transform config.
 *
 *   npm test
 */

describe('computeBill', () => {
  it('bills rent plus consumption x rate', () => {
    const r = computeBill({
      rentPaise: 600_000, // ₹6,000
      ratePaisePerUnit: 600, // ₹6/unit
      prevReading: 4120,
      newReading: 4260,
    });
    assert.equal(r.unitsConsumed, 140);
    assert.equal(r.electricityPaise, 84_000); // ₹840
    assert.equal(r.totalPaise, 684_000); // ₹6,840
    assert.equal(r.isComplete, true);
  });

  it('has no total until a reading is entered — rent alone is not a bill', () => {
    const r = computeBill({
      rentPaise: 600_000,
      ratePaisePerUnit: 600,
      prevReading: 4120,
      newReading: null,
    });
    assert.equal(r.totalPaise, null);
    assert.equal(r.isComplete, false);
  });

  it('clamps a backwards reading to zero rather than crediting the tenant', () => {
    const r = computeBill({
      rentPaise: 600_000,
      ratePaisePerUnit: 600,
      prevReading: 4260,
      newReading: 10, // meter replaced
    });
    assert.equal(r.unitsConsumed, 0);
    assert.equal(r.electricityPaise, 0);
    assert.equal(r.totalPaise, 600_000); // rent only, never less
  });

  it('handles a zero rate (rent-only landlord)', () => {
    const r = computeBill({
      rentPaise: 500_000,
      ratePaisePerUnit: 0,
      prevReading: 100,
      newReading: 250,
    });
    assert.equal(r.unitsConsumed, 150);
    assert.equal(r.totalPaise, 500_000);
  });
});

describe('checkReading', () => {
  it('warns when the new reading is lower', () => {
    assert.equal(checkReading(500, 100)?.kind, 'belowPrevious');
  });

  it('warns on zero consumption', () => {
    assert.equal(checkReading(500, 500)?.kind, 'zeroConsumption');
  });

  it('warns on an implausible spike against history', () => {
    assert.equal(checkReading(0, 900, 120)?.kind, 'impossibleSpike');
  });

  it('stays quiet for a normal month', () => {
    assert.equal(checkReading(4120, 4260, 130), null);
  });

  it('stays quiet when a big jump has no history to compare against', () => {
    assert.equal(checkReading(0, 900, null), null);
  });
});

describe('medianUnits', () => {
  it('ignores one freak month', () => {
    assert.equal(medianUnits([120, 130, 125, 900, 110]), 125);
  });
  it('returns null with no samples', () => {
    assert.equal(medianUnits([]), null);
  });
});

describe('formatMoney', () => {
  it('groups in the Indian system, not thousands', () => {
    assert.equal(formatMoney(100_000_00), '₹1,00,000');
    assert.equal(formatMoney(1_000_000_00), '₹10,00,000');
    assert.equal(formatMoney(684_000), '₹6,840');
  });

  it('hides paise when whole, shows them when not', () => {
    assert.equal(formatMoney(600_000), '₹6,000');
    assert.equal(formatMoney(600_050), '₹6,000.50');
  });

  it('renders an unentered amount as a dash, not zero', () => {
    assert.equal(formatMoney(null), '—');
  });
});

describe('parseMoneyToPaise', () => {
  it('accepts what a landlord actually types', () => {
    assert.equal(parseMoneyToPaise('6840'), 684_000);
    assert.equal(parseMoneyToPaise('6,840'), 684_000);
    assert.equal(parseMoneyToPaise('₹6840.50'), 684_050);
    assert.equal(parseMoneyToPaise(' 6840 '), 684_000);
  });

  it('rejects junk instead of storing zero', () => {
    assert.equal(parseMoneyToPaise(''), null);
    assert.equal(parseMoneyToPaise('abc'), null);
    assert.equal(parseMoneyToPaise('.'), null);
  });

  it('avoids float drift', () => {
    assert.equal(parseMoneyToPaise('0.1'), 10);
    assert.equal(parseMoneyToPaise('1234.56'), 123_456);
  });
});

describe('parseInteger / formatUnits', () => {
  it('strips separators from readings', () => {
    assert.equal(parseInteger('4,260'), 4260);
    assert.equal(parseInteger(''), null);
  });
  it('groups readings for display', () => {
    assert.equal(formatUnits(14260), '14,260');
  });
});

describe('period arithmetic', () => {
  it('wraps across year boundaries in both directions', () => {
    assert.equal(nextPeriod('2026-12'), '2027-01');
    assert.equal(prevPeriod('2026-01'), '2025-12');
  });

  it('formats for humans', () => {
    assert.equal(formatPeriod('2026-10'), 'October 2026');
  });

  it('sorts lexicographically, which is why periods are strings', () => {
    const sorted = ['2026-10', '2026-02', '2025-12'].sort();
    assert.deepEqual(sorted, ['2025-12', '2026-02', '2026-10']);
  });

  it('knows the current month is not the future', () => {
    const now = new Date(2026, 9, 5);
    assert.equal(currentPeriod(now), '2026-10');
    assert.equal(isFuturePeriod('2026-10', now), false);
    assert.equal(isFuturePeriod('2026-11', now), true);
  });
});

describe('deriveStatus', () => {
  const oct = '2026-10';
  const tenanted = (bill: { isPaid: boolean; totalPaise: number | null } | null) => ({
    hasTenant: true,
    bill,
  });

  it('is vacant for an empty unit, not "not billed"', () => {
    // The bug this prevents: a vacant flat counted as outstanding work meant
    // a fully settled month never reported as finished.
    assert.equal(deriveStatus({ hasTenant: false, bill: null }, oct), 'vacant');
  });

  it('is notBilled for a tenanted unit with no reading yet', () => {
    assert.equal(deriveStatus(tenanted(null), oct), 'notBilled');
    assert.equal(deriveStatus(tenanted({ isPaid: false, totalPaise: null }), oct), 'notBilled');
  });

  it('is paid once marked, regardless of date', () => {
    const wayLater = new Date(2027, 5, 1);
    assert.equal(deriveStatus(tenanted({ isPaid: true, totalPaise: 684_000 }), oct, wayLater), 'paid');
  });

  it('is due within the grace window', () => {
    const nov5 = new Date(2026, 10, 5);
    assert.equal(deriveStatus(tenanted({ isPaid: false, totalPaise: 684_000 }), oct, nov5), 'due');
  });

  it('tips to overdue after the 10th of the following month', () => {
    const nov15 = new Date(2026, 10, 15);
    assert.equal(deriveStatus(tenanted({ isPaid: false, totalPaise: 684_000 }), oct, nov15), 'overdue');
  });

  it('handles a December bill rolling into January', () => {
    const dec = '2026-12';
    assert.equal(
      deriveStatus(tenanted({ isPaid: false, totalPaise: 1000 }), dec, new Date(2027, 0, 5)),
      'due'
    );
    assert.equal(
      deriveStatus(tenanted({ isPaid: false, totalPaise: 1000 }), dec, new Date(2027, 0, 20)),
      'overdue'
    );
  });

  it('keeps a billed unit billed even after the tenant leaves', () => {
    // History must not evaporate when a flat is vacated.
    assert.equal(
      deriveStatus({ hasTenant: false, bill: { isPaid: true, totalPaise: 5000 } }, oct),
      'paid'
    );
  });
});
describe('summarise', () => {
  const paidBill = { totalPaise: 600_000, isPaid: true };
  const dueBill = { totalPaise: 400_000, isPaid: false };

  it('splits billed into collected and outstanding', () => {
    const t = summarise([paidBill, dueBill]);
    assert.equal(t.billedPaise, 1_000_000);
    assert.equal(t.collectedPaise, 600_000);
    assert.equal(t.outstandingPaise, 400_000);
    assert.equal(t.paidCount, 1);
    assert.equal(t.unpaidCount, 1);
    assert.equal(t.billedCount, 2);
  });

  it('ignores unfinished bills rather than counting them as zero', () => {
    // An untouched unit must not read as "billed ₹0" on the home screen.
    const t = summarise([paidBill, { totalPaise: null, isPaid: false }]);
    assert.equal(t.billedCount, 1);
    assert.equal(t.unpaidCount, 0);
    assert.equal(t.billedPaise, 600_000);
  });

  it('is all zeroes for an empty month', () => {
    const t = summarise([]);
    assert.deepEqual(t, {
      billedPaise: 0,
      collectedPaise: 0,
      outstandingPaise: 0,
      paidCount: 0,
      unpaidCount: 0,
      billedCount: 0,
    });
  });
});

describe('unitLabelFor', () => {
  it('numbers apartments floor-then-unit, Indian convention', () => {
    assert.equal(unitLabelFor('apartment', 1, 0, 4), '101');
    assert.equal(unitLabelFor('apartment', 2, 2, 4), '203');
    assert.equal(unitLabelFor('apartment', 10, 0, 12), '1001');
  });

  it('names PG rooms by position, ignoring the floor', () => {
    assert.equal(unitLabelFor('pg', 3, 0, 4), 'Room 1');
  });

  it('puts shops on the ground floor of a mixed building and flats above', () => {
    assert.equal(unitLabelFor('mixed', 1, 0, 3), 'Shop 1');
    assert.equal(unitLabelFor('mixed', 2, 0, 3), '201');
  });

  it('drops the floor prefix for a single-storey independent house', () => {
    assert.equal(unitLabelFor('independent', 1, 1, 1), 'Unit 2');
    assert.equal(unitLabelFor('independent', 2, 0, 3), '2-1');
  });
});

describe('effective rent and rate', () => {
  const building = { defaultRentPaise: 600_000, ratePaisePerUnit: 600 } as never;

  it('falls back to the building default', () => {
    const unit = { rentPaise: null, ratePaisePerUnit: null } as never;
    assert.equal(effectiveRentPaise(unit, building), 600_000);
    assert.equal(effectiveRatePaise(unit, building), 600);
  });

  it('prefers a per-unit override', () => {
    const unit = { rentPaise: 750_000, ratePaisePerUnit: 800 } as never;
    assert.equal(effectiveRentPaise(unit, building), 750_000);
    assert.equal(effectiveRatePaise(unit, building), 800);
  });

  it('treats a zero override as a real value, not as missing', () => {
    // A rent-free unit (family member, caretaker) must stay at zero.
    const unit = { rentPaise: 0, ratePaisePerUnit: 0 } as never;
    assert.equal(effectiveRentPaise(unit, building), 0);
    assert.equal(effectiveRatePaise(unit, building), 0);
  });
});

describe('toInternational', () => {
  it('prefixes the country code to a local number', () => {
    assert.equal(toInternational('9876543210', '91'), '919876543210');
  });

  it('accepts the shapes people actually type', () => {
    assert.equal(toInternational('98765 43210', '91'), '919876543210');
    assert.equal(toInternational('98765-43210', '91'), '919876543210');
    assert.equal(toInternational('+91 98765 43210', '91'), '919876543210');
  });

  it('does not double the country code on an already-international number', () => {
    assert.equal(toInternational('919876543210', '91'), '919876543210');
  });

  it('drops a domestic trunk zero', () => {
    // 098765 43210 is the same number as +91 98765 43210.
    assert.equal(toInternational('09876543210', '91'), '919876543210');
  });

  it('rejects anything too short to dial', () => {
    assert.equal(toInternational('', '91'), null);
    assert.equal(toInternational('12345', '91'), null);
    assert.equal(toInternational('abc', '91'), null);
  });

  it('works for other country codes', () => {
    assert.equal(toInternational('7700900123', '44'), '447700900123');
  });
});

describe('formatPhoneForDisplay', () => {
  it('groups an Indian mobile 5 + 5', () => {
    assert.equal(formatPhoneForDisplay('919876543210', '91'), '+91 98765 43210');
  });

  it('leaves unknown lengths ungrouped rather than guessing', () => {
    assert.equal(formatPhoneForDisplay('44770090012', '44'), '+44 770090012');
  });

  it('shows a dash when there is no number', () => {
    assert.equal(formatPhoneForDisplay(null, '91'), '—');
  });
});
