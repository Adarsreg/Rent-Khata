import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { createBuilding } from '@/db/repo/building';
import type { FloorPlan } from '@/db/repo/types';
import type { BuildingType } from '@/db/schema';
import { unitLabelFor } from '@/domain/units';
import { parseMoneyToPaise } from '@/lib/money';

import {
  BuildingStep,
  FloorsStep,
  NumbersStep,
  RatesStep,
  UnitsStep,
} from '@/components/onboarding-steps';

/**
 * One screen with four steps, not four routes.
 *
 * A wizard's answers are a single object. Splitting it across routes would
 * mean threading partial state through params, and would let someone deep-link
 * into step 3 with nothing filled in. Local state here is both simpler and
 * impossible to land in a half-built state.
 */
const STEP_NAMES = ['Building', 'Floors', 'Units', 'Numbers', 'Rates'] as const;
const LAST_STEP = STEP_NAMES.length - 1;

/** Key for a unit's position in the structure, used for label overrides. */
const slotKey = (floorIndex: number, position: number) => `${floorIndex}:${position}`;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<BuildingType>('apartment');
  const [rentText, setRentText] = useState('');
  const [rateText, setRateText] = useState('');

  /**
   * Single source of truth for the structure: one entry per floor, holding
   * that floor's unit count. Floor count is `floorUnitCounts.length` rather
   * than its own state — two pieces of state that must agree is two pieces of
   * state that eventually won't.
   */
  const [floorUnitCounts, setFloorUnitCounts] = useState<number[]>([2, 3, 3]);

  /**
   * Only the numbers the landlord actually changed, keyed by slot. Storing
   * overrides rather than a full label array keeps `floorUnitCounts` the one
   * source of truth for the structure — a parallel array would have to be kept
   * in step with it, and eventually wouldn't be.
   */
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

  const totalUnits = floorUnitCounts.reduce((sum, count) => sum + count, 0);
  const canContinue = step === 0 ? name.trim().length > 0 : step === 2 ? totalUnits > 0 : true;

  function labelFor(floorIndex: number, position: number): string {
    return (
      labelOverrides[slotKey(floorIndex, position)] ??
      unitLabelFor(type, floorIndex + 1, position, floorUnitCounts.length)
    );
  }

  function setLabel(floorIndex: number, position: number, value: string) {
    setLabelOverrides((current) => ({ ...current, [slotKey(floorIndex, position)]: value }));
  }

  function setFloorCount(nextCount: number) {
    setFloorUnitCounts((current) => {
      if (nextCount <= current.length) return current.slice(0, nextCount);

      // New floors copy the floor below: buildings are usually uniform going
      // up, so this is the fewest taps for the common case.
      const grown = [...current];
      while (grown.length < nextCount) grown.push(grown[grown.length - 1] ?? 2);
      return grown;
    });
  }

  function setUnitsOnFloor(index: number, count: number) {
    setFloorUnitCounts((current) => current.map((c, i) => (i === index ? count : c)));
  }

  async function finish() {
    setSaving(true);
    try {
      const floors: FloorPlan[] = floorUnitCounts.map((unitCount, floorIndex) => ({
        level: floorIndex + 1,
        unitCount,
        labels: Array.from({ length: unitCount }, (_, position) =>
          labelFor(floorIndex, position)
        ),
      }));

      await createBuilding({
        name,
        type,
        floors,
        defaultRentPaise: parseMoneyToPaise(rentText) ?? 0,
        ratePaisePerUnit: parseMoneyToPaise(rateText) ?? 0,
      });

      router.replace('/home');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <Progress step={step} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled">
          <Animated.View
            key={step}
            entering={FadeInRight.duration(220)}
            exiting={FadeOutLeft.duration(160)}
            className="gap-5">
            {step === 0 && (
              <BuildingStep name={name} onName={setName} type={type} onType={setType} />
            )}
            {step === 1 && (
              <FloorsStep count={floorUnitCounts.length} onCount={setFloorCount} />
            )}
            {step === 2 && (
              <UnitsStep
                type={type}
                floorUnitCounts={floorUnitCounts}
                onChange={setUnitsOnFloor}
                totalUnits={totalUnits}
              />
            )}
            {step === 3 && (
              <NumbersStep
                type={type}
                floorUnitCounts={floorUnitCounts}
                labelFor={labelFor}
                onLabel={setLabel}
              />
            )}
            {step === 4 && (
              <RatesStep
                rentText={rentText}
                onRentText={setRentText}
                rateText={rateText}
                onRateText={setRateText}
              />
            )}
          </Animated.View>
        </ScrollView>

        <View className="flex-row gap-3 px-5 pb-2 pt-3">
          {step > 0 && (
            <Button
              label="Back"
              variant="ghost"
              icon="arrow-left"
              onPress={() => setStep(step - 1)}
            />
          )}
          <View className="flex-1">
            {step < LAST_STEP ? (
              <Button
                label="Continue"
                icon="arrow-right"
                block
                disabled={!canContinue}
                onPress={() => setStep(step + 1)}
              />
            ) : (
              <Button
                label={`Create ${totalUnits} units`}
                icon="check"
                block
                loading={saving}
                haptic="success"
                onPress={finish}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <View className="gap-1 px-5 pb-4 pt-2">
      <Text variant="kicker">
        Step {step + 1} of {STEP_NAMES.length} · {STEP_NAMES[step]}
      </Text>
      <View className="mt-2 flex-row gap-1.5">
        {STEP_NAMES.map((stepName, index) => (
          <View
            key={stepName}
            className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-brand' : 'bg-surface3'}`}
          />
        ))}
      </View>
    </View>
  );
}
