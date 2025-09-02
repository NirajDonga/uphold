import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/db/connectdb";
import User, { type IUser } from "@/app/models/User";
import bcrypt from "bcryptjs";

interface CompleteProfileRequest {
  userId: string;
  username: string;
  password: string;
}

interface ApiResponse {
  success?: boolean;
  user?: Partial<IUser>;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Make sure user is authenticated
    await requireAuth();

    const body: CompleteProfileRequest = await request.json();
    const { userId, username, password } = body;
    
    console.log('Complete profile request for user ID:', userId);

    // Validate required fields
    if (!userId || !username || !password) {
      return NextResponse.json({ 
        error: "User ID, username, and password are required" 
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long" 
      }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: "Username can only contain letters, numbers, underscores (_), and dots (.)" 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Verify the user exists and is an OAuth user
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }

    if (userProfile.provider === 'credentials') {
      return NextResponse.json({ 
        error: "This endpoint is only for OAuth users" 
      }, { status: 400 });
    }

    if (userProfile.isProfileComplete && password !== "KEEP_EXISTING_PASSWORD") {
      return NextResponse.json({ 
        error: "Profile is already complete" 
      }, { status: 400 });
    }
    
    // Check if this is a user switching from another OAuth provider
    // and if they already have a password set
    if (userProfile.password && password !== "KEEP_EXISTING_PASSWORD") {
      console.log(`User ${userProfile.email} already has a password set (possible provider switch)`);
    }

    // Check if username already exists
    try {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername && (existingUsername._id as any).toString() !== userId) {
        return NextResponse.json({ 
          error: "Username already taken" 
        }, { status: 409 });
      }
    } catch (error) {
      // Log the error but continue with profile completion
      // This prevents blocking the user if there's a temporary database issue
      console.error('Error checking username uniqueness:', error);
      console.log('Continuing with profile completion despite username check error');
    }

    // Prepare update data
    const updateData: any = {
      isProfileComplete: true
    };
    
    // Only set username if it's provided and different from current
    if (username && username !== userProfile.username) {
      updateData.username = username.toLowerCase();
    }
    
    // Special case: if password is "KEEP_EXISTING_PASSWORD", don't update the password
    if (password !== "KEEP_EXISTING_PASSWORD") {
      // Hash password
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
      console.log('Setting new password for user:', userId);
    } else {
      console.log('Keeping existing password for user:', userId);
      // Check if the user actually has a password
      if (!userProfile.password) {
        return NextResponse.json({ 
          error: "Cannot keep existing password as none is set" 
        }, { status: 400 });
      }
    }

    // Update user with username, password, and mark profile as complete
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ 
        error: "Failed to update user" 
      }, { status: 500 });
    }

    // Return updated user data without password
    const { password: _, ...userData } = updatedUser.toObject();

    const response: ApiResponse = { 
      success: true,
      user: userData,
      message: "Profile completed successfully" 
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Profile completion error:', error);
    return NextResponse.json({ 
      error: "Internal server error during profile completion" 
    }, { status: 500 });
  }
}
