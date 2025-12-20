import mongoose from "mongoose";

// Global cache type for TypeScript
declare global {
  var __mongoose_conn__: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Use Next.js built-in caching approach
let cached = global.__mongoose_conn__;

if (!cached) {
  cached = global.__mongoose_conn__ = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }

  // Create connection promise if it doesn't exist
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 20, // Increased pool size for better concurrent performance
      minPoolSize: 5, // Keep minimum connections for faster initial queries
      serverSelectionTimeoutMS: 5000, // Reduced for faster failure detection
      socketTimeoutMS: 45000, // Socket timeout
      connectTimeoutMS: 5000, // Reduced connection timeout for faster failure
      family: 4, // Use IPv4, skip trying IPv6
      heartbeatFrequencyMS: 30000, // Check server status every 30 seconds
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully with optimized settings');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      cached.promise = null; // Reset promise on error
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Reset promise on error
    console.error('Failed to connect to database:', error);
    throw error;
  }
}
