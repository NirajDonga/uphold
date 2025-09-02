import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";

interface BalanceResponse {
  balancePaise?: number;
  balance?: number;
  error?: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<BalanceResponse>({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    await connectToDatabase();

    let account = await Account.findOne({ userId: session.user.id });
    if (!account) {
      account = await Account.create({ userId: session.user.id, balancePaise: 0 });
    }

    return NextResponse.json<BalanceResponse>({
      balancePaise: account.balancePaise,
      balance: account.balancePaise / 100
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json<BalanceResponse>({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
