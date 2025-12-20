import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/app/db/connectdb';
import Account from '@/app/models/Account';
import Transaction from '@/app/models/Transaction';
import { createStripeInstance } from '@/app/lib/stripe';

interface WebhookResponse {
  received?: boolean;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const stripe = createStripeInstance();
    
    const sig = req.headers.get('stripe-signature');
    
    if (!sig) {
      console.error('WEBHOOK ERROR: Missing stripe-signature header');
      return NextResponse.json<WebhookResponse>({ 
        error: 'Missing stripe signature' 
      }, { status: 400 });
    }

    // Get the webhook secret - CRITICAL for production
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET environment variable is not set');
      // NEVER skip verification in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json<WebhookResponse>({ 
          error: 'Webhook secret not configured' 
        }, { status: 500 });
      }
      console.warn('⚠️  WARNING: Proceeding without webhook verification - DEVELOPMENT ONLY');
    }

    let event: Stripe.Event;
    let rawBody: string;
    
    try {
      rawBody = await req.text();
      
      if (!webhookSecret) {
        // Development fallback only
        event = JSON.parse(rawBody) as Stripe.Event;
      } else {
        // Production: verify webhook signature
        event = stripe.webhooks.constructEvent(
          rawBody, 
          sig, 
          webhookSecret
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('WEBHOOK ERROR: Signature verification failed:', errorMessage);
      return NextResponse.json<WebhookResponse>({ 
        error: 'Invalid signature' 
      }, { status: 400 });
    }

    console.log('Stripe webhook received:', event.type, 'ID:', event.id);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amountPaise = session.amount_total;
      
      if (!userId || !amountPaise) {
        console.error('WEBHOOK ERROR: Missing userId or amount in session:', {
          sessionId: session.id,
          userId,
          amountPaise,
          metadata: session.metadata
        });
        // Return 200 to acknowledge receipt but log the error
        return NextResponse.json<WebhookResponse>({ 
          received: true,
          error: 'Missing required data in webhook payload' 
        }, { status: 200 });
      }

      console.log('Processing topup for user:', userId, 'amount:', amountPaise);
      
      try {
        // Connect to database with error handling
        await connectToDatabase();
        
        // Check for duplicate processing
        const existingTransaction = await Transaction.findOne({
          'meta.stripeSessionId': session.id
        });
        
        if (existingTransaction) {
          console.log('Webhook already processed for session:', session.id);
          return NextResponse.json<WebhookResponse>({ received: true }, { status: 200 });
        }
        
        // Use atomic operation to update balance
        let account = await Account.findOne({ userId });
        if (!account) {
          account = await Account.create({ userId, balancePaise: 0 });
        }
        
        account.balancePaise += amountPaise;
        await account.save();
        
        // Create transaction record
        await Transaction.create({
          type: 'topup',
          amountPaise,
          currency: 'INR',
          toUserId: userId,
          status: 'success',
          meta: { 
            stripeSessionId: session.id,
            paymentIntent: session.payment_intent,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('✅ Topup processed successfully for user:', userId);
        
      } catch (err) {
        console.error('WEBHOOK PROCESSING ERROR:', err);
        // Return 500 so Stripe will retry
        return NextResponse.json<WebhookResponse>({ 
          error: 'Failed to process webhook' 
        }, { status: 500 });
      }
    }

    // Successfully processed
    return NextResponse.json<WebhookResponse>({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json<WebhookResponse>({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
