import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/app/db/connectdb';
import Account from '@/app/models/Account';
import Transaction from '@/app/models/Transaction';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  console.log('Stripe webhook received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
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

  return NextResponse.json({ received: true });
}
