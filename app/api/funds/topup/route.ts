import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import { createStripeInstance } from "@/app/lib/stripe";

interface TopupRequest {
  amount: number;
}

interface TopupResponse {
  url?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<TopupResponse>({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    const body: TopupRequest = await request.json();
    const { amount } = body;

    if (!amount || amount < 50) {
      return NextResponse.json<TopupResponse>({ 
        error: "Minimum top-up is ₹50" 
      }, { status: 400 });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    await connectToDatabase();

    const stripe = createStripeInstance();

    // Check env variables
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      return NextResponse.json<TopupResponse>({ 
        error: "NEXT_PUBLIC_BASE_URL is not set" 
      }, { status: 500 });
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

    return NextResponse.json<TopupResponse>({
      url: checkoutSession.url || undefined
    });

  } catch (err) {
    console.error("Stripe Topup Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<TopupResponse>({ 
      error: errorMessage 
    }, { status: 500 });
  }
}
