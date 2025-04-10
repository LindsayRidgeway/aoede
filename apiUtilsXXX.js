// apiUtils.js - Helper functions with safer fallback for iOS
import Constants from 'expo-constants';

const {
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GOOGLE_API_KEY,
  CORS_PROXY
} = Constants.expoConfig.extra;

// Example usage:
export const getApiKey = (name) => {
  switch (name) {
    case 'openai': return OPENAI_API_KEY;
    case 'anthropic': return ANTHROPIC_API_KEY;
    case 'google': return GOOGLE_API_KEY;
    case 'proxy': return CORS_PROXY;
    default: return null;
  }
};

// Enable/disable debugging (set to true for development)
export const DEBUG_KEYS = true;

// Helper for printing key details
export const logKeyDetails = (name, key) => {
  if (DEBUG_KEYS) {
    console.log(`[API] ${name} available: ${key ? 'YES' : 'NO'}`);
    
    if (key) {
      console.log(`[API] ${name} length: ${key.length} chars`);
    }
  }
};

// Get constants with better support for env variables
export const getConstantValue = (key) => {
  let value = null;
  let source = null;
  
  // Try expo config extra - best for newer Expo versions
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    value = Constants.expoConfig.extra[key];
    source = 'Constants.expoConfig.extra';
  }
  // Try manifest extra - for older Expo versions
  else if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    value = Constants.manifest.extra[key];
    source = 'Constants.manifest.extra';
  }
  // Try Constants extra
  else if (Constants?.extra && Constants.extra[key] !== undefined) {
    value = Constants.extra[key];
    source = 'Constants.extra';
  }
  // Try top level Constants
  else if (Constants && Constants[key] !== undefined) {
    value = Constants[key];
    source = 'Constants';
  }
  
  return value;
};
