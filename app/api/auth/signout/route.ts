import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

interface SignOutResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

export async function POST(): Promise<NextResponse> {
  try {
    console.log('=== SIGN-OUT API ENDPOINT CALLED ===');

    const session = await getServerSession(authOptions);
    if (session) {
      console.log('User signing out:', session.user?.email);
    }

    const response = NextResponse.json<SignOutResponse>({
      success: true,
      message: 'Signed out successfully',
      timestamp: new Date().toISOString()
    });

    response.cookies.set('next-auth.session-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    response.cookies.set('__Secure-next-auth.session-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json<SignOutResponse>(
      { success: false, error: 'Internal server error during sign-out' },
      { status: 500 }
    );
  }
}
