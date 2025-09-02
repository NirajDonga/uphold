/**
 * Environment configuration with validation
 */

interface ConfigType {
  // Database
  MONGODB_URI?: string;
  
  // Authentication
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  
  // OAuth Providers
  GITHUB_ID?: string;
  GITHUB_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  
  // Payment
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  
  // Email
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  
  // General
  NODE_ENV?: string;
  NEXT_PUBLIC_BASE_URL?: string;
}

interface FeatureFlags {
  imageUpload: boolean;
  emailNotifications: boolean;
  payments: boolean;
}

class EnvironmentConfig {
  private config: ConfigType;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): ConfigType {
    return {
      // Database
      MONGODB_URI: process.env.MONGODB_URI,
      
      // Authentication
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      
      // OAuth Providers
      GITHUB_ID: process.env.GITHUB_ID,
      GITHUB_SECRET: process.env.GITHUB_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      
      // Payment
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      
      // Cloudinary
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      
      // Email
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      
      // General
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };
  }

  private validateConfig(): void {
    const requiredVars: (keyof ConfigType)[] = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
    ];

    const missingVars = requiredVars.filter(varName => !this.config[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate URL format
    if (this.config.MONGODB_URI && !this.config.MONGODB_URI.startsWith('mongodb')) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }
  }

  public get(key: keyof ConfigType): string | undefined {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isCloudinaryConfigured(): boolean {
    return !!(
      this.config.CLOUDINARY_CLOUD_NAME &&
      this.config.CLOUDINARY_API_KEY &&
      this.config.CLOUDINARY_API_SECRET
    );
  }

  public isEmailConfigured(): boolean {
    return !!(
      this.config.EMAIL_USER &&
      this.config.EMAIL_PASS
    );
  }

  public isStripeConfigured(): boolean {
    return !!(
      this.config.STRIPE_SECRET_KEY &&
      this.config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
  }

  public getFeatureFlags(): FeatureFlags {
    return {
      imageUpload: this.isCloudinaryConfigured(),
      emailNotifications: this.isEmailConfigured(),
      payments: this.isStripeConfigured(),
    };
  }
}

// Singleton instance
const envConfig = new EnvironmentConfig();

export default envConfig;
export type { ConfigType, FeatureFlags };
