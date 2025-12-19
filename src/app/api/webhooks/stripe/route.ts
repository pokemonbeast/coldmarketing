import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { constructWebhookEvent, getActionsLimitForPrice, getPlanByPriceId } from '@/lib/services/stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars are not available
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return supabaseAdminClient;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  console.log(`Checkout completed for user ${userId}, subscription: ${subscriptionId}`);

  // First update with basic info
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('id', userId);

  // If we have a subscription ID, fetch full details to update plan info
  if (subscriptionId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await updateUserSubscription(userId, subscription);
      console.log(`Updated subscription details for user ${userId}`);
    } catch (err) {
      console.error('Error fetching subscription details:', err);
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    // Try to find user by customer ID
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();
    
    if (!profile) {
      console.error('Could not find user for subscription:', subscription.id);
      return;
    }
    
    await updateUserSubscription(profile.id, subscription);
  } else {
    await updateUserSubscription(userId, subscription);
  }
}

async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId);
  const actionsLimit = getActionsLimitForPrice(priceId);

  const status = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status;

  const subData = subscription as any;
  
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_plan_name: plan?.name || null,
      subscription_actions_limit: actionsLimit,
      subscription_current_period_end: subData.current_period_end 
        ? new Date(subData.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('id', userId);

  // Create or update action usage for current period
  const periodStart = subData.current_period_start ? new Date(subData.current_period_start * 1000) : new Date();
  const periodEnd = subData.current_period_end ? new Date(subData.current_period_end * 1000) : new Date();

  await getSupabaseAdmin()
    .from('action_usage')
    .upsert(
      {
        user_id: userId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        actions_limit: actionsLimit,
        actions_used: 0,
      },
      {
        onConflict: 'user_id,period_start',
        ignoreDuplicates: true,
      }
    );

  console.log(`Subscription updated for user ${userId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!profile) {
    console.error('Could not find user for deleted subscription:', subscription.id);
    return;
  }

  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_plan_name: null,
      subscription_actions_limit: 0,
    })
    .eq('id', profile.id);

  console.log(`Subscription cancelled for user ${profile.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;
  
  if (!subscriptionId) return;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!profile) return;

  // Reset action usage for new billing period
  const periodStart = new Date((invoiceData.period_start || 0) * 1000);
  const periodEnd = new Date((invoiceData.period_end || 0) * 1000);
  
  const priceId = invoiceData.lines?.data?.[0]?.price?.id;
  const actionsLimit = priceId ? getActionsLimitForPrice(priceId) : 0;

  await getSupabaseAdmin()
    .from('action_usage')
    .upsert({
      user_id: profile.id,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      actions_limit: actionsLimit,
      actions_used: 0,
    }, {
      onConflict: 'user_id,period_start',
    });

  console.log(`Invoice paid, reset usage for user ${profile.id}`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;
  
  if (!subscriptionId) return;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!profile) return;

  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  console.log(`Invoice failed for user ${profile.id}`);
}

