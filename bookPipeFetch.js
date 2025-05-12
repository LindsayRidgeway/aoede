// bookPipeFetch.js - Handles fetching book content from URLs
import { Platform } from 'react-native';
import { getBookById } from './userLibrary';
import { fetchWithRetry } from './fetchUtils';

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

      // Use robust fetch utility to retrieve HTML content
      if (__DEV__) console.log("MODULE 0055: bookPipeFetch.fetch");
      pipe.htmlContent = await fetchWithRetry(pipe.bookUrl);
      
      if (__DEV__) console.log("BOOK_PIPE_FETCH.1 htmlContent.length=", pipe.htmlContent.length);
      
    } catch (error) {
      if (__DEV__) console.log(`Fatal fetch error: ${error.message}`);
      throw error;
    }
  }
};