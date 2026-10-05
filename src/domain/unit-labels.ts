import type { BuildingType } from '@/db/schema';
import type { FloorPlan } from '@/db/repo/types';

import { unitLabelFor } from './units';

/**
 * Resolves what a unit is actually called: the landlord's own number if they
 * typed one, otherwise the generated convention.
 *
 * Shared by both repository implementations so a unit cannot end up named
 * differently on device and in the browser preview.
 */
export function resolveUnitLabel(
  plan: FloorPlan,
  position: number,
  type: BuildingType,
  totalFloors: number
): string {
  const chosen = plan.labels?.[position]?.trim();
  return chosen || unitLabelFor(type, plan.level, position, totalFloors);
}
