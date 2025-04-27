// bookPipeFetch.js - Handles fetching book content from URLs
import { Platform } from 'react-native';
import { CORS_PROXY } from './apiServices';
import { getBookById } from './userLibrary';

// Book content fetching operations
export const bookPipeFetch = {
  // Fetch book content from the URL
  async fetchBookContent(pipe) {
    if (__DEV__) console.log("MODULE 0054: bookPipeFetch.fetchBookContent");
    
    try {
      // Get the book from the user's library using bookId
      if (!pipe.bookId) {
        throw new Error('Book ID is not set');
      }
      
      const book = await getBookById(pipe.bookId);
      if (!book) {
        throw new Error(`Book with ID ${pipe.bookId} not found in user library`);
      }
      
      // Set the book URL from the fetched book
      pipe.bookUrl = book.url;
      
      if (!pipe.bookUrl) {
        throw new Error('Book URL is not set');
      }

      let response;
      let maxRetries = 4;
      let retryCount = 0;
      let success = false;
      
      // List of CORS proxies to try
      const corsProxies = [
        `${CORS_PROXY}`,
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://proxy.cors.sh/'
      ];
      
      while (!success && retryCount < maxRetries) {
        try {
          if (Platform.OS === 'web') {
            const proxyIndex = Math.min(retryCount, corsProxies.length - 1);
            const currentProxy = corsProxies[proxyIndex];
            
            if (currentProxy) {
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
                timeout: 15000
              });
            } else {
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
            if (__DEV__) console.log("FETCH 0008");
            if (__DEV__) console.log("MODULE 0057: bookPipeFetch.fetch 0008");
            response = await fetch(pipe.bookUrl);
          }
          
          if (response.type === 'opaque') {
            throw new Error('Unable to access content due to CORS restrictions');
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          
          pipe.htmlContent = await response.text();
          if (__DEV__) console.log("BOOK_PIPE_FETCH.1 htmlContent.length=", pipe.htmlContent.length);
          
          if (!pipe.htmlContent || pipe.htmlContent.length < 1000) {
            throw new Error(`Retrieved HTML is too short (${pipe.htmlContent ? pipe.htmlContent.length : 0} characters)`);
          }
          
          success = true;
        } catch (fetchError) {
          retryCount++;
          
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