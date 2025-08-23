import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User";
import { uploadImage, deleteImage } from "@/app/lib/cloudinary";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    await connectToDatabase();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      console.error(`Profile GET: User ${session.user.id} not found in database`);
      return new Response(JSON.stringify({ error: "User not found in database" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log(`Profile GET: Successfully fetched profile for user ${user.email} (${user.username})`);
    return new Response(JSON.stringify({ user }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check Cloudinary configuration
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudinaryConfigured) {
      console.warn('Cloudinary not configured - image uploads disabled');
    }

    const contentType = request.headers.get("content-type") || "";
    await connectToDatabase();

    // Verify user still exists before proceeding
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      console.error(`Profile POST: User ${session.user.id} not found in database`);
      return new Response(JSON.stringify({ error: "User not found in database" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const name = form.get("name") || undefined;
      const username = form.get("username") || undefined;
      const email = form.get("email") || undefined;
      const bio = form.get("bio") || undefined;
      const profileFile = form.get("profilePicture");
      const coverFile = form.get("coverPicture");

      // Validate username format if provided
      if (username) {
        const usernameRegex = /^[a-zA-Z0-9_.]{2,30}$/;
        if (!usernameRegex.test(username)) {
          return new Response(JSON.stringify({ 
            error: "Username must be 2-30 characters and can only contain letters, numbers, underscores (_), and dots (.)" 
          }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // Check username uniqueness if username is being changed
      if (username && username !== currentUser.username) {
        // Convert to lowercase for comparison since DB stores in lowercase
        const usernameLower = username.toLowerCase();
        
        // Check if username already exists (case-insensitive)
        const existingUser = await User.findOne({ 
          username: usernameLower,
          _id: { $ne: session.user.id } // Exclude current user
        });
        
        if (existingUser) {
          console.log(`Profile POST: Username ${username} already taken by ${existingUser.email}`);
          return new Response(JSON.stringify({ error: "Username already taken" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      let profilePicture = undefined;
      let coverPicture = undefined;

      // Handle profile picture upload only if Cloudinary is configured
      if (profileFile && typeof profileFile !== "string" && cloudinaryConfigured) {
        try {
          console.log('Uploading profile picture...');
          // Delete old profile picture if exists
          if (currentUser.profilepic?.public_id) {
            console.log('Deleting old profile picture:', currentUser.profilepic.public_id);
            await deleteImage(currentUser.profilepic.public_id);
          }
          
          const result = await uploadImage(profileFile, 'profile-pictures');
          console.log('Profile picture upload result:', result);
          profilePicture = {
            url: result.url,
            public_id: result.public_id
          };
        } catch (error) {
          console.error('Profile picture upload error:', error);
          return new Response(JSON.stringify({ error: `Failed to upload profile picture: ${error.message}` }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else if (profileFile && !cloudinaryConfigured) {
        console.warn('Profile picture upload skipped - Cloudinary not configured');
      }

      // Handle cover picture upload only if Cloudinary is configured
      if (coverFile && typeof coverFile !== "string" && cloudinaryConfigured) {
        try {
          console.log('Uploading cover picture...');
          // Delete old cover picture if exists
          if (currentUser.coverpic?.public_id) {
            console.log('Deleting old cover picture:', currentUser.coverpic.public_id);
            await deleteImage(currentUser.coverpic.public_id);
          }
          
          const result = await uploadImage(coverFile, 'cover-pictures');
          console.log('Cover picture upload result:', result);
          coverPicture = {
            url: result.url,
            public_id: result.public_id
          };
        } catch (error) {
          console.error('Cover picture upload error:', error);
          return new Response(JSON.stringify({ error: `Failed to upload cover picture: ${error.message}` }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else if (coverFile && !cloudinaryConfigured) {
        console.warn('Cover picture upload skipped - Cloudinary not configured');
      }

      const update = {
        ...(name ? { name } : {}),
        ...(username ? { username } : {}),
        ...(email ? { email } : {}),
        ...(bio ? { bio } : {}),
        ...(profilePicture ? { profilepic: profilePicture } : {}),
        ...(coverPicture ? { coverpic: coverPicture } : {})
      };

      console.log('Updating user with:', update);

      const user = await User.findByIdAndUpdate(
        session.user.id,
        { $set: update },
        { new: true, upsert: true }
      );
      
      console.log(`Profile POST: Successfully updated profile for user ${user.email}`);
      return new Response(JSON.stringify({ user }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const body = await request.json();
    
    // Validate username format if provided
    if (body.username) {
      const usernameRegex = /^[a-zA-Z0-9_.]{2,30}$/;
      if (!usernameRegex.test(body.username)) {
        return new Response(JSON.stringify({ 
          error: "Username must be 2-30 characters and can only contain letters, numbers, underscores (_), and dots (.)" 
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Check username uniqueness if username is being changed
    if (body.username) {
      if (body.username !== currentUser.username) {
        // Convert to lowercase for comparison since DB stores in lowercase
        const usernameLower = body.username.toLowerCase();
        
        // Check if username already exists (case-insensitive)
        const existingUser = await User.findOne({ 
          username: usernameLower,
          _id: { $ne: session.user.id } // Exclude current user
        });
        
        if (existingUser) {
          console.log(`Profile POST: Username ${body.username} already taken by ${existingUser.email}`);
          return new Response(JSON.stringify({ error: "Username already taken" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
    
    const update = { ...body };
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true, upsert: true }
    );
    
    console.log(`Profile POST: Successfully updated profile for user ${user.email}`);
    return new Response(JSON.stringify({ user }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}


