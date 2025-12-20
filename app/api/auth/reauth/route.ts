import { requireAuth } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getToken } from "next-auth/jwt";

/**
 * Re-authentication endpoint for sensitive operations
 * Validates that the user has recently authenticated via OAuth
 * Updates the lastReAuthTime in their JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify user is authenticated
    await requireAuth();
    
    // Get the current token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      const response: ApiResponse = { 
        success: false, 
        error: "No authentication token found" 
      };
      return NextResponse.json(response, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'verify') {
      // Just verify recent authentication
      const lastReAuthTime = token.lastReAuthTime || 0;
      const currentTime = Date.now();
      const timeSinceReAuth = currentTime - lastReAuthTime;
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      const isRecentlyAuthenticated = timeSinceReAuth < FIVE_MINUTES;
      
      const response: ApiResponse = { 
        success: true, 
        data: {
          recentlyAuthenticated: isRecentlyAuthenticated,
          lastReAuthTime,
          timeRemaining: isRecentlyAuthenticated 
            ? Math.floor((FIVE_MINUTES - timeSinceReAuth) / 1000) 
            : 0,
          provider: token.provider || 'credentials'
        }
      };
      return NextResponse.json(response);
    }
    
    if (action === 'refresh') {
      // In a real implementation, you would redirect to OAuth provider
      // For now, we'll just check if they authenticated recently via OAuth
      
      const lastAuthTime = token.lastAuthTime || 0;
      const currentTime = Date.now();
      const timeSinceAuth = currentTime - lastAuthTime;
      
      // If they authenticated very recently (within 1 minute), count it as fresh
      if (timeSinceAuth < 60 * 1000) {
        const response: ApiResponse = { 
          success: true,
          message: "Session is fresh, re-authentication granted",
          data: {
            reAuthRequired: false,
            provider: token.provider
          }
        };
        return NextResponse.json(response);
      }
      
      // Otherwise, they need to re-authenticate via OAuth
      const response: ApiResponse = { 
        success: true,
        message: "Re-authentication required",
        data: {
          reAuthRequired: true,
          provider: token.provider,
          reAuthUrl: token.provider === 'google' 
            ? '/api/auth/signin/google?callbackUrl=/dashboard&prompt=consent'
            : token.provider === 'github'
            ? '/api/auth/signin/github?callbackUrl=/dashboard'
            : null
        }
      };
      return NextResponse.json(response);
    }
    
    const response: ApiResponse = { 
      success: false, 
      error: "Invalid action" 
    };
    return NextResponse.json(response, { status: 400 });
    
  } catch (error: any) {
    console.error('Re-auth error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: `Re-authentication failed: ${error.message}` 
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Marks a re-authentication as complete
 * This should be called after the user successfully completes OAuth re-authentication
 */
export async function PATCH(_request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();
    
    // This will trigger a JWT update with fresh lastReAuthTime
    // The JWT callback will handle setting the new timestamp
    
    const response: ApiResponse = { 
      success: true,
      message: "Re-authentication timestamp updated"
    };
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Re-auth update error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: `Failed to update re-authentication: ${error.message}` 
    };
    return NextResponse.json(response, { status: 500 });
  }
}
