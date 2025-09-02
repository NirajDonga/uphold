// This file adds debug logging for profiles

// Debug levels
export enum DebugLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

// Default to ERROR in production, DEBUG in development
const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? DebugLevel.ERROR : DebugLevel.DEBUG;

// Current debug level - can be changed at runtime
let currentLevel = DEFAULT_LEVEL;

// Set debug level
export const setDebugLevel = (level: DebugLevel) => {
  currentLevel = level;
};

// Debug logger with prefix and conditional logging
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (currentLevel >= DebugLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLevel >= DebugLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (currentLevel >= DebugLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (currentLevel >= DebugLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  // Special method to log user profile information safely
  profile: (userProfile: any) => {
    if (currentLevel >= DebugLevel.DEBUG && userProfile) {
      // Safely extract and log profile data
      try {
        const safeProfile = {
          id: userProfile?._id?.toString() || userProfile?.id || 'unknown',
          name: userProfile?.name || 'unnamed',
          username: userProfile?.username || 'no-username',
          hasProfilePic: Boolean(userProfile?.profilepic?.url),
          profilePicUrl: userProfile?.profilepic?.url ? 
            (userProfile.profilepic.url.substring(0, 50) + '...') : 'none',
          hasCoverPic: Boolean(userProfile?.coverpic?.url),
          coverPicUrl: userProfile?.coverpic?.url ? 
            (userProfile.coverpic.url.substring(0, 50) + '...') : 'none',
          hasVirtualProfilePic: Boolean(userProfile?.profilePictureUrl),
          hasVirtualCoverPic: Boolean(userProfile?.coverPictureUrl),
        };
        console.log('[PROFILE]', safeProfile);
      } catch (error) {
        console.error('[ERROR] Failed to log profile:', error);
      }
    }
  }
};
