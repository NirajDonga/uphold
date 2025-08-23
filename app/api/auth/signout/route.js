import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function POST() {
  try {
    console.log('=== SIGN-OUT API ENDPOINT CALLED ===');
    
    // Get the current session
    const session = await getServerSession(authOptions);
    console.log('Current session:', session ? 'exists' : 'none');
    
    if (session) {
      console.log('User signing out:', session.user?.email);
      console.log('User ID:', session.user?.id);
      console.log('Username:', session.user?.username);
    }
    
    // Log the request details
    console.log('Sign-out request received');
    console.log('Request method: POST');
    console.log('Request timestamp:', new Date().toISOString());
    
    // Return success response
    const response = NextResponse.json({ 
      success: true, 
      message: 'Sign-out request processed',
      timestamp: new Date().toISOString()
    });
    
    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('=== SIGN-OUT API ENDPOINT COMPLETED ===');
    
    return response;
    
  } catch (error) {
    console.error('=== SIGN-OUT API ENDPOINT ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during sign-out',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
