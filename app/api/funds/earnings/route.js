import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Transaction from "@/app/models/Transaction";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  await connectToDatabase();
  const userId = session.user.id;

  const [receivedAgg] = await Transaction.aggregate([
    { $match: { type: "transfer", toUserId: userId, status: { $in: ["success", "processed"] } } },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } }
  ]);

  const [withdrawnAgg] = await Transaction.aggregate([
    { $match: { type: "withdraw", fromUserId: userId, status: { $in: ["success", "processed"] } } },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } }
  ]);

  const totalReceivedPaise = receivedAgg?.total || 0;
  const totalWithdrawnPaise = withdrawnAgg?.total || 0;

  const recent = await Transaction.find({ type: "transfer", toUserId: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("amountPaise fromUserId toUserId createdAt meta");

  return new Response(
    JSON.stringify({
      totals: {
        totalReceivedPaise,
        totalReceived: totalReceivedPaise / 100,
        totalWithdrawnPaise,
        totalWithdrawn: totalWithdrawnPaise / 100,
        netEarnedPaise: totalReceivedPaise - totalWithdrawnPaise,
        netEarned: (totalReceivedPaise - totalWithdrawnPaise) / 100,
      },
      recent
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


