// bookPipeFetch.js - Handles fetching book content from URLs
import { Platform } from 'react-native';
import { CORS_PROXY } from './apiServices';

// Book content fetching operations
export const bookPipeFetch = {
  // Special fetch that ensures no caching
  async fetchContentWithNoCaching(pipe) {
    if (__DEV__) console.log("MODULE 0052: bookPipeFetch.fetchContentWithNoCaching");
    if (!pipe.bookUrl) {
      throw new Error('Book URL is not set');
    }
    
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
        
		if (__DEV__) console.log("FETCH 0005");
  if (__DEV__) console.log("MODULE 0053: bookPipeFetch.fetch 0005");
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
            return; // Success, exit the function
          }
        }
      } catch (error) {
        if (__DEV__) console.log(`Fetch error with proxy ${proxy}: ${error.message}`);
      }
    }
    
    // If we reach here, all proxies failed
    throw new Error('Failed to fetch book content with fresh request');
  },

  // Fetch book content from the URL
  async fetchBookContent(pipe) {
    if (__DEV__) console.log("MODULE 0054: bookPipeFetch.fetchBookContent");
    if (!pipe.bookUrl) {
      throw new Error('Book URL is not set');
    }

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
              
			  if (__DEV__) console.log("FETCH 0006");
  if (__DEV__) console.log("MODULE 0055: bookPipeFetch.fetch 0006");
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
			  if (__DEV__) console.log("FETCH 0007");
  if (__DEV__) console.log("MODULE 0056: bookPipeFetch.fetch 0007");
              response = await fetch(pipe.bookUrl, { 
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
			if (__DEV__) console.log("FETCH 0008");
  if (__DEV__) console.log("MODULE 0057: bookPipeFetch.fetch 0008");
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
        } catch (fetchError) {
          retryCount++;
          
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
      if (__DEV__) console.log(`Fatal fetch error: ${error.message}`);
      throw error;
    }
  }
};