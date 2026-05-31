import { SupabaseClient } from '@supabase/supabase-js';

export const IMAGE_BUCKET_NAME = 'canvas-images';

// Per-account storage cap for uploaded images (in megabytes).
// Free accounts default to 50 MB; configurable via env.
export const MAX_STORAGE_MB = Number(process.env.IMAGE_STORAGE_LIMIT_MB) || 50;
export const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;

// Pro accounts get a larger image storage cap; configurable via env.
export const PRO_STORAGE_MB = Number(process.env.PRO_IMAGE_STORAGE_LIMIT_MB) || 500;
export const PRO_STORAGE_BYTES = PRO_STORAGE_MB * 1024 * 1024;

/**
 * Determine whether a user currently has Pro access.
 *
 * Mirrors the logic in subscriptionService: a user is Pro when their status is
 * 'pro', or 'cancelled' with a subscription end date still in the future.
 */
export async function isUserPro(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, subscription_end_date')
    .eq('id', userId)
    .single();

  if (error || !data) return false;

  const status = (data as { subscription_status: string | null }).subscription_status;
  const endDate = (data as { subscription_end_date: string | null }).subscription_end_date;

  if (status === 'pro') return true;

  if (status === 'cancelled' && endDate) {
    return new Date(endDate) > new Date();
  }

  return false;
}

/**
 * Resolve the image storage limit that applies to a given user, based on
 * whether they hold Pro access.
 */
export async function getUserStorageLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ limitBytes: number; limitMb: number; isPro: boolean }> {
  const isPro = await isUserPro(supabase, userId);
  return isPro
    ? { limitBytes: PRO_STORAGE_BYTES, limitMb: PRO_STORAGE_MB, isPro }
    : { limitBytes: MAX_STORAGE_BYTES, limitMb: MAX_STORAGE_MB, isPro };
}

/**
 * Sum the size of every object stored in a user's folder.
 *
 * Supabase storage paginates list() results, so page through the folder and
 * accumulate the byte size reported in each object's metadata.
 */
export async function getUserStorageUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const PAGE_SIZE = 100;
  let offset = 0;
  let total = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(IMAGE_BUCKET_NAME)
      .list(userId, { limit: PAGE_SIZE, offset });

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const item of data) {
      total += (item.metadata?.size as number | undefined) ?? 0;
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return total;
}
