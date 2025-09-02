import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    await connectToDatabase();
    
    // Search by username or name starting with the query (case insensitive)
    // This will be more performant than a full regex search when we just need prefix matches
    const users = await User.find({
      $or: [
        { username: { $regex: `^${query}`, $options: 'i' } },
        { name: { $regex: `^${query}`, $options: 'i' } }
      ],
      isProfileComplete: true // Only show users with complete profiles
    })
    .select('username name profilepic')
    .limit(5) // Limiting to 5 for better UI performance
    .lean();
    
    return NextResponse.json({ 
      suggestions: users.map(user => ({
        id: user._id,
        username: user.username,
        name: user.name || user.username,
        profilepic: user.profilepic?.url || null
      }))
    });
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    return NextResponse.json({ 
      error: "Error fetching user suggestions" 
    }, { status: 500 });
  }
}
