import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/db/connectdb";
import User, { type IUser } from "@/app/models/User";
import { deleteImage } from "@/app/lib/cloudinary";

interface RemoveImageRequest {
  imageType: 'profile' | 'cover';
  publicId: string;
}

interface RemoveImageResponse {
  user?: Partial<IUser>;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    const body: RemoveImageRequest = await request.json();
    const { imageType, publicId } = body;

    if (!imageType || !publicId) {
      return NextResponse.json<RemoveImageResponse>({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    if (!['profile', 'cover'].includes(imageType)) {
      return NextResponse.json<RemoveImageResponse>({ 
        error: "Invalid image type" 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Get current user
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json<RemoveImageResponse>({ 
        error: "User not found" 
      }, { status: 404 });
    }

    // Check if the image exists and belongs to the user
    const currentImage = currentUser[imageType === 'profile' ? 'profilepic' : 'coverpic'];
    if (!currentImage || currentImage.public_id !== publicId) {
      return NextResponse.json<RemoveImageResponse>({ 
        error: "Image not found or doesn't belong to user" 
      }, { status: 404 });
    }

    try {
      // Delete image from Cloudinary
      console.log(`Removing ${imageType} image from Cloudinary: ${publicId}`);
      await deleteImage(publicId);
      console.log(`Successfully removed ${imageType} image from Cloudinary`);
    } catch (cloudinaryError) {
      console.error(`Failed to remove ${imageType} image from Cloudinary:`, cloudinaryError);
      // Continue with database update even if Cloudinary deletion fails
      // This prevents the user from being stuck with a broken image reference
    }

    // Update user in database - remove the image reference
    const updateField = imageType === 'profile' ? 'profilepic' : 'coverpic';
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $unset: { [updateField]: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json<RemoveImageResponse>({ 
        error: "Failed to update user" 
      }, { status: 500 });
    }

    console.log(`Successfully removed ${imageType} image for user ${updatedUser.email}`);

    return NextResponse.json<RemoveImageResponse>({ 
      user: updatedUser.toObject(),
      message: `${imageType} image removed successfully`
    });

  } catch (error) {
    console.error('Remove image error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<RemoveImageResponse>({ 
      error: `Internal server error: ${errorMessage}` 
    }, { status: 500 });
  }
}
