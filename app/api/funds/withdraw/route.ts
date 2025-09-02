import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";
import Transaction from "@/app/models/Transaction";

interface WithdrawRequest {
  amount: number; // amount in rupees
}

interface WithdrawResponse {
  ok?: boolean;
  balancePaise?: number;
  txId?: string;
  status?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<WithdrawResponse>({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    const body: WithdrawRequest = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json<WithdrawResponse>({ 
        error: "Invalid amount" 
      }, { status: 400 });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    await connectToDatabase();

    let account = await Account.findOne({ userId: session.user.id });
    if (!account) account = await Account.create({ userId: session.user.id, balancePaise: 0 });

    if (account.balancePaise < amountPaise) {
      return NextResponse.json<WithdrawResponse>({ 
        error: "Insufficient balance" 
      }, { status: 400 });
    }

    account.balancePaise -= amountPaise;
    await account.save();

    const tx = await Transaction.create({
      type: "withdraw",
      amountPaise,
      currency: "INR",
      fromUserId: session.user.id,
      status: "processed",
      meta: { note: "Simulated payout processed" }
    });

    return NextResponse.json<WithdrawResponse>({
      ok: true,
      balancePaise: account.balancePaise,
      txId: (tx._id as any).toString(),
      status: "processed"
    });

  } catch (error) {
    console.error('Withdraw error:', error);
    return NextResponse.json<WithdrawResponse>({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
