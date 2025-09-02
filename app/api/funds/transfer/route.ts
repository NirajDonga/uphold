import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";
import Transaction from "@/app/models/Transaction";

interface TransferRequest {
  toUserId: string;
  amount: number; // amount in rupees
}

interface TransferResponse {
  ok?: boolean;
  balancePaise?: number;
  txId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<TransferResponse>({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    const body: TransferRequest = await request.json();
    const { toUserId, amount } = body;

    if (!toUserId || !amount || amount <= 0) {
      return NextResponse.json<TransferResponse>({ 
        error: "Invalid request" 
      }, { status: 400 });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    await connectToDatabase();

    let source = await Account.findOne({ userId: session.user.id });
    if (!source) source = await Account.create({ userId: session.user.id, balancePaise: 0 });
    
    let dest = await Account.findOne({ userId: toUserId });
    if (!dest) dest = await Account.create({ userId: toUserId, balancePaise: 0 });

    if (source.balancePaise < amountPaise) {
      return NextResponse.json<TransferResponse>({ 
        error: "Insufficient balance" 
      }, { status: 400 });
    }

    source.balancePaise -= amountPaise;
    dest.balancePaise += amountPaise;
    await source.save();
    await dest.save();

    const tx = await Transaction.create({
      type: "transfer",
      amountPaise,
      currency: "INR",
      fromUserId: session.user.id,
      toUserId,
      status: "success",
    });

    return NextResponse.json<TransferResponse>({
      ok: true,
      balancePaise: source.balancePaise,
      txId: (tx._id as any).toString()
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json<TransferResponse>({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
