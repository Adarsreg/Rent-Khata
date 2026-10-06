import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeLayout, maxUnitsPerRow, unitTileWidth } from './layout-rules.ts';

/**
 * The responsive layout, checked against every viewport the app will actually
 * meet.
 *
 * This exists instead of a pile of screenshots. A screenshot proves one size
 * once; this proves all of them on every run, and fails the build if a tweak
 * to a breakpoint quietly squeezes units into illegibility on a cheap Android.
 *
 * Widths are logical points/dp (CSS pixels), which is what React Native
 * reports — not physical pixels.
 */

type Device = { name: string; width: number; height: number };

/** Portrait widths, smallest first. */
const PHONES: Device[] = [
  { name: 'iPhone SE (1st gen)', width: 320, height: 568 },
  { name: 'Galaxy Fold (closed)', width: 344, height: 882 },
  { name: 'Android small / Galaxy S8', width: 360, height: 740 },
  { name: 'iPhone SE (2nd/3rd gen)', width: 375, height: 667 },
  { name: 'iPhone 13 mini', width: 375, height: 812 },
  { name: 'iPhone 14 / 15 / 16', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Pixel 7 / 8', width: 412, height: 915 },
  { name: 'Redmi / budget Android', width: 393, height: 873 },
];

const TABLETS: Device[] = [
  { name: 'Galaxy Fold (open)', width: 673, height: 841 },
  { name: 'iPad mini portrait', width: 744, height: 1133 },
  { name: 'iPad 10.9 portrait', width: 820, height: 1180 },
  { name: 'iPad Pro 11 portrait', width: 834, height: 1194 },
  { name: 'iPad Pro 12.9 portrait', width: 1024, height: 1366 },
  { name: 'iPad 10.9 landscape', width: 1180, height: 820 },
  { name: 'iPad Pro 12.9 landscape', width: 1366, height: 1024 },
  { name: 'Android tablet landscape', width: 1280, height: 800 },
];

/**
 * A tile must hold a figure like "7,286.50" at 15px plus its own padding.
 * Below this it truncates, which is how the app looked unfinished before.
 */
const MIN_TILE_WIDTH = 84;

/** The widest realistic floor. Most buildings are 2-4 units per floor. */
const TYPICAL_FLOOR = 3;
const WIDE_FLOOR = 4;

describe('size classes', () => {
  it('puts the smallest phones in their own class', () => {
    assert.equal(computeLayout(320).sizeClass, 'small');
    assert.equal(computeLayout(344).sizeClass, 'small');
    assert.equal(computeLayout(359).sizeClass, 'small');
  });

  it('treats ordinary phones as compact', () => {
    for (const width of [360, 375, 390, 412, 430]) {
      assert.equal(computeLayout(width).sizeClass, 'compact', `${width}dp`);
    }
  });

  it('treats portrait tablets as medium and landscape as expanded', () => {
    assert.equal(computeLayout(744).sizeClass, 'medium');
    assert.equal(computeLayout(820).sizeClass, 'medium');
    assert.equal(computeLayout(1024).sizeClass, 'expanded');
    assert.equal(computeLayout(1366).sizeClass, 'expanded');
  });

  it('only goes two-column when both columns genuinely fit', () => {
    // 720dp was tried and reverted: it made tablet units narrower than phone
    // units. A small portrait tablet gets one wide column instead.
    assert.equal(computeLayout(744).isWide, false);
    assert.equal(computeLayout(834).isWide, false);
    assert.equal(computeLayout(1024).isWide, true);
    assert.equal(computeLayout(430).isWide, false);
  });

  it('lays a split-screen tablet out like the phone-shaped window it is', () => {
    assert.equal(computeLayout(400).isWide, false);
    assert.equal(computeLayout(400).contentMaxWidth, Infinity);
  });
});

describe('every phone keeps units legible', () => {
  for (const device of PHONES) {
    it(`${device.name} (${device.width}dp)`, () => {
      const tile = unitTileWidth(device.width, TYPICAL_FLOOR);
      assert.ok(
        tile >= MIN_TILE_WIDTH,
        `${device.name}: tile is ${tile.toFixed(0)}dp, needs >= ${MIN_TILE_WIDTH}dp`
      );
    });
  }

  it('wraps rather than shrinking when a floor is wide', () => {
    // A 6-unit floor on a 320dp screen must wrap to 3 across, not squeeze
    // six slivers onto one row.
    assert.equal(maxUnitsPerRow('small'), 2);
    const tile = unitTileWidth(320, 6);
    assert.ok(tile >= MIN_TILE_WIDTH, `wrapped tile ${tile.toFixed(0)}dp too narrow`);
  });

  it('still fits a 4-unit floor on the smallest phone by wrapping', () => {
    const tile = unitTileWidth(320, WIDE_FLOOR);
    assert.ok(tile >= MIN_TILE_WIDTH, `tile ${tile.toFixed(0)}dp too narrow`);
  });
});

describe('every tablet keeps units legible', () => {
  for (const device of TABLETS) {
    it(`${device.name} (${device.width}dp)`, () => {
      const tile = unitTileWidth(device.width, WIDE_FLOOR);
      assert.ok(
        tile >= MIN_TILE_WIDTH,
        `${device.name}: tile is ${tile.toFixed(0)}dp, needs >= ${MIN_TILE_WIDTH}dp`
      );
    });
  }

  it('caps the reading column so rows do not stretch across a 12.9" iPad', () => {
    // Without a cap the amount ends up a hand's width from its unit.
    assert.equal(computeLayout(1366).contentMaxWidth, 560);
    assert.ok(computeLayout(1366).dashboardMaxWidth <= 1040);
  });
});

describe('gutters and spacing scale sensibly', () => {
  it('never spends more than a tenth of a small screen on gutters', () => {
    const { gutter } = computeLayout(320);
    assert.ok(gutter * 2 <= 320 * 0.1, `gutters ${gutter * 2}dp too wide on 320dp`);
  });

  it('grows the gutter on bigger windows and never shrinks it', () => {
    const widths = [320, 360, 390, 744, 1024, 1366];
    const gutters = widths.map((w) => computeLayout(w).gutter);
    for (let i = 1; i < gutters.length; i++) {
      assert.ok(gutters[i] >= gutters[i - 1], `gutter shrank from ${widths[i - 1]} to ${widths[i]}`);
    }
  });

  it('keeps tiles tall enough to stack a label over an amount', () => {
    for (const width of [320, 390, 744, 1366]) {
      assert.ok(computeLayout(width).unitTileMinHeight >= 80, `${width}dp too short`);
    }
  });
});
