import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    
    if (!user || !user.id) {
      return NextResponse.json({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }
    
    await connectToDatabase();
    
    const dbUser = await User.findById(user.id);
    
    if (!dbUser) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      id: dbUser._id?.toString(),
      email: dbUser.email,
      provider: dbUser.provider,
      hasPassword: Boolean(dbUser.password),
      isProfileComplete: dbUser.isProfileComplete,
      username: dbUser.username
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error during profile check" 
    }, { status: 500 });
  }
}
