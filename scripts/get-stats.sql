-- ============================================
-- Scribo Statistics Queries
-- Run these queries to get real-time stats for your landing page
-- ============================================

-- Query 1: Total number of users
-- This counts all users who have signed up
SELECT COUNT(DISTINCT id) as total_users
FROM auth.users;

-- Query 2: Total word count across all projects
-- This sums up all words from all file content
SELECT 
    COALESCE(SUM(
        array_length(
            regexp_split_to_array(
                regexp_replace(content, '<[^>]*>', ' ', 'g'), -- Strip HTML tags
                '\s+'
            ), 
            1
        )
    ), 0) as total_words
FROM items
WHERE type = 'file' 
AND content IS NOT NULL 
AND content != '';

-- Query 3: Combined stats (recommended - run this one)
-- Gets both user count and total words in a single query
SELECT 
    (SELECT COUNT(DISTINCT id) FROM auth.users) as total_users,
    COALESCE(SUM(
        array_length(
            regexp_split_to_array(
                regexp_replace(content, '<[^>]*>', ' ', 'g'),
                '\s+'
            ), 
            1
        )
    ), 0) as total_words
FROM items
WHERE type = 'file' 
AND content IS NOT NULL 
AND content != '';

-- Query 4: More detailed stats (optional)
-- Includes additional metrics like projects, files, and active users
SELECT 
    (SELECT COUNT(DISTINCT id) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM items WHERE type = 'file') as total_files,
    COALESCE(SUM(
        array_length(
            regexp_split_to_array(
                regexp_replace(content, '<[^>]*>', ' ', 'g'),
                '\s+'
            ), 
            1
        )
    ), 0) as total_words,
    (SELECT COUNT(DISTINCT user_id) 
     FROM projects 
     WHERE created_at >= NOW() - INTERVAL '30 days') as active_users_30d
FROM items
WHERE type = 'file' 
AND content IS NOT NULL 
AND content != '';

-- Query 5: Format numbers for display (with K/M suffixes)
-- This formats the numbers nicely for your landing page
WITH stats AS (
    SELECT 
        (SELECT COUNT(DISTINCT id) FROM auth.users) as users,
        COALESCE(SUM(
            array_length(
                regexp_split_to_array(
                    regexp_replace(content, '<[^>]*>', ' ', 'g'),
                    '\s+'
                ), 
                1
            )
        ), 0) as words
    FROM items
    WHERE type = 'file' 
    AND content IS NOT NULL 
    AND content != ''
)
SELECT 
    users,
    words,
    CASE 
        WHEN users >= 1000000 THEN ROUND(users::numeric / 1000000, 1) || 'M'
        WHEN users >= 1000 THEN ROUND(users::numeric / 1000, 1) || 'K'
        ELSE users::text
    END as users_formatted,
    CASE 
        WHEN words >= 1000000 THEN ROUND(words::numeric / 1000000, 1) || 'M'
        WHEN words >= 1000 THEN ROUND(words::numeric / 1000, 1) || 'K'
        ELSE words::text
    END as words_formatted
FROM stats;

-- ============================================
-- How to use these queries:
-- ============================================
-- 1. Connect to your Supabase database using the SQL Editor
-- 2. Run Query 3 (Combined stats) to get both numbers
-- 3. Use the results to update your landing page text
-- 4. Optionally, create an API endpoint to fetch these dynamically
-- ============================================
