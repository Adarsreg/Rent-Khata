import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

/**
 * Browser-preview counterpart of `meter-photo.ts`.
 *
 * There is no app documents directory to copy into, so the blob URL the picker
 * returns is used as-is. It lives only as long as the page, which matches the
 * in-memory preview store it will be saved alongside.
 *
 * `launchCameraAsync` on web is a file input carrying the `capture` attribute:
 * a phone browser opens the camera, a desktop browser shows a file dialog.
 * Either way the user gets a picture, which is all the screen needs.
 */
export async function pickMeterPhoto(source: PhotoSource): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export function deleteMeterPhoto(_uri: string | null | undefined): void {
  // Blob URLs are reclaimed when the page unloads; nothing to clean up.
}
