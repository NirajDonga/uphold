import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Stripe from 'stripe';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const body = await request.json();
    const { amount } = body;
    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: "Minimum top-up is ₹50" }), { status: 400 });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    await connectToDatabase();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

    // Check env variables
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      return new Response(JSON.stringify({ error: "NEXT_PUBLIC_BASE_URL is not set" }), { status: 500 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Wallet Top-up',
            },
            unit_amount: amountPaise,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: { userId: session.user.id },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/funds?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/funds?canceled=1`,
    });

    return new Response(
      JSON.stringify({ url: checkoutSession.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe Topup Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500 });
  }
}