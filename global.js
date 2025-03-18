// This file should be imported at the very top of your app entry point

// Check if we're running in a React Native environment
const isReactNative = typeof global !== 'undefined' && global.navigator && global.navigator.product === 'ReactNative';

// Setup global polyfills for React Native
if (isReactNative) {
  // Add setImmediate polyfill if it doesn't exist
  if (typeof global.setImmediate !== 'function') {
    global.setImmediate = function(callback, ...args) {
      return setTimeout(() => callback(...args), 0);
    };
    global.clearImmediate = function(id) {
      clearTimeout(id);
    };
  }
  
  // Add any other global polyfills here if needed
}

// Export an empty object since we're just modifying globals
export default {};
