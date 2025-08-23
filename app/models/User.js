import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
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
        validate: {
            validator: function(v) {
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
    }
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
    if (this._update.username) {
        this._update.username = this._update.username.toLowerCase();
    }
    next();
});

// Virtual for profile picture URL
UserSchema.virtual('profilePictureUrl').get(function() {
    return this.profilepic?.url || 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png';
});

// Virtual for cover picture URL
UserSchema.virtual('coverPictureUrl').get(function() {
    return this.coverpic?.url || 'https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generative-ai-illustration-photo.jpg';
});

export default mongoose.models.User || mongoose.model("User", UserSchema);