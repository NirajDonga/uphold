import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";
import Transaction from "@/app/models/Transaction";
import User from "@/app/models/User";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await request.json();
  
  const { toUserId, toUsername, amount } = body; // amount in rupees
  if ((!toUserId && !toUsername) || !amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  await connectToDatabase();

  let targetUserId = toUserId;
  if (toUsername && !toUserId) {
    // Convert username to lowercase for exact match since DB stores in lowercase
    const user = await User.findOne({ username: toUsername.toLowerCase() });
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }
    targetUserId = user._id.toString();
  }

  // Prevent users from paying themselves
  if (session.user.id === targetUserId) {
    return new Response(JSON.stringify({ error: "You cannot pay yourself" }), { status: 400 });
  }

  const amountPaise = Math.round(Number(amount) * 100);

  let donor = await Account.findOne({ userId: session.user.id });
  if (!donor) donor = await Account.create({ userId: session.user.id, balancePaise: 0 });
  let creator = await Account.findOne({ userId: targetUserId });
  if (!creator) creator = await Account.create({ userId: targetUserId, balancePaise: 0 });

  if (donor.balancePaise < amountPaise) {
    return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400 });
  }

  donor.balancePaise -= amountPaise;
  creator.balancePaise += amountPaise;
  await donor.save();
  await creator.save();

  const tx = await Transaction.create({
    type: "transfer",
    amountPaise,
    currency: "INR",
    fromUserId: session.user.id,
    toUserId: targetUserId,
    status: "success",
    meta: { label: "donation" }
  });

  return new Response(
    JSON.stringify({ ok: true, balancePaise: donor.balancePaise, txId: tx._id }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


