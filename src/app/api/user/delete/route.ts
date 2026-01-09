import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
      request.cookies.get('sb-access-token')?.value;

    if (!token) {
      // Try to get session from cookie
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
        request.cookies.get('sb-access-token')?.value
      );

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      await deleteUserData(user.id);
      return NextResponse.json({ success: true });
    }

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await deleteUserData(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

async function deleteUserData(userId: string) {
  // First, cancel any active Stripe subscription
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (userData?.stripe_subscription_id) {
    try {
      // Cancel the subscription immediately
      await stripe.subscriptions.cancel(userData.stripe_subscription_id);
      console.log(`Cancelled subscription ${userData.stripe_subscription_id} for user ${userId}`);
    } catch (error) {
      console.error('Failed to cancel Stripe subscription:', error);
      // Continue with deletion even if subscription cancel fails
      // The subscription will eventually fail due to missing customer
    }
  }

  // Delete user's data in order (respecting foreign keys)
  
  // 1. Get all project IDs for this user
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('user_id', userId);

  const projectIds = projects?.map(p => p.id) || [];

  if (projectIds.length > 0) {
    // 2. Delete items in those projects
    await supabaseAdmin
      .from('items')
      .delete()
      .in('project_id', projectIds);

    // 3. Delete project goals
    await supabaseAdmin
      .from('project_goals')
      .delete()
      .in('project_id', projectIds);

    // 4. Delete version history
    await supabaseAdmin
      .from('version_history')
      .delete()
      .in('project_id', projectIds);

    // 5. Delete projects
    await supabaseAdmin
      .from('projects')
      .delete()
      .eq('user_id', userId);
  }

  // 6. Delete user preferences
  await supabaseAdmin
    .from('user_preferences')
    .delete()
    .eq('user_id', userId);

  // 7. Delete feedback
  await supabaseAdmin
    .from('feedback')
    .delete()
    .eq('user_id', userId);

  // 8. Delete from users table
  await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  // 9. Delete auth user (this is the final step)
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    console.error('Failed to delete auth user:', deleteAuthError);
    throw deleteAuthError;
  }
}
