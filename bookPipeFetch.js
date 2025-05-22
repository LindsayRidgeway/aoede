// bookPipeFetch.js - Handles fetching book content from URLs (Web Only)
import { getBookById } from './userLibrary';
import { fetchUrl } from './fetchUtils';

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
      pipe.htmlContent = await fetchUrl(pipe.bookUrl);            
    } catch (error) {
      if (__DEV__) console.log(`Fatal fetch error: ${error.message}`);
      throw error;
    }
  }
};