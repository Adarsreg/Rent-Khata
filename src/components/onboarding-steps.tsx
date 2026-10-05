import { View } from 'react-native';

import type { BuildingType } from '@/db/schema';
import { unitLabelFor } from '@/domain/units';

import { Card } from './card';
import { PressableScale } from './pressable-scale';
import { Stepper } from './stepper';
import { Text } from './text';
import { TextField } from './text-field';
/**
 * The four setup-wizard steps, as presentational components.
 *
 * They hold no state: `app/onboarding/index.tsx` owns every answer, so each
 * step is a pure function of its props and can be read without tracing where
 * its values come from.
 *
 * Lives here rather than beside the route because Expo Router turns every
 * file under `src/app` into a screen.
 */

const BUILDING_TYPES: { value: BuildingType; title: string; blurb: string }[] = [
  { value: 'apartment', title: 'Apartment building', blurb: 'Units numbered 101, 102, 201…' },
  { value: 'independent', title: 'Independent house', blurb: 'A few units, simple numbering' },
  { value: 'pg', title: 'PG / Hostel', blurb: 'Numbered rooms' },
  { value: 'mixed', title: 'Shops + flats', blurb: 'Shops on the ground floor' },
];

export function BuildingStep({
  name,
  onName,
  type,
  onType,
}: {
  name: string;
  onName: (value: string) => void;
  type: BuildingType;
  onType: (value: BuildingType) => void;
}) {
  return (
    <>
      <Heading
        title="What should we call your building?"
        blurb="This appears at the top of every bill you share."
      />

      <TextField
        label="Building name"
        placeholder="e.g. Gupta Nivas"
        value={name}
        onChangeText={onName}
        autoFocus
        returnKeyType="next"
      />

      <View className="gap-2">
        <Text variant="label">Type</Text>
        {BUILDING_TYPES.map((option) => {
          const selected = type === option.value;
          return (
            <PressableScale
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.title}
              onPress={() => onType(option.value)}
              scaleTo={0.98}
              className={`rounded-md border p-4 ${
                selected ? 'border-brand bg-brand-muted' : 'border-border bg-surface'
              }`}>
              <Text variant="body" className="font-semibold">
                {option.title}
              </Text>
              <Text variant="caption" tone="secondary">
                {option.blurb}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </>
  );
}

export function FloorsStep({
  count,
  onCount,
}: {
  count: number;
  onCount: (next: number) => void;
}) {
  return (
    <>
      <Heading
        title="How many floors?"
        blurb="Count the ground floor as floor 1. You can change this later."
      />
      <Card className="flex-row items-center justify-between">
        <Text variant="body">Floors</Text>
        <Stepper value={count} onChange={onCount} min={1} max={30} label="floors" />
      </Card>
    </>
  );
}

export function UnitsStep({
  type,
  floorUnitCounts,
  onChange,
  totalUnits,
}: {
  type: BuildingType;
  floorUnitCounts: number[];
  onChange: (index: number, count: number) => void;
  totalUnits: number;
}) {
  return (
    <>
      <Heading
        title="How many units on each floor?"
        blurb="Floors can differ — 2 on the ground floor and 3 above is fine."
      />

      {floorUnitCounts.map((count, index) => (
        <Card key={index} className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text variant="body" className="font-semibold">
              Floor {index + 1}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {previewLabels(type, index + 1, count, floorUnitCounts.length)}
            </Text>
          </View>
          <Stepper
            value={count}
            onChange={(next) => onChange(index, next)}
            min={0}
            max={20}
            label={`units on floor ${index + 1}`}
          />
        </Card>
      ))}

      <Text variant="caption" tone="secondary">
        {totalUnits} units in total
      </Text>
    </>
  );
}

export function RatesStep({
  rentText,
  onRentText,
  rateText,
  onRateText,
}: {
  rentText: string;
  onRentText: (value: string) => void;
  rateText: string;
  onRateText: (value: string) => void;
}) {
  return (
    <>
      <Heading
        title="Default rent and electricity rate"
        blurb="Applied to every unit. You can override either on any individual unit."
      />
      <TextField
        label="Monthly rent per unit"
        prefix="₹"
        placeholder="6000"
        keyboardType="number-pad"
        value={rentText}
        onChangeText={onRentText}
        numeric
      />
      <TextField
        label="Electricity rate"
        prefix="₹"
        suffix="per unit"
        placeholder="6"
        keyboardType="decimal-pad"
        value={rateText}
        onChangeText={onRateText}
        numeric
        hint="What you charge per unit (kWh) of electricity consumed."
      />
    </>
  );
}

/** Shows the names the floor's units will actually get, e.g. "201, 202, 203". */
function previewLabels(
  type: BuildingType,
  level: number,
  count: number,
  totalFloors: number
): string {
  if (count === 0) return 'No units';

  const shown = Array.from({ length: Math.min(count, 4) }, (_, position) =>
    unitLabelFor(type, level, position, totalFloors)
  ).join(', ');

  return count > 4 ? `${shown}…` : shown;
}

function Heading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <View className="gap-2">
      <Text variant="title">{title}</Text>
      <Text variant="body" tone="secondary">
        {blurb}
      </Text>
    </View>
  );
}
