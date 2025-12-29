# Supabase Setup Guide

## 1. Configure Authentication

The app uses email/password authentication. By default, Supabase requires email confirmation.

**To disable email confirmation (for development):**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Toggle off **Confirm email**
5. Save the changes

**Note:** For production, keep email confirmation enabled for security.

## 2. Verify Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run the SQL Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and run it in the SQL Editor
4. Verify tables were created: `projects` and `items`

## 4. Test the Application

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. The app will automatically sign you in anonymously
4. Create a project and start adding files/folders!

## Troubleshooting

### "Failed to authenticate"
- Make sure anonymous auth is enabled in Supabase
- Check that your environment variables are correct
- Verify you're using the correct project URL and anon key

### "Row Level Security policy violation"
- Make sure you ran the SQL schema completely
- Check that RLS policies were created correctly
- Verify you're authenticated (check browser console for user)

### Items not saving
- Check browser console for errors
- Verify the `items` table exists and has correct structure
- Make sure RLS policies allow INSERT/UPDATE/DELETE for authenticated users

