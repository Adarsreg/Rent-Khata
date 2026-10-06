import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Row, Rows, ScreenScroll, Section } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { getBuilding, updateBuilding } from '@/db/repo/building';
import { useQuery } from '@/db/use-query';
import { exportBackup, restoreBackup } from '@/lib/backup';
import { formatMoney, parseMoneyToPaise } from '@/lib/money';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

/**
 * Building-wide defaults. Changing a rate here affects future bills only —
 * every bill snapshots the rate it was created with, so last month's figures
 * never move under the landlord's feet.
 */
export default function SettingsScreen() {
  const colors = useColors();
  const { gutter } = useLayout();
  const { data: building, loading } = useQuery(() => getBuilding(), []);

  const [name, setName] = useState('');
  const [rentText, setRentText] = useState('');
  const [rateText, setRateText] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!building || seeded) return;
    setName(building.name);
    setRentText(String(Math.round(building.defaultRentPaise / 100)));
    setRateText(String(building.ratePaisePerUnit / 100));
    setSeeded(true);
  }, [building, seeded]);

  const dirty =
    !!building &&
    (name.trim() !== building.name ||
      (parseMoneyToPaise(rentText) ?? 0) !== building.defaultRentPaise ||
      (parseMoneyToPaise(rateText) ?? 0) !== building.ratePaisePerUnit);

  async function save() {
    if (!building) return;
    setSaving(true);
    try {
      await updateBuilding({
        name: name.trim() || building.name,
        defaultRentPaise: parseMoneyToPaise(rentText) ?? building.defaultRentPaise,
        ratePaisePerUnit: parseMoneyToPaise(rateText) ?? building.ratePaisePerUnit,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View style={{ paddingHorizontal: gutter }} className="pb-2 pt-3">
          <Text variant="title">Settings</Text>
        </View>

        <ScreenScroll keyboardShouldPersistTaps="handled">
          {loading || !building ? (
            <View className="items-center py-20">
              <ActivityIndicator color={colors.text} />
            </View>
          ) : (
            <>
              <Section title="Building">
                <View className="gap-4">
                  <TextField label="Name" value={name} onChangeText={setName} />
                  <TextField
                    label="Default monthly rent"
                    prefix={building.currencySymbol}
                    keyboardType="number-pad"
                    value={rentText}
                    onChangeText={setRentText}
                    numeric
                    hint="Used for new bills. A unit can override it."
                  />
                  <TextField
                    label="Electricity rate"
                    prefix={building.currencySymbol}
                    suffix="per unit"
                    keyboardType="decimal-pad"
                    value={rateText}
                    onChangeText={setRateText}
                    numeric
                  />
                </View>

                {dirty ? (
                  <Button
                    label="Save changes"
                    block
                    loading={saving}
                    disabled={saving}
                    onPress={save}
                  />
                ) : null}
              </Section>

              <Section title="Current rates">
                <Rows>
                  <Row label="Rent per unit" value={formatMoney(building.defaultRentPaise, building.currencySymbol)} />
                  <Row
                    label="Electricity"
                    value={`${formatMoney(building.ratePaisePerUnit, building.currencySymbol)} / unit`}
                    last
                  />
                </Rows>
                <Text variant="caption" tone="tertiary">
                  Changing a rate affects future bills only. Bills already recorded keep the rate
                  they were created with.
                </Text>
              </Section>

              <BackupSection />
            </>
          )}
        </ScreenScroll>
      </SafeAreaView>
    </View>
  );
}

/**
 * Backup and restore.
 *
 * Everything is stored on this phone and nowhere else, so until there is a
 * server this is the only thing between the owner and losing years of records
 * with a lost handset. Said plainly here rather than buried, because an owner
 * who does not know they need a backup will not take one.
 */
function BackupSection() {
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function doExport() {
    setBusy('export');
    setNotice(null);
    try {
      const result = await exportBackup();
      setNotice(
        result.status === 'shared'
          ? null
          : 'Sharing is not available on this device, so the backup could not be sent anywhere.'
      );
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'The backup could not be created.');
    } finally {
      setBusy(null);
    }
  }

  function confirmRestore() {
    Alert.alert(
      'Replace everything?',
      'Restoring a backup removes the units and bills on this phone and puts the backup’s records in their place. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: doRestore },
      ]
    );
  }

  async function doRestore() {
    setBusy('restore');
    setNotice(null);
    try {
      const result = await restoreBackup();
      if (result.status === 'restored') {
        setNotice(`Restored ${result.units} units and ${result.bills} bills.`);
      } else if (result.status === 'invalid') {
        setNotice(result.reason);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'That backup could not be restored.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section title="Your data">
      <Text variant="body" tone="secondary">
        Your records live on this phone only. Save a backup somewhere safe so a lost or replaced
        phone does not take your ledger with it.
      </Text>

      <View className="gap-2">
        <Button
          label="Save a backup"
          icon="download"
          variant="secondary"
          block
          loading={busy === 'export'}
          disabled={busy !== null}
          onPress={doExport}
        />
        <Button
          label="Restore from a backup"
          icon="upload"
          variant="ghost"
          block
          loading={busy === 'restore'}
          disabled={busy !== null}
          onPress={confirmRestore}
        />
      </View>

      {notice ? (
        <Text variant="caption" tone="overdue">
          {notice}
        </Text>
      ) : null}
    </Section>
  );
}
