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
  const { toUserId, amount } = body; // amount in rupees
  if (!toUserId || !amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const amountPaise = Math.round(Number(amount) * 100);
  await connectToDatabase();

  let source = await Account.findOne({ userId: session.user.id });
  if (!source) source = await Account.create({ userId: session.user.id, balancePaise: 0 });
  let dest = await Account.findOne({ userId: toUserId });
  if (!dest) dest = await Account.create({ userId: toUserId, balancePaise: 0 });

  if (source.balancePaise < amountPaise) {
    return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400 });
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

  return new Response(
    JSON.stringify({ ok: true, balancePaise: source.balancePaise, txId: tx._id }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


