import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import Account from "@/app/models/Account";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  await connectToDatabase();

  let account = await Account.findOne({ userId: session.user.id });
  if (!account) {
    account = await Account.create({ userId: session.user.id, balancePaise: 0 });
  }
  return new Response(
    JSON.stringify({ balancePaise: account.balancePaise, balance: account.balancePaise / 100 }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


