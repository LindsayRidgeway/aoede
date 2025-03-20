// bookPipeFetch.js - Handles fetching book content from URLs
import { Platform } from 'react-native';
import { CORS_PROXY } from './apiServices';

// Book content fetching operations
export const bookPipeFetch = {
  // Special fetch that ensures no caching
  async fetchContentWithNoCaching(pipe) {
    if (!pipe.bookUrl) {
      throw new Error('Book URL is not set');
    }
    
    pipe.log(`Fetching content with no caching from: ${pipe.bookUrl}`);
    
    // Add a unique cache-busting parameter
    let targetUrl = pipe.bookUrl;
    if (targetUrl.includes('?')) {
      targetUrl = `${targetUrl}&_=${Date.now()}`;
    } else if (targetUrl.includes('#')) {
      const [baseUrl, fragment] = targetUrl.split('#');
      targetUrl = `${baseUrl}?_=${Date.now()}#${fragment}`;
    } else {
      targetUrl = `${targetUrl}?_=${Date.now()}`;
    }
    
    pipe.log(`Using cache-busted URL: ${targetUrl}`);
    
    // Clear HTML content first to ensure a fresh start
    pipe.htmlContent = null;
    
    // List of CORS proxies to try
    const corsProxies = [
      `${CORS_PROXY}`, // Use the configured CORS proxy first
      'https://corsproxy.io/?', // Alternative proxy 1
      'https://api.allorigins.win/raw?url=', // Alternative proxy 2
      'https://proxy.cors.sh/' // Alternative proxy 3
    ];
    
    // Try each proxy
    for (const proxy of corsProxies) {
      try {
        // Ensure URL is properly encoded if using a proxy that requires it
        let proxyTargetUrl = targetUrl;
        if (proxy.includes('?url=')) {
          proxyTargetUrl = encodeURIComponent(targetUrl);
        }
        
        const proxyUrl = `${proxy}${proxyTargetUrl}`;
        pipe.log(`Trying proxy: ${proxy}`);
        
        const response = await fetch(proxyUrl, { 
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store',
          credentials: 'omit' // Don't send cookies
        });
        
        if (response.ok) {
          pipe.htmlContent = await response.text();
          
          if (pipe.htmlContent && pipe.htmlContent.length >= 1000) {
            pipe.log(`Successfully fetched content: ${pipe.htmlContent.length} bytes`);
            return; // Success, exit the function
          }
        }
      } catch (error) {
        pipe.log(`Fetch error with proxy ${proxy}: ${error.message}`);
        // Try next proxy
      }
    }
    
    // If we reach here, all proxies failed
    throw new Error('Failed to fetch book content with fresh request');
  },

  // Fetch book content from the URL
  async fetchBookContent(pipe) {
    if (!pipe.bookUrl) {
      throw new Error('Book URL is not set');
    }

    pipe.log(`Fetching book content from: ${pipe.bookUrl}`);

    try {
      let response;
      let maxRetries = 4;
      let retryCount = 0;
      let success = false;
      
      // List of CORS proxies to try
      const corsProxies = [
        `${CORS_PROXY}`, // Use the configured CORS proxy first
        'https://corsproxy.io/?', // Alternative proxy 1
        'https://api.allorigins.win/raw?url=', // Alternative proxy 2
        'https://proxy.cors.sh/' // Alternative proxy 3
      ];
      
      while (!success && retryCount < maxRetries) {
        try {
          // Use proxy for web to avoid CORS issues, direct fetch for native
          if (Platform.OS === 'web') {
            // Choose a proxy based on retry count
            const proxyIndex = Math.min(retryCount, corsProxies.length - 1);
            const currentProxy = corsProxies[proxyIndex];
            
            if (currentProxy) {
              // Ensure URL is properly encoded if using a proxy that requires it
              let targetUrl = pipe.bookUrl;
              if (currentProxy.includes('?url=')) {
                targetUrl = encodeURIComponent(pipe.bookUrl);
              }
              
              const proxyUrl = `${currentProxy}${targetUrl}`;
              pipe.log(`Using proxy: ${currentProxy}`);
              
              response = await fetch(proxyUrl, { 
                method: 'GET',
                mode: 'cors',
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml',
                  'Cache-Control': 'no-cache'
                },
                timeout: 15000 // 15 second timeout
              });
            } else {
              // If no proxy is available or they all failed, try a no-cors request as last resort
              pipe.log(`No proxy available, trying no-cors request`);
              response = await fetch(pipe.bookUrl, { 
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
            pipe.log(`Using direct fetch for native platform`);
            response = await fetch(pipe.bookUrl);
          }
          
          if (response.type === 'opaque') {
            // This happens with no-cors mode, and we can't access the content
            throw new Error('Unable to access content due to CORS restrictions');
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          
          pipe.htmlContent = await response.text();
          
          if (!pipe.htmlContent || pipe.htmlContent.length < 1000) {
            throw new Error(`Retrieved HTML is too short (${pipe.htmlContent ? pipe.htmlContent.length : 0} characters)`);
          }
          
          success = true;
          pipe.log(`Successfully fetched content: ${pipe.htmlContent.length} bytes`);
        } catch (fetchError) {
          retryCount++;
          pipe.log(`Fetch attempt ${retryCount} failed: ${fetchError.message}`);
          
          // Wait a bit longer between retries
          if (retryCount < maxRetries) {
            const delay = 1000 * retryCount;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw fetchError;
          }
        }
      }
      
      if (!success) {
        throw new Error(`Failed to fetch book content after ${maxRetries} attempts`);
      }
    } catch (error) {
      pipe.log(`Fatal fetch error: ${error.message}`);
      throw error;
    }
  }
};