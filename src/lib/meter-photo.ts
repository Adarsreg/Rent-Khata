import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

/**
 * Picking and keeping a photo of the electricity meter.
 *
 * The picker hands back a URI in the OS cache, which the system is free to
 * delete. A bill is a record the landlord may need months later, so the file
 * is copied into app documents and the stable copy is what gets stored.
 */
const PHOTO_DIRECTORY = 'meter-photos';

/**
 * Opens the camera or the gallery. Returns the stored URI, or null if the
 * user backed out or declined permission.
 */
export async function pickMeterPhoto(source: PhotoSource): Promise<string | null> {
  const granted = await requestPermission(source);
  if (!granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Cropping is the whole point: a tight frame on the digit register is far
    // easier to read back later than a photo of the whole meter box.
    allowsEditing: true,
    quality: 0.7,
    exif: false,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;

  return persist(result.assets[0].uri);
}

async function requestPermission(source: PhotoSource): Promise<boolean> {
  const { granted } =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

/** Moves the picked file out of the OS cache into app documents. */
function persist(cacheUri: string): string {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true });

  const extension = cacheUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const destination = new File(directory, `${Date.now()}.${extension}`);

  new File(cacheUri).copy(destination);
  return destination.uri;
}

/**
 * Deletes a stored photo. Failure is ignored on purpose: the file may already
 * be gone, and a missing photo must never block saving a bill.
 */
export function deleteMeterPhoto(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing actionable — the record matters, the thumbnail does not.
  }
}
