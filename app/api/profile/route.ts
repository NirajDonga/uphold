import { requireAuth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";
import { uploadImage, deleteImage } from "@/app/lib/cloudinary";
import { sendPasswordResetEmail } from '@/app/lib/nodemailer';
import crypto from 'crypto';
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { logger } from "@/app/lib/logger";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    
    await connectToDatabase();
    const userProfile = await User.findById(user.id);
    
    if (!userProfile) {
      console.error(`Profile GET: User ${user.id} not found in database`);
      const response: ApiResponse = { success: false, error: "User not found in database" };
      return NextResponse.json(response, { status: 404 });
    }
    
    logger.info(`Profile GET: Successfully fetched profile for user ${userProfile.email} (${userProfile.username})`);
    logger.profile(userProfile);
    
    // Convert Mongoose document to plain object
    const userObj = userProfile.toObject ? userProfile.toObject() : JSON.parse(JSON.stringify(userProfile));
    
    // Generate a unique timestamp to prevent caching issues with image URLs
    const timestamp = Date.now();
    
    // Create a safe copy without modifying image URLs directly
    const profileWithTimestamp = { ...userObj };
    
    // Safely add timestamp to profile image URL if it exists
    if (profileWithTimestamp.profilepic && 
        typeof profileWithTimestamp.profilepic === 'object' && 
        profileWithTimestamp.profilepic.url) {
      profileWithTimestamp.profilepic = {
        ...profileWithTimestamp.profilepic,
        url: `${profileWithTimestamp.profilepic.url}?t=${timestamp}`
      };
    }
    
    // Safely add timestamp to cover image URL if it exists
    if (profileWithTimestamp.coverpic && 
        typeof profileWithTimestamp.coverpic === 'object' && 
        profileWithTimestamp.coverpic.url) {
      profileWithTimestamp.coverpic = {
        ...profileWithTimestamp.coverpic,
        url: `${profileWithTimestamp.coverpic.url}?t=${timestamp}`
      };
    }
    
    // Log final structure for debugging
    console.log("Returning profile data with structure:", {
      profilepic: profileWithTimestamp.profilepic ? 'present' : 'absent',
      coverpic: profileWithTimestamp.coverpic ? 'present' : 'absent',
    });
    
    const response: ApiResponse = { 
      success: true, 
      data: { user: profileWithTimestamp },
      user: profileWithTimestamp // Add direct user property for backwards compatibility
    };
    
    // Add cache control headers to prevent caching
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    const response: ApiResponse = { success: false, error: "Internal server error" };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || "";
    await connectToDatabase();

    // Read the body once and reuse it
    let body: any = null;
    if (contentType.includes("application/json")) {
      body = await request.json();
    }
    // Handle token-based password reset (from email link)
    if (body && body.token && body.newPassword) {
      const bcrypt = await import('bcryptjs');
      
      const userWithToken = await User.findOne({
        resetPasswordToken: body.token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!userWithToken) {
        const response: ApiResponse = { 
          success: false, 
          error: "Invalid or expired reset token" 
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Validate new password
      if (body.newPassword.length < 6) {
        const response: ApiResponse = { 
          success: false, 
          error: "Password must be at least 6 characters long" 
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Hash and update password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(body.newPassword, saltRounds);
      
      await User.findByIdAndUpdate(userWithToken._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      });
      
      console.log(`Password reset via token for user ${userWithToken.email}`);
      const response: ApiResponse = { 
        success: true, 
        message: "Password has been reset successfully" 
      };
      return NextResponse.json(response);
    }
    // Handle unauthenticated password reset requests
    if (body && body.action === "requestPasswordReset" && body.email) {
      // Find user by email for unauthenticated password reset
      const targetUser = await User.findOne({ email: body.email.toLowerCase() });
      if (!targetUser) {
        const response: ApiResponse = { 
          success: false, 
          error: "No account found with this email address" 
        };
        return NextResponse.json(response, { status: 404 });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with reset token
      await User.findByIdAndUpdate(targetUser._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(targetUser.email, resetToken);
        console.log(`Password reset email sent to ${targetUser.email}`);
        const response: ApiResponse = { 
          success: true, 
          message: "Password reset email sent successfully" 
        };
        return NextResponse.json(response);
      } catch (error: any) {
        console.error('Password reset email error:', error);
        const response: ApiResponse = { 
          success: false, 
          error: "Failed to send password reset email" 
        };
        return NextResponse.json(response, { status: 500 });
      }
    }

    // For all other requests, require authentication
    const user = await requireAuth();

    // Check Cloudinary configuration
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudinaryConfigured) {
      console.warn('Cloudinary not configured - image uploads disabled');
    }

    // Verify user still exists before proceeding
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      console.error(`Profile POST: User ${user.id} not found in database`);
      const response: ApiResponse = { success: false, error: "User not found in database" };
      return NextResponse.json(response, { status: 404 });
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const name = form.get("name")?.toString() || undefined;
      const username = form.get("username")?.toString() || undefined;
      const email = form.get("email")?.toString() || undefined;
      const bio = form.get("bio")?.toString() || undefined;
      const profileFile = form.get("profilePicture") as File | null;
      const coverFile = form.get("coverPicture") as File | null;

      // Validate username format if provided
      if (username) {
        const usernameRegex = /^[a-zA-Z0-9_.]{2,30}$/;
        if (!usernameRegex.test(username)) {
          const response: ApiResponse = { 
            success: false, 
            error: "Username must be 2-30 characters and can only contain letters, numbers, underscores (_), and dots (.)" 
          };
          return NextResponse.json(response, { status: 400 });
        }
      }

      // Check username uniqueness
      if (username) {
        // Allow username changes regardless of provider
        // Remove the restriction that username can only be changed once

        // Check if username already exists (excluding current user)
        const existingUser = await User.findOne({ 
          username: username.toLowerCase(),
          _id: { $ne: user.id }
        });
        
        if (existingUser) {
          const response: ApiResponse = { success: false, error: "Username already taken" };
          return NextResponse.json(response, { status: 400 });
        }
      }

      const updateData: Record<string, any> = {};

      // Update basic fields
      if (name !== undefined) updateData.name = name;
      if (username) updateData.username = username.toLowerCase();
      if (email && email !== currentUser.email) {
        // Check if email already exists
        const existingEmailUser = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: user.id }
        });
        
        if (existingEmailUser) {
          const response: ApiResponse = { success: false, error: "Email already registered" };
          return NextResponse.json(response, { status: 400 });
        }
        updateData.email = email.toLowerCase();
      }
      if (bio !== undefined) updateData.bio = bio;

      // Handle image uploads if Cloudinary is configured
      if (cloudinaryConfigured) {
        // Handle profile picture upload
        if (profileFile && profileFile.size > 0) {
          try {
            // Delete old profile picture if exists
            if (currentUser.profilepic?.public_id) {
              await deleteImage(currentUser.profilepic.public_id);
            }
            
            const result = await uploadImage(profileFile, 'profile');
            updateData.profilepic = {
              url: result.url,
              public_id: result.public_id
            };
            console.log(`Profile picture uploaded for user ${currentUser.email}: ${result.url}`);
          } catch (error: any) {
            console.error('Profile picture upload error:', error);
            const response: ApiResponse = { 
              success: false, 
              error: `Failed to upload profile picture: ${error.message}` 
            };
            return NextResponse.json(response, { status: 500 });
          }
        }

        // Handle cover picture upload
        if (coverFile && coverFile.size > 0) {
          try {
            // Delete old cover picture if exists
            if (currentUser.coverpic?.public_id) {
              await deleteImage(currentUser.coverpic.public_id);
            }
            
            const result = await uploadImage(coverFile, 'cover');
            updateData.coverpic = {
              url: result.url,
              public_id: result.public_id
            };
            console.log(`Cover picture uploaded for user ${currentUser.email}: ${result.url}`);
          } catch (error: any) {
            console.error('Cover picture upload error:', error);
            const response: ApiResponse = { 
              success: false, 
              error: `Failed to upload cover picture: ${error.message}` 
            };
            return NextResponse.json(response, { status: 500 });
          }
        }
      } else {
        // If Cloudinary not configured and user tries to upload images
        if ((profileFile && profileFile.size > 0) || (coverFile && coverFile.size > 0)) {
          const response: ApiResponse = { 
            success: false, 
            error: "Image uploads are currently disabled" 
          };
          return NextResponse.json(response, { status: 400 });
        }
      }

      // Mark profile as complete for OAuth users
      if (currentUser.provider !== 'credentials' && !currentUser.isProfileComplete) {
        updateData.isProfileComplete = true;
      }

      // Update user in database
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { $set: updateData },
        { new: true }
      );

      if (updatedUser) {
        console.log(`Profile updated for user ${updatedUser.email} (${updatedUser.username})`);
        
        // Convert to plain object
        const userObj = updatedUser.toObject ? updatedUser.toObject() : JSON.parse(JSON.stringify(updatedUser));
        
        // Add timestamps to image URLs to prevent caching
        const timestamp = Date.now();
        if (userObj.profilepic?.url) {
          userObj.profilepic.url = `${userObj.profilepic.url}?t=${timestamp}`;
        }
        if (userObj.coverpic?.url) {
          userObj.coverpic.url = `${userObj.coverpic.url}?t=${timestamp}`;
        }
        
        const response: ApiResponse = { 
          success: true, 
          data: { user: userObj },
          user: userObj // For backward compatibility
        };
        return NextResponse.json(response);
      } else {
        const response: ApiResponse = { success: false, error: "Failed to update user profile" };
        return NextResponse.json(response, { status: 500 });
      }
    }

    // Handle password reset and password change requests
    if (body) {
      const { changePassword, currentPassword, newPassword, confirmPassword } = body;
      
      // Handle password change/set
      if (changePassword && newPassword) {
        const bcrypt = await import('bcryptjs');
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
        
        // Get current session to check how user logged in
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
          const response: ApiResponse = { 
            success: false, 
            error: "You must be signed in to change your password. Please refresh the page and try again." 
          };
          return NextResponse.json(response, { status: 401 });
        }
        
        // Check current session provider (how they logged in THIS time)
        const currentSessionProvider = (session.user as any).provider || 'credentials';
        const hasExistingPassword = !!currentUser.password;
        
        // If user logged in via OAuth (regardless of whether they have a password)
        // require re-authentication instead of current password
        if (currentSessionProvider !== 'credentials') {
          // OAuth session - require recent re-authentication for security (30 minutes)
          const lastReAuthTime = (session.user as any).lastReAuthTime || (session.user as any).lastAuthTime || 0;
          const currentTime = Date.now();
          const timeSinceReAuth = currentTime - lastReAuthTime;
          const THIRTY_MINUTES = 30 * 60 * 1000;
          
          if (timeSinceReAuth > THIRTY_MINUTES) {
            const response: ApiResponse = { 
              success: false, 
              error: "Re-authentication required",
              data: {
                requiresReAuth: true,
                reason: hasExistingPassword 
                  ? "Changing your password requires recent authentication for security"
                  : "Setting a password requires recent authentication for security"
              }
            };
            return NextResponse.json(response, { status: 403 });
          }
          
          console.log(`OAuth user ${currentUser.email} ${hasExistingPassword ? 'changing' : 'setting'} password with valid re-auth (${Math.floor(timeSinceReAuth / 1000)}s ago)`);
        } else {
          // Credentials session - require current password if user has one
          if (hasExistingPassword) {
            if (!currentPassword) {
              const response: ApiResponse = { 
                success: false, 
                error: "Current password is required to change your password" 
              };
              return NextResponse.json(response, { status: 400 });
            }
            
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
            if (!isCurrentPasswordValid) {
              const response: ApiResponse = { 
                success: false, 
                error: "Current password is incorrect" 
              };
              return NextResponse.json(response, { status: 400 });
            }
          }
          // If no password exists and logged in with credentials, this shouldn't happen
          // but we'll allow it (edge case)
        }
        
        // Validate password confirmation (always required for setting/changing)
        if (confirmPassword && newPassword !== confirmPassword) {
          const response: ApiResponse = { 
            success: false, 
            error: "Passwords do not match" 
          };
          return NextResponse.json(response, { status: 400 });
        }
        
        // Validate new password
        if (newPassword.length < 6) {
          const response: ApiResponse = { 
            success: false, 
            error: "New password must be at least 6 characters long" 
          };
          return NextResponse.json(response, { status: 400 });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await User.findByIdAndUpdate(user.id, {
          password: hashedNewPassword
        });
        
        console.log(`Password ${hasExistingPassword ? 'changed' : 'set'} for user ${currentUser.email}`);
        const response: ApiResponse = { 
          success: true, 
          message: `Password ${hasExistingPassword ? 'changed' : 'set'} successfully` 
        };
        return NextResponse.json(response);
      }
    }

    const response: ApiResponse = { success: false, error: "Invalid request format" };
    return NextResponse.json(response, { status: 400 });

  } catch (error: any) {
    console.error('Profile POST error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: `Internal server error: ${error.message}` 
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Handle token-based password reset (from email link) - no auth required
    if (body.token && body.newPassword) {
      const userWithToken = await User.findOne({
        resetPasswordToken: body.token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!userWithToken) {
        const response: ApiResponse = { 
          success: false, 
          error: "Invalid or expired reset token" 
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Validate new password
      if (body.newPassword.length < 6) {
        const response: ApiResponse = { 
          success: false, 
          error: "Password must be at least 6 characters long" 
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Hash and update password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(body.newPassword, saltRounds);
      
      await User.findByIdAndUpdate(userWithToken._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      });
      
      console.log(`Password reset via token for user ${userWithToken.email}`);
      const response: ApiResponse = { 
        success: true, 
        message: "Password has been reset successfully" 
      };
      return NextResponse.json(response);
    }

    // For all other PATCH requests, require authentication
    const user = await requireAuth();
    const currentUser = await User.findById(user.id);
    
    if (!currentUser) {
      const response: ApiResponse = { success: false, error: "User not found" };
      return NextResponse.json(response, { status: 404 });
    }

    // Handle password change for authenticated users
    if (body.changePassword && body.newPassword) {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
      
      const session = await getServerSession(authOptions);
      
      if (!session || !session.user) {
        const response: ApiResponse = { 
          success: false, 
          error: "You must be signed in to change your password. Please refresh the page and try again." 
        };
        return NextResponse.json(response, { status: 401 });
      }
      
      // Check current session provider
      const currentSessionProvider = (session.user as any).provider || 'credentials';
      const hasExistingPassword = !!currentUser.password;
      
      // If user logged in via OAuth, require re-authentication within 30 minutes
      if (currentSessionProvider !== 'credentials') {
        const lastReAuthTime = (session.user as any).lastReAuthTime || (session.user as any).lastAuthTime || 0;
        const currentTime = Date.now();
        const timeSinceReAuth = currentTime - lastReAuthTime;
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        if (timeSinceReAuth > THIRTY_MINUTES) {
          const response: ApiResponse = { 
            success: false, 
            error: "Re-authentication required",
            data: {
              requiresReAuth: true,
              reason: hasExistingPassword 
                ? "Changing your password requires recent authentication for security"
                : "Setting a password requires recent authentication for security"
            }
          };
          return NextResponse.json(response, { status: 403 });
        }
        console.log(`OAuth user ${currentUser.email} setting password - re-auth ${Math.floor(timeSinceReAuth / 1000)}s ago`);
      } else {
        // Credentials session - require current password if user has one
        if (hasExistingPassword && body.currentPassword) {
          const isCurrentPasswordValid = await bcrypt.compare(body.currentPassword, currentUser.password);
          if (!isCurrentPasswordValid) {
            const response: ApiResponse = { 
              success: false, 
              error: "Current password is incorrect" 
            };
            return NextResponse.json(response, { status: 400 });
          }
        }
      }
      
      // Validate password
      if (body.newPassword.length < 6) {
        const response: ApiResponse = { 
          success: false, 
          error: "Password must be at least 6 characters long" 
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Hash and update password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(body.newPassword, saltRounds);
      
      await User.findByIdAndUpdate(user.id, {
        password: hashedPassword
      });
      
      console.log(`Password ${hasExistingPassword ? 'changed' : 'set'} for user ${currentUser.email}`);
      const response: ApiResponse = { 
        success: true, 
        message: `Password ${hasExistingPassword ? 'changed' : 'set'} successfully` 
      };
      return NextResponse.json(response);
    }

    const response: ApiResponse = { success: false, error: "Invalid request" };
    return NextResponse.json(response, { status: 400 });

  } catch (error: any) {
    console.error('Profile PATCH error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: `Internal server error: ${error.message}` 
    };
    return NextResponse.json(response, { status: 500 });
  }
}
