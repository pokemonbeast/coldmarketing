import Stripe from 'stripe';
import { STRIPE_PLANS, type StripePlan } from '@/types/database';

export { STRIPE_PLANS };

// Lazy initialization to avoid build-time errors when API key is not available
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

// For backward compatibility, export stripe as a getter
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

/**
 * Get a plan by its price ID
 */
export function getPlanByPriceId(priceId: string): StripePlan | undefined {
  return STRIPE_PLANS.find((plan) => plan.priceId === priceId);
}

/**
 * Get a plan by its ID (starter, growth, scale, enterprise)
 */
export function getPlanById(planId: string): StripePlan | undefined {
  return STRIPE_PLANS.find((plan) => plan.id === planId);
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  existingCustomerId?: string | null
): Promise<Stripe.Customer> {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  return customer;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
      },
    },
  });

  return session;
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

/**
 * Get actions limit for a price ID
 */
export function getActionsLimitForPrice(priceId: string): number {
  const plan = getPlanByPriceId(priceId);
  return plan?.actionsPerMonth ?? 0;
}

/**
 * Get business limit for a plan name
 * Matches by full name (e.g., "Growth Plan") or short name (e.g., "Growth", "Pro")
 */
export function getBusinessLimitForPlan(planName: string | null): number {
  if (!planName) return 0;
  const normalizedName = planName.toLowerCase().trim();
  
  const plan = STRIPE_PLANS.find((p) => 
    p.name.toLowerCase() === normalizedName ||
    p.name.toLowerCase().startsWith(normalizedName) ||
    p.id.toLowerCase() === normalizedName
  );
  
  return plan?.businessLimit ?? 0;
}

