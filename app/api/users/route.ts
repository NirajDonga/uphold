import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/db/connectdb";
import User, { type IUser } from "@/app/models/User";
import bcrypt from "bcryptjs";

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  name?: string;
}

interface ApiResponse {
  success?: boolean;
  user?: Partial<IUser>;
  message?: string;
  error?: string;
  usernames?: string[];
  userId?: string;
  available?: boolean;
  username?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, username, name } = body;

    // Validate required fields
    if (!email || !password || !username) {
      return NextResponse.json({ 
        error: "Email, password, and username are required" 
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

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json({ 
        error: "Email already registered" 
      }, { status: 409 });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json({ 
        error: "Username already taken" 
      }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with username
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username.toLowerCase(),
      name: name || email.split('@')[0],
      provider: 'credentials'
    });

    await newUser.save();

    // Return user data without password
    const { password: _, ...userData } = newUser.toObject();

    const response: ApiResponse = { 
      success: true,
      user: userData,
      message: "User registered successfully" 
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: "Internal server error during registration" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const search = searchParams.get('search');

  // Only connect to DB when needed and handle connection errors
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Database connection error:', error);
    
    // Special case for username check - return true to allow registration to proceed
    if (action === 'check-username') {
      return NextResponse.json({ 
        available: true, 
        username: searchParams.get('username'),
        message: 'Database connection error - assuming available'
      });
    }
    
    return NextResponse.json({ 
      error: "Database connection error" 
    }, { status: 503 });
  }
  
  // Handle user search
  if (search) {
    try {
      // Search by username or name (case insensitive)
      const users = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ],
        isProfileComplete: true // Only show users with complete profiles
      })
      .select('username name profilepic bio')
      .limit(20)
      .lean();
      
      return NextResponse.json({ users });
    } catch (error) {
      return NextResponse.json({ 
        error: "Error searching users" 
      }, { status: 500 });
    }
  }

  if (action === 'usernames' || action === 'by-username') {
    try {
      await requireAuth();
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (action === 'usernames') {
    // Get all usernames for autocomplete
    const users = await User.find({}, { username: 1, _id: 0 });
    const usernames = users.map(u => u.username).filter(Boolean);
    const response: ApiResponse = { usernames };
    return NextResponse.json(response);
  }

  if (action === 'by-username') {
    // Get userId by username
    const username = searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const response: ApiResponse = { userId: (user._id as any).toString() };
    return NextResponse.json(response);
  }

  if (action === 'check-username') {
    // Check if username is available
    const username = searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    
    try {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      const response: ApiResponse = { 
        available: !existingUser,
        username: username 
      };
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error checking username availability:', error);
      // Default to available if there's an error (will be validated again on form submit)
      return NextResponse.json({ 
        available: true, 
        username: username,
        message: 'Could not verify uniqueness, will check on submission'
      });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
