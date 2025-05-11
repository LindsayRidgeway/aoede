// apiUtils.js - Helper functions with safer fallback for iOS
import Constants from 'expo-constants';

const {
  OPENAI_API_KEY,
  GOOGLE_API_KEY
} = Constants.expoConfig.extra;

// Example usage:
export const getApiKey = (name) => {
  if (__DEV__) console.log("MODULE 0033: apiUtilsXXX.getApiKey");
  switch (name) {
    case 'openai': return OPENAI_API_KEY;
    case 'google': return GOOGLE_API_KEY;
    default: return null;
  }
};

// Get constants with better support for env variables
export const getConstantValue = (key) => {
  if (__DEV__) console.log("MODULE 0035: apiUtilsXXX.getConstantValue");
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