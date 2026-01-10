import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/stats
 * Returns platform statistics (user count and total words)
 */
export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Use service role key to bypass RLS for stats
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Get user count by counting distinct user_ids in projects table
        // This is more reliable than trying to access auth.users
        const { data: userIds, error: userError } = await supabase
            .from('projects')
            .select('user_id');

        if (userError) {
            console.error('Error fetching user count:', userError);
        }

        // Count unique users
        const uniqueUsers = userIds ? new Set(userIds.map(p => p.user_id)).size : 0;

        // Get total word count from all files
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('content')
            .eq('type', 'file')
            .not('content', 'is', null);

        if (itemsError) {
            console.error('Error fetching items:', itemsError);
        }

        // Calculate total words
        let totalWords = 0;
        if (items) {
            totalWords = items.reduce((sum, item) => {
                if (!item.content) return sum;
                
                // Strip HTML tags
                const plainText = item.content.replace(/<[^>]*>/g, ' ');
                
                // Count words
                const words = plainText.trim().split(/\s+/).filter(Boolean);
                return sum + words.length;
            }, 0);
        }

        // Format numbers with K/M suffixes
        const formatNumber = (num: number): string => {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            }
            return num.toString();
        };

        const stats = {
            users: uniqueUsers,
            words: totalWords,
            usersFormatted: formatNumber(uniqueUsers),
            wordsFormatted: formatNumber(totalWords),
        };

        return NextResponse.json(stats, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            },
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
