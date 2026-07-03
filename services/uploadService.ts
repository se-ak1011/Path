import * as DocumentPicker from 'expo-document-picker';
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
