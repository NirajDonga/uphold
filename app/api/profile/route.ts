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
      const { changePassword, currentPassword, newPassword } = body;
      
      // Handle password change
      if (changePassword && currentPassword && newPassword) {
        const bcrypt = await import('bcryptjs');
        
        // Verify current password
        if (currentUser.password) {
          const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
          if (!isCurrentPasswordValid) {
            const response: ApiResponse = { success: false, error: "Current password is incorrect" };
            return NextResponse.json(response, { status: 400 });
          }
        } else {
          // If user doesn't have a password (OAuth user), any "current password" is invalid
          const response: ApiResponse = { success: false, error: "Current password is incorrect" };
          return NextResponse.json(response, { status: 400 });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await User.findByIdAndUpdate(user.id, {
          password: hashedNewPassword
        });
        
        console.log(`Password changed for user ${currentUser.email}`);
        const response: ApiResponse = { 
          success: true, 
          message: "Password changed successfully" 
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
