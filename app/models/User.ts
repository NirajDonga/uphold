import mongoose from "mongoose";
import type { Document } from "mongoose";

const { Schema } = mongoose;

export interface IUser extends Document {
    email: string;
    password?: string;
    provider: 'credentials' | 'github' | 'google';
    name?: string;
    username: string;
    profilepic?: {
        url: string;
        public_id: string;
    };
    coverpic?: {
        url: string;
        public_id: string;
    };
    bio?: string;
    isVerified: boolean;
    isProfileComplete: boolean;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    favoriteCreators?: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    profilePictureUrl: string;
    coverPictureUrl: string;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function(this: IUser) {
            // Password is required only for email/password registration
            // OAuth users don't need password initially, but must set one later
            return this.provider === 'credentials';
        },
        minlength: 6
    },
    provider: {
        type: String,
        enum: ['credentials', 'github', 'google'],
        default: 'credentials'
    },
    name: {
        type: String,
        trim: true
    },
    username: { 
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 30,
        lowercase: true, // Always store as lowercase
        validate: {
            validator: function(v: string) {
                // Only allow alphanumeric characters, underscores, and dots
                return /^[a-zA-Z0-9_.]+$/.test(v);
            },
            message: 'Username can only contain letters, numbers, underscores (_), and dots (.)'
        }
    },
    profilepic: {
        url: { type: String },
        public_id: { type: String }
    },
    coverpic: {
        url: { type: String },
        public_id: { type: String }
    },
    bio: {
        type: String,
        maxlength: 500,
        default: "Creating amazing content for the community!"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isProfileComplete: {
        type: Boolean,
        default: function(this: IUser) {
            // OAuth users need to complete profile, credentials users are complete by default
            return this.provider === 'credentials';
        }
    },
    favoriteCreators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save hook to convert username to lowercase
UserSchema.pre('save', function(next) {
    if (this.isModified('username')) {
        this.username = this.username.toLowerCase();
    }
    next();
});

// Pre-update hook to convert username to lowercase
UserSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate() as any;
    if (update && typeof update.username === 'string') {
        update.username = update.username.toLowerCase();
    }
    next();
});

// Virtual for profile picture URL
UserSchema.virtual('profilePictureUrl').get(function(this: IUser) {
    return this.profilepic?.url || 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png';
});

// Virtual for cover picture URL
UserSchema.virtual('coverPictureUrl').get(function(this: IUser) {
    return this.coverpic?.url || 'https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generator-ai-illustration-photo.jpg';
});

export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
