# 🚀 Cloudinary Setup Guide

## What is Cloudinary?
Cloudinary is a cloud-based service that provides solutions for image and video management. It's perfect for storing profile pictures, cover images, and other media files without cluttering your server.

## ✨ Benefits of Using Cloudinary
- **No local storage** - Images are stored in the cloud
- **Automatic optimization** - Images are automatically resized and compressed
- **CDN delivery** - Fast image loading worldwide
- **Easy management** - Delete old images when updating
- **Scalable** - Handle thousands of images without server issues

## 🔧 Setup Steps

### 1. Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email

### 2. Get Your Credentials
1. Login to your Cloudinary dashboard
2. Go to **Dashboard** → **API Keys**
3. Copy these values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Add Environment Variables
Create a `.env.local` file in your project root and add:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Install Dependencies
```bash
npm install cloudinary multer
```

## 📁 File Structure
```
app/
├── lib/
│   └── cloudinary.js          # Cloudinary configuration
├── models/
│   └── User.js                # Updated User model with image fields
├── api/
│   └── profile/
│       └── route.js           # Updated profile API with Cloudinary
└── dashboard/
    └── page.js                # Updated dashboard with bio field
```

## 🗄️ Database Changes

### User Model Updates
- **profilepic**: Now stores `{ url, public_id }` instead of just URL
- **coverpic**: Now stores `{ url, public_id }` instead of just URL
- **bio**: New field for user biography
- **Virtual properties**: `profilePictureUrl` and `coverPictureUrl` for easy access

### Example User Document
```json
{
  "_id": "user123",
  "email": "user@example.com",
  "username": "cooluser",
  "name": "Cool User",
  "bio": "Creating amazing content!",
  "profilepic": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v123/profile.jpg",
    "public_id": "profile-pictures/user123_profile"
  },
  "coverpic": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v123/cover.jpg",
    "public_id": "cover-pictures/user123_cover"
  }
}
```

## 🔄 How It Works

### 1. Image Upload Flow
```
User selects image → Convert to base64 → Upload to Cloudinary → Store URL + public_id in MongoDB
```

### 2. Image Update Flow
```
User selects new image → Delete old image from Cloudinary → Upload new image → Update MongoDB
```

### 3. Image Deletion
```
When user updates image → Old image automatically deleted from Cloudinary → No orphaned files
```

## 🎯 Features

### ✅ What's Working
- Profile picture upload/update
- Cover picture upload/update
- Bio field support
- Automatic old image cleanup
- Image optimization (800x800 max)
- Toast notifications for feedback
- Form validation

### 🚧 What You Can Add
- Image cropping before upload
- Multiple image formats support
- Video upload support
- Image galleries
- Social media sharing

## 🛠️ API Endpoints

### POST `/api/profile`
- **Purpose**: Update user profile (name, username, bio, images)
- **Method**: POST with multipart/form-data
- **Fields**:
  - `name` (optional): User's display name
  - `username` (optional): Custom username
  - `bio` (optional): User biography (max 500 chars)
  - `profilePicture` (optional): Profile image file
  - `coverPicture` (optional): Cover image file

### Response
```json
{
  "user": {
    "_id": "user123",
    "name": "Cool User",
    "username": "cooluser",
    "bio": "Creating amazing content!",
    "profilepic": { "url": "...", "public_id": "..." },
    "coverpic": { "url": "...", "public_id": "..." }
  }
}
```

## 🔒 Security Features
- **File type validation**: Only images allowed
- **Size limits**: Automatic optimization
- **Secure URLs**: HTTPS only
- **Authentication required**: Must be logged in to update profile

## 💡 Best Practices
1. **Always use environment variables** for sensitive data
2. **Delete old images** when updating to save storage
3. **Use appropriate folders** for organization (profile-pictures, cover-pictures)
4. **Handle errors gracefully** with user-friendly messages
5. **Validate file types** before upload

## 🚨 Troubleshooting

### Common Issues
1. **"Cloudinary config error"** → Check your environment variables
2. **"Upload failed"** → Check file size and type
3. **"Image not showing"** → Check if URL is accessible

### Debug Steps
1. Check browser console for errors
2. Verify environment variables are loaded
3. Check Cloudinary dashboard for uploads
4. Verify MongoDB connection

## 📱 Usage Examples

### In Components
```javascript
// Access profile picture
const profileUrl = user.profilePictureUrl;

// Access cover picture  
const coverUrl = user.coverPictureUrl;

// Check if user has custom bio
const userBio = user.bio || "No bio yet";
```

### In API Routes
```javascript
import { uploadImage, deleteImage } from '@/app/lib/cloudinary';

// Upload new image
const result = await uploadImage(file, 'profile-pictures');

// Delete old image
await deleteImage(user.profilepic.public_id);
```

## 🎉 You're All Set!
Your app now has a professional image management system with Cloudinary. Users can upload profile pictures and cover images that are automatically optimized and stored securely in the cloud!
