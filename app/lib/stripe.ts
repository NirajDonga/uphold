import Stripe from 'stripe';

/**
 * Creates a Stripe instance with proper configuration
 * This function centralizes Stripe initialization to ensure consistent configuration
 * 
 * @returns A configured Stripe instance
 */
export function createStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16' as any,
    // Add any other configuration options here
  });
}
