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
    const rawBody = await req.text();

    if (!sig) {
      console.error('Missing stripe signature');
      return NextResponse.json<WebhookResponse>({ 
        error: 'Missing stripe signature' 
      }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      // Get the webhook secret
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
        // In development, we might want to proceed even without verification
        if (process.env.NODE_ENV === 'development' || process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
          console.warn('Proceeding without webhook verification - ONLY FOR DEVELOPMENT');
          // Extract the event data directly from the request
          event = JSON.parse(rawBody) as Stripe.Event;
        } else {
          return NextResponse.json<WebhookResponse>({ 
            error: 'Webhook secret not configured' 
          }, { status: 500 });
        }
      } else {
        // Normal verification with the webhook secret
        event = stripe.webhooks.constructEvent(
          rawBody, 
          sig, 
          webhookSecret
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json<WebhookResponse>({ 
        error: 'Webhook Error' 
      }, { status: 400 });
    }

    console.log('Stripe webhook received:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amountPaise = session.amount_total;
      
      console.log('Processing topup for user:', userId, 'amount:', amountPaise);
      
      if (userId && amountPaise) {
        try {
          await connectToDatabase();
          let account = await Account.findOne({ userId });
          if (!account) {
            account = await Account.create({ userId, balancePaise: 0 });
          }
          account.balancePaise += amountPaise;
          await account.save();
          
          await Transaction.create({
            type: 'topup',
            amountPaise,
            currency: 'INR',
            toUserId: userId,
            status: 'success',
            meta: { stripeSessionId: session.id }
          });
          
          console.log('Topup processed and transaction stored for user:', userId);
        } catch (err) {
          console.error('Error processing topup webhook:', err);
        }
      } else {
        console.error('Missing userId or amount in webhook session:', session);
      }
    }

    return NextResponse.json<WebhookResponse>({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json<WebhookResponse>({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
