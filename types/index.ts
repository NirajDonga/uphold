import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      username?: string;
      profilePic?: string;
      coverpic?: string;
      provider?: string;
      isProfileComplete?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    username?: string;
    profilePic?: string;
    coverpic?: string;
    provider?: string;
    isProfileComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    username?: string;
    profilepic?: string;
    coverpic?: string;
    provider?: string;
    isProfileComplete?: boolean;
  }
}

// MongoDB User Document
export interface UserDocument {
  _id: string;
  email: string;
  password?: string;
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
  provider: 'credentials' | 'github' | 'google';
  isVerified: boolean;
  isProfileComplete: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  profilePictureUrl: string;
  coverPictureUrl: string;
}

// Transaction Document
export interface TransactionDocument {
  _id: string;
  name: string;
  to_user: string;
  oid: string;
  message?: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  done: boolean;
}

// Form Data Types
export interface RegisterFormData {
  email: string;
  password: string;
  username: string;
  name?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ProfileFormData {
  name?: string;
  email: string;
  username: string;
  profilePic?: string;
  coverpic?: string;
}

export interface PaymentFormData {
  name: string;
  message?: string;
  amount: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  user?: any; // For backward compatibility with older code
}

export interface BalanceData {
  balance: number;
  totalEarnings: number;
  totalDonations: number;
  pendingAmount: number;
}

// Server Action Response
export interface ServerActionResponse {
  success: boolean;
  error?: string;
  data?: any;
}
