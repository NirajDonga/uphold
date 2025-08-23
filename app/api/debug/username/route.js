import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    await connectToDatabase();
    
    // Get current user
    const currentUser = await User.findById(session.user.id).lean();
    if (!currentUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all users for comparison
    const allUsers = await User.find({}).select('username email _id').lean();
    
    // Test username search with the current logic (exact match since DB is lowercase)
    const testUsername = currentUser.username;
    const foundUser = await User.findOne({ username: testUsername }).lean();

    const debugInfo = {
      currentUser: {
        id: currentUser._id,
        username: currentUser.username,
        email: currentUser.email
      },
      sessionInfo: {
        sessionUserId: session.user.id,
        sessionUsername: session.user.username,
        sessionName: session.user.name
      },
      usernameSearch: {
        testUsername,
        searchMethod: "exact match (lowercase)",
        foundUser: foundUser ? {
          id: foundUser._id,
          username: foundUser.username,
          email: foundUser.email
        } : null
      },
      allUsers: allUsers.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email
      })),
      note: "Usernames are stored in lowercase in the database for uniqueness"
    };

    return new Response(JSON.stringify(debugInfo), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error('Debug username error:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
