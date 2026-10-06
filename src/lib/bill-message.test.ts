import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildBillMessage } from './bill-message.ts';

/**
 * The message a tenant receives. Worth pinning down: it is the only part of
 * the app someone outside the household ever sees, and a formatting slip
 * shows up in a stranger's chat rather than in a log.
 */

const building = {
  name: 'Gupta Nivas',
  currencySymbol: '₹',
} as never;

const unit = { label: '203', tenantName: 'Arjun Mehta' } as never;

const bill = {
  rentPaise: 650_000,
  electricityPaise: 127_400,
  totalPaise: 777_400,
  prevReading: 4120,
  newReading: 4316,
  unitsConsumed: 196,
  ratePaisePerUnit: 650,
};

describe('buildBillMessage', () => {
  it('uses WhatsApp bold markers for WhatsApp', () => {
    const text = buildBillMessage({ building, unit, bill, period: '2026-10' });
    assert.ok(text.includes('*Rent — October 2026*'), text);
    assert.ok(text.includes('*Total: ₹7,774*'), text);
  });

  it('sends no asterisks over SMS, where they would show literally', () => {
    const text = buildBillMessage({ building, unit, bill, period: '2026-10', style: 'plain' });
    assert.ok(!text.includes('*'), 'plain message must contain no asterisks');
    assert.ok(text.includes('Total: ₹7,774'), text);
    assert.ok(text.includes('Rent — October 2026'), text);
  });

  it('shows the meter working so the tenant can check it', () => {
    const text = buildBillMessage({ building, unit, bill, period: '2026-10', style: 'plain' });
    assert.ok(text.includes('meter 4,120 to 4,316 = 196 units at ₹6.50'), text);
  });

  it('greets the tenant by name when there is one', () => {
    const text = buildBillMessage({ building, unit, bill, period: '2026-10' });
    assert.ok(text.includes('Hello Arjun Mehta,'), text);
  });

  it('omits the greeting rather than saying "Hello null"', () => {
    const anonymous = { label: '303', tenantName: null } as never;
    const text = buildBillMessage({ building, unit: anonymous, bill, period: '2026-10' });
    assert.ok(!text.toLowerCase().includes('hello'), text);
  });

  it('omits the electricity line when there is no reading yet', () => {
    const rentOnly = { ...bill, electricityPaise: null, prevReading: null, newReading: null };
    const text = buildBillMessage({ building, unit, bill: rentOnly, period: '2026-10' });
    assert.ok(!text.includes('Electricity'), text);
    assert.ok(text.includes('Rent: ₹6,500'), text);
  });
});
