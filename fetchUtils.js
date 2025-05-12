// fetchUtils.js - Unified fetch utilities for Aoede
import { Platform } from 'react-native';

// Robust fetch function with CORS proxy support and retry logic
// Use this for reading full books, where reliability is critical
export const fetchWithRetry = async (url, options = {}) => {
  if (__DEV__) console.log("MODULE: fetchUtils.fetchWithRetry");
  
  // List of CORS proxies to try in order (web platform only)
  const corsProxies = [
    'https://api.codetabs.com/v1/proxy?quest=', // Moved to first position
    'https://thingproxy.freeboard.io/fetch/',
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://proxy.cors.sh/'
  ];
  
  // Retry settings
  const maxRetries = 4;
  let retryCount = 0;
  let success = false;
  let content = null;
  
  while (!success && retryCount < maxRetries) {
    try {
      let response;
      
      if (Platform.OS === 'web') {
        // For web platform, use CORS proxies
        const proxyIndex = Math.min(retryCount, corsProxies.length - 1);
        const currentProxy = corsProxies[proxyIndex];
        
        if (currentProxy) {
          let targetUrl = url;
          if (currentProxy.includes('?url=') || currentProxy.includes('?quest=')) {
            targetUrl = encodeURIComponent(url);
          }
          
          const proxyUrl = `${currentProxy}${targetUrl}`;
          
          if (__DEV__) console.log(`FETCH: Using proxy ${proxyIndex + 1}/${corsProxies.length}`);
          
          // Merge default options with user options
          const fetchOptions = { 
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml',
              'Cache-Control': 'no-cache'
            },
            timeout: 15000,
            ...options
          };
          
          response = await fetch(proxyUrl, fetchOptions);
        } else {
          // Direct fetch as fallback (likely to fail due to CORS)
          if (__DEV__) console.log("FETCH: Direct fetch (no proxy)");
          response = await fetch(url, { 
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache',
            timeout: 15000,
            ...options
          });
        }
      } else {
        // Native platforms don't need CORS proxies
        if (__DEV__) console.log("FETCH: Native platform fetch");
        response = await fetch(url, options);
      }
      
      // Check for opaque response (CORS issue)
      if (response.type === 'opaque') {
        throw new Error('Unable to access content due to CORS restrictions');
      }
      
      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      // Get text content
      content = await response.text();
      
      // Basic content validation - ensure we got meaningful content
      if (!content || content.length < 1000) {
        throw new Error(`Retrieved content is too short (${content ? content.length : 0} characters)`);
      }
      
      success = true;
    } catch (error) {
      retryCount++;
      
      if (__DEV__) console.log(`FETCH: Attempt ${retryCount} failed: ${error.message}`);
      
      if (retryCount < maxRetries) {
        // Implement exponential backoff (wait longer between retries)
        const delay = 1000 * retryCount;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Re-throw after max retries
      }
    }
  }
  
  return content;
};