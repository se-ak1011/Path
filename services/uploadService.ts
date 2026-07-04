import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '@/template/core';

const SIGNED_URL_TTL = 60 * 60;

/**
 * Pick a document (PDF or image) and upload it to a PRIVATE bucket under the
 * caller's own folder: {auth.uid()}/{timestamp}.{ext}. Returns the object path.
 */
export async function pickAndUploadDoc(
  bucket: string,
  userId: string,
): Promise<{ path: string | null; name: string | null; error: string | null; cancelled?: boolean }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return { path: null, name: null, error: null, cancelled: true };

  const asset = result.assets[0];
  try {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = (asset.name?.split('.').pop() || 'pdf').toLowerCase();
    const contentType = asset.mimeType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
    const path = `${userId}/${Date.now()}.${ext}`;

    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(bucket).upload(path, decode(base64), { contentType, upsert: false });
    if (error) return { path: null, name: null, error: error.message };
    return { path, name: asset.name || path, error: null };
  } catch (err) {
    return { path: null, name: null, error: err instanceof Error ? err.message : 'Could not read the file' };
  }
}

/** Signed URL for a private object (owner-only buckets). */
export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Pick an image (camera or library), upload it to a PUBLIC bucket and return its
 * public URL. Used for the therapist avatar and practice logo (branding bucket).
 * Path: {auth.uid()}/{kind}-{timestamp}.{ext}
 */
export async function pickAndUploadImage(
  bucket: string,
  userId: string,
  kind: 'avatar' | 'logo',
  source: 'camera' | 'library' = 'library',
): Promise<{ url: string | null; error: string | null; cancelled?: boolean }> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { url: null, error: 'Camera permission is needed.' };
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { url: null, error: 'Photo library permission is needed.' };
  }

  const result = await (source === 'camera'
    ? ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: kind === 'avatar' ? [1, 1] : [3, 1] })
    : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: kind === 'avatar' ? [1, 1] : [3, 1] }));

  if (result.canceled || !result.assets?.[0]) return { url: null, error: null, cancelled: true };
  const asset = result.assets[0];
  if (!asset.base64) return { url: null, error: 'Could not read the image.' };

  const isPng = (asset.mimeType || '').includes('png');
  const ext = isPng ? 'png' : 'jpg';
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).upload(path, decode(asset.base64), {
    contentType: isPng ? 'image/png' : 'image/jpeg',
    upsert: true,
  });
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
