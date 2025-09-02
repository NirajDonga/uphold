'use server'
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { uploadImage, deleteImage } from "./cloudinary";
import type { ServerActionResponse } from "@/types";

export async function registerUser(formData: FormData): Promise<ServerActionResponse> {
  try {
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const password = formData.get('password')?.toString();
    const username = formData.get('username')?.toString().toLowerCase().trim();
    const name = formData.get('name')?.toString().trim();

    // Validate required fields
    if (!email || !password || !username) {
      return { success: false, error: "Email, password, and username are required" };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long" };
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      return { success: false, error: "Username can only contain letters, numbers, underscores (_), and dots (.)" };
    }

    await connectToDatabase();

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return { success: false, error: "Email already registered" };
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return { success: false, error: "Username already taken" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      name: name || email.split('@')[0],
      provider: 'credentials'
    });

    await newUser.save();

    // Return success without password
    const userData = newUser.toObject();
    delete userData.password;
    
    return { success: true, data: userData };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: "Internal server error during registration" };
  }
}

export async function updateProfile(formData: FormData): Promise<ServerActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await connectToDatabase();

    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    // Extract form data
    const name = formData.get('name')?.toString().trim();
    const username = formData.get('username')?.toString().toLowerCase().trim();
    const bio = formData.get('bio')?.toString().trim();
    const profilePicture = formData.get('profilePicture') as File | null;
    const coverPicture = formData.get('coverPicture') as File | null;

    const updateData: Record<string, any> = {};

    // Update text fields
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;

    // Validate and update username if changed
    if (username && username !== currentUser.username) {
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(username)) {
        return { success: false, error: "Username can only contain letters, numbers, underscores (_), and dots (.)" };
      }

      // Check if username already exists
      const existingUser = await User.findOne({ 
        username,
        _id: { $ne: user.id }
      });
      if (existingUser) {
        return { success: false, error: "Username already taken" };
      }
      updateData.username = username;
    }

    // Handle image uploads
    if (profilePicture && profilePicture.size > 0) {
      try {
        const result = await uploadImage(profilePicture, 'profile');
        updateData.profilepic = {
          url: result.url,
          public_id: result.public_id
        };
      } catch (error: any) {
        return { success: false, error: `Failed to upload profile picture: ${error.message}` };
      }
    }

    if (coverPicture && coverPicture.size > 0) {
      try {
        const result = await uploadImage(coverPicture, 'cover');
        updateData.coverpic = {
          url: result.url,
          public_id: result.public_id
        };
      } catch (error: any) {
        return { success: false, error: `Failed to upload cover picture: ${error.message}` };
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updateData },
      { new: true }
    );

    revalidatePath('/dashboard');
    revalidatePath('/profile');

    return { success: true, data: updatedUser };

  } catch (error: any) {
    console.error('Profile update error:', error);
    return { success: false, error: `Internal server error: ${error.message}` };
  }
}

/**
 * Server action for removing profile/cover image
 */
export async function removeImage(imageType: 'profile' | 'cover'): Promise<ServerActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!['profile', 'cover'].includes(imageType)) {
      return { success: false, error: "Invalid image type" };
    }

    await connectToDatabase();

    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    const imageField = imageType === 'profile' ? 'profilepic' : 'coverpic';
    const currentImage = currentUser[imageField];

    if (!currentImage?.public_id) {
      return { success: false, error: "No image to remove" };
    }

    // Delete from Cloudinary
    try {
      await deleteImage(currentImage.public_id);
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error);
    }

    // Update database
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $unset: { [imageField]: 1 } },
      { new: true }
    );

    revalidatePath('/dashboard');
    revalidatePath('/profile');

    return { success: true, data: updatedUser };

  } catch (error: any) {
    console.error('Image removal error:', error);
    return { success: false, error: `Internal server error: ${error.message}` };
  }
}
