import { useWindowDimensions } from 'react-native';

import { computeLayout, type Layout } from './layout-rules';

export type { Layout, SizeClass } from './layout-rules';
export { maxUnitsPerRow, unitTileWidth, UNIT_GAP, FLOOR_LABEL_WIDTH } from './layout-rules';

/**
 * The current window size class and the spacing that follows from it.
 *
 * All the actual decisions live in `layout-rules.ts` as a pure function of
 * width, so they can be tested against every real device viewport rather
 * than eyeballed on one.
 */
export function useLayout(): Layout {
  return computeLayout(useWindowDimensions().width);
}
