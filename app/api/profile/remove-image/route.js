import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";
import { deleteImage } from "@/app/lib/cloudinary";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const { imageType, publicId } = body;

    if (!imageType || !publicId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!['profile', 'cover'].includes(imageType)) {
      return new Response(JSON.stringify({ error: "Invalid image type" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await connectToDatabase();

    // Get current user
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if the image exists and belongs to the user
    const currentImage = currentUser[imageType === 'profile' ? 'profilepic' : 'coverpic'];
    if (!currentImage || currentImage.public_id !== publicId) {
      return new Response(JSON.stringify({ error: "Image not found or doesn't belong to user" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
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
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $unset: { [updateField]: 1 } },
      { new: true }
    );

    if (!user) {
      return new Response(JSON.stringify({ error: "Failed to update user" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`Successfully removed ${imageType} image for user ${user.email}`);

    return new Response(JSON.stringify({ 
      user,
      message: `${imageType} image removed successfully`
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error('Remove image error:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
