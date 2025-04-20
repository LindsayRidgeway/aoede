// This file should be imported at the very top of your app entry point

// Check if we're running in a React Native environment
const isReactNative = typeof global !== 'undefined' && global.navigator && global.navigator.product === 'ReactNative';
if (__DEV__) console.log("MODULE 0080: global.detectEnvironment");

// Setup global polyfills for React Native
if (isReactNative) {
  // Add setImmediate polyfill if it doesn't exist
  if (typeof global.setImmediate !== 'function') {
    global.setImmediate = function(callback, ...args) {
      if (__DEV__) console.log("MODULE 0081: global.setImmediate.polyfill");
      return setTimeout(() => callback(...args), 0);
    };
    global.clearImmediate = function(id) {
      if (__DEV__) console.log("MODULE 0082: global.clearImmediate.polyfill");
      clearTimeout(id);
    };
  }
  
  // Add any other global polyfills here if needed
}

// Export an empty object since we're just modifying globals
export default {};