import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  await connectToDatabase();

  if (action === 'usernames') {
    // Get all usernames for autocomplete
    const users = await User.find({}, { username: 1, _id: 0 });
    const usernames = users.map(u => u.username).filter(Boolean);
    return new Response(JSON.stringify({ usernames }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  if (action === 'by-username') {
    // Get userId by username
    const username = searchParams.get('username');
    if (!username) {
      return new Response(JSON.stringify({ error: 'Username required' }), { status: 400 });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }
    
    return new Response(JSON.stringify({ userId: user._id.toString() }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
}
