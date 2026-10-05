import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { deleteMeterPhoto, pickMeterPhoto, type PhotoSource } from '@/lib/meter-photo';
import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

/**
 * Optional photo of the meter, attached to a bill as proof of the reading.
 *
 * Deliberately secondary to the number field above it. Typing the reading is
 * the fast, reliable path and always works; the photo is evidence for later,
 * not a way to avoid typing. Nothing here can block saving a bill.
 */
export function MeterPhotoField({
  photoUri,
  onChange,
}: {
  photoUri: string | null;
  onChange: (uri: string | null) => void;
}) {
  const colors = useColors();
  const [working, setWorking] = useState(false);

  async function attach(source: PhotoSource) {
    setWorking(true);
    try {
      const uri = await pickMeterPhoto(source);
      if (!uri) return;

      // Replacing a photo should not leave the old file behind.
      deleteMeterPhoto(photoUri);
      onChange(uri);
    } catch {
      Alert.alert(
        'Couldn’t add the photo',
        'You can still type the reading in by hand — the photo is optional.'
      );
    } finally {
      setWorking(false);
    }
  }

  function remove() {
    deleteMeterPhoto(photoUri);
    onChange(null);
  }

  if (photoUri) {
    return (
      <View className="flex-row items-center gap-3">
        <Image
          source={{ uri: photoUri }}
          style={{ width: 64, height: 64, borderRadius: 10 }}
          contentFit="cover"
          accessibilityLabel="Photo of the meter for this reading"
        />
        <View className="flex-1">
          <Text variant="label">Meter photo attached</Text>
          <Text variant="caption" tone="tertiary">
            Kept with this month’s bill as proof.
          </Text>
        </View>
        <PressableScale
          accessibilityLabel="Remove meter photo"
          onPress={remove}
          scaleTo={0.9}
          className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2">
          <Feather name="trash-2" size={16} color={colors.textSecondary} />
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text variant="caption" tone="tertiary">
        Optional: attach a photo of the meter.
      </Text>
      <View className="flex-row gap-2">
        <PhotoButton
          icon="camera"
          label="Take photo"
          disabled={working}
          onPress={() => attach('camera')}
        />
        <PhotoButton
          icon="image"
          label="Choose photo"
          disabled={working}
          onPress={() => attach('library')}
        />
      </View>
    </View>
  );
}

function PhotoButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'camera' | 'image';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.96}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-md border border-border bg-surface2 px-3 py-3 ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Feather name={icon} size={16} color={colors.text} />
      <Text variant="label">{label}</Text>
    </PressableScale>
  );
}
