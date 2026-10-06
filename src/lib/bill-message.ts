import type { Bill, Building, Unit } from '@/db/schema';
import { formatAmount, formatMoney, formatUnits } from './money.ts';
import { formatPeriod, type Period } from './period.ts';

/**
 * The bill as a message a tenant will actually read.
 *
 * Formatting is per channel, not one string for everything: WhatsApp renders
 * `*asterisks*` as bold, while SMS shows them literally — an unadjusted
 * message arrives as `*TOTAL ₹6,840*` and looks broken.
 */
export type MessageStyle = 'whatsapp' | 'plain';

export type BillForMessage = Pick<
  Bill,
  | 'rentPaise'
  | 'electricityPaise'
  | 'totalPaise'
  | 'prevReading'
  | 'newReading'
  | 'unitsConsumed'
  | 'ratePaisePerUnit'
>;

export function buildBillMessage(args: {
  building: Building;
  unit: Unit;
  bill: BillForMessage;
  period: Period;
  /** Defaults to WhatsApp, the common case. */
  style?: MessageStyle;
}): string {
  const { building, unit, bill, period, style = 'whatsapp' } = args;
  const symbol = building.currencySymbol;
  const bold = (text: string) => (style === 'whatsapp' ? `*${text}*` : text);

  const lines: string[] = [
    bold(`Rent — ${formatPeriod(period)}`),
    `${unit.label}, ${building.name}`,
    '',
  ];

  if (unit.tenantName) {
    lines.push(`Hello ${unit.tenantName},`, '');
  }

  lines.push(`Rent: ${symbol}${formatAmount(bill.rentPaise)}`);

  if (bill.electricityPaise != null) {
    lines.push(`Electricity: ${symbol}${formatAmount(bill.electricityPaise)}`);

    if (bill.prevReading != null && bill.newReading != null) {
      // The working, so the tenant can check it against their own meter.
      lines.push(
        `  meter ${formatUnits(bill.prevReading)} to ${formatUnits(bill.newReading)}` +
          ` = ${formatUnits(bill.unitsConsumed)} units at ${formatMoney(
            bill.ratePaisePerUnit,
            symbol
          )}`
      );
    }
  }

  lines.push('', bold(`Total: ${symbol}${formatAmount(bill.totalPaise)}`), '');
  lines.push('Please pay when you can. Thank you!');

  return lines.join('\n');
}
