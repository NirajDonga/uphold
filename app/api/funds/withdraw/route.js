import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";
import Transaction from "@/app/models/Transaction";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await request.json();
  const { amount } = body; // amount in rupees
  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400 });
  }

  const amountPaise = Math.round(Number(amount) * 100);
  await connectToDatabase();

  let account = await Account.findOne({ userId: session.user.id });
  if (!account) account = await Account.create({ userId: session.user.id, balancePaise: 0 });

  if (account.balancePaise < amountPaise) {
    return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400 });
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

  return new Response(
    JSON.stringify({ ok: true, balancePaise: account.balancePaise, txId: tx._id, status: "processed" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


