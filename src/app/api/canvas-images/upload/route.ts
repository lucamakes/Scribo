import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
  IMAGE_BUCKET_NAME as BUCKET_NAME,
  getUserStorageLimit,
  getUserStorageUsage,
} from '@/lib/services/imageStorage';

export const dynamic = 'force-dynamic';

const AVIF_QUALITY = 60;

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'No valid image file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const avifBuffer = await sharp(buffer).avif({ quality: AVIF_QUALITY }).toBuffer();

    // Enforce the per-account storage limit before writing the new file.
    const { limitBytes, limitMb } = await getUserStorageLimit(supabase, user.id);
    const currentUsage = await getUserStorageUsage(supabase, user.id);
    if (currentUsage + avifBuffer.length > limitBytes) {
      const usedMb = (currentUsage / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `Storage limit reached. You've used ${usedMb} MB of your ${limitMb} MB image storage. Delete some images to free up space.`,
          code: 'STORAGE_LIMIT_EXCEEDED',
          limitBytes,
          usedBytes: currentUsage,
        },
        { status: 413 }
      );
    }

    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.avif`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, avifBuffer, {
        cacheControl: '3600',
        contentType: 'image/avif',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Canvas image upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
