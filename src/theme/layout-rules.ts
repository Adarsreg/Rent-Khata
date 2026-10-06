/**
 * Pure responsive rules — no React, no react-native, so the whole device
 * matrix can be asserted in layout.test.ts. The `useLayout` hook in
 * layout.ts is a one-line wrapper over `computeLayout`.
 *
 * Window size classes, following Material 3's breakpoints — the same ones
 * Apple's size classes map onto in practice.
 *
 *   small     < 360dp   iPhone SE and budget Androids, still very common
 *   compact   360-599   most phones, and a tablet in a split-screen half
 *   medium    600–839   small tablets, large tablets in portrait
 *   expanded  >= 840    tablets in landscape, foldables opened out
 *
 * Keyed off window width rather than device type on purpose: a tablet running
 * two apps side by side is a phone-shaped window and should lay out like one.
 */
export type SizeClass = 'small' | 'compact' | 'medium' | 'expanded';

export type Layout = {
  sizeClass: SizeClass;
  /** True once there is room to stand two columns side by side. */
  isWide: boolean;
  /**
   * Cap for forms and prose. Text past roughly 70 characters is tiring, and
   * a label/value row stretched across a 13" iPad puts the value a hand's
   * width from the thing it describes.
   */
  contentMaxWidth: number;
  /**
   * Cap for the home dashboard, which is a diagram rather than prose and
   * genuinely benefits from the extra width — the building gets bigger
   * instead of the page growing emptier.
   */
  dashboardMaxWidth: number;
  /** Horizontal page padding; grows with the window rather than jumping. */
  gutter: number;
  /** Vertical rhythm between major blocks. */
  sectionGap: number;
  /** Units get taller on bigger screens so the building keeps its presence. */
  unitTileMinHeight: number;
};

/**
 * The whole responsive decision as a pure function of window width.
 *
 * Separated from the hook so every real device viewport can be asserted in
 * `layout.test.ts` — a screenshot proves one size, this proves all of them,
 * and it keeps proving them.
 */
export function computeLayout(width: number): Layout {
  const sizeClass: SizeClass =
    width >= 840 ? 'expanded' : width >= 600 ? 'medium' : width >= 360 ? 'compact' : 'small';

  // Everything phone-shaped shares one column and edge-to-edge content.
  const phone = sizeClass === 'small' || sizeClass === 'compact';
  const small = sizeClass === 'small';

  return {
    sizeClass,
    /*
     * Two columns only once there is genuinely room for both. Tried at
     * 720dp first, which was wrong: at 744dp the building gets ~360dp — phone
     * width — and its units came out NARROWER than on a phone (72dp vs 96dp).
     * Below this a portrait tablet is better off with one wide column.
     */
    isWide: width >= 900,
    contentMaxWidth: phone ? Infinity : 560,
    dashboardMaxWidth: phone ? Infinity : sizeClass === 'medium' ? 720 : 1040,
    // A 320dp screen cannot spare 20 a side and still fit three readable
    // units across; 14 buys back the width where it matters most.
    gutter: small ? 14 : phone ? 20 : 32,
    sectionGap: small ? 16 : phone ? 20 : 28,
    unitTileMinHeight: small ? 84 : phone ? 96 : 112,
  };
}

/** Gap between unit tiles, and between the floor number and the first tile. */
export const UNIT_GAP = 10;
/** Width of the floor-number gutter down the left of the building. */
export const FLOOR_LABEL_WIDTH = 32;

/**
 * How wide one unit tile ends up, given the window.
 *
 * Exists so the device matrix can assert a legibility floor: a tile has to
 * hold a figure like "7,286.50" plus padding, and below roughly 88dp it
 * starts truncating. Mirrors the arithmetic in building-view.tsx.
 */
export function unitTileWidth(width: number, unitsOnWidestFloor: number): number {
  const layout = computeLayout(width);
  const columns = Math.min(maxUnitsPerRow(layout.sizeClass), Math.max(1, unitsOnWidestFloor));

  // On wide windows the building takes 3 of 5 parts beside the ledger.
  const columnShare = layout.isWide ? 3 / 5 : 1;
  const page = Math.min(width, layout.dashboardMaxWidth) - layout.gutter * 2;
  const buildingWidth = page * columnShare - (layout.isWide ? 32 : 0);
  const usable = buildingWidth - FLOOR_LABEL_WIDTH - UNIT_GAP - (columns - 1) * UNIT_GAP;

  return usable / columns;
}

/**
 * How many unit columns the building shows before wrapping. A floor with more
 * units than this wraps to a second row rather than shrinking every window to
 * an illegible sliver.
 */
export function maxUnitsPerRow(sizeClass: SizeClass): number {
  switch (sizeClass) {
    // Chosen so a unit tile never falls below ~84dp, which is the width
    // needed to hold a figure like "7,286.50" without truncating.
    case 'small':
      return 2;
    case 'compact':
      return 3;
    case 'medium':
      return 4;
    case 'expanded':
      return 6;
  }
}
