import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'canvas-images';

export async function uploadCanvasImage(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/canvas-images/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Upload failed');
  }

  const { url } = await res.json();
  return url;
}

export async function deleteCanvasImage(url: string): Promise<void> {
  const bucketPath = url.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];
  if (!bucketPath) return;

  await supabase.storage.from(BUCKET_NAME).remove([bucketPath]);
}

export interface ImageStorageUsage {
  usedBytes: number;
  limitBytes: number;
  limitMb: number;
  isPro: boolean;
}

export async function getImageStorageUsage(): Promise<ImageStorageUsage> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/canvas-images/usage', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch usage');
  }

  return res.json();
}
