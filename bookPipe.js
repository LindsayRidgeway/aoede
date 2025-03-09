// bookPipe.js - Retrieves book content directly from URLs and processes it in batches

import { parseIntoSentences } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import { CORS_PROXY } from './apiServices';
import { Platform } from 'react-native';

class BookPipe {
  constructor() {
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.allText = '';
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
  }

  // Initialize the pipe with a book ID
  async initialize(bookId) {
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    this.reset();
    this.bookId = bookId;
    this.isLoading = true;

    try {
      const bookSource = getBookSourceById(bookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      
      // Fetch the book content
      console.log(`Fetching book: "${this.bookTitle}" from ${this.bookUrl}`);
      await this.fetchBookContent();
      
      console.log(`Fetched book content: ${this.allText.substring(0, 100)}...`);
      
      // Parse the content into sentences
      this.sentences = parseIntoSentences(this.allText);
      console.log(`Parsed ${this.sentences.length} sentences from book content`);
      
      this.isInitialized = true;
      return {
        title: this.bookTitle,
        language: this.bookLanguage,
        totalSentences: this.sentences.length
      };
    } catch (error) {
      console.error(`Error initializing book pipe: ${error.message}`);
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Fetch book content from the URL
  async fetchBookContent() {
    if (!this.bookUrl) {
      throw new Error('Book URL is not set');
    }

    try {
      let response;
      
      // Use proxy for web to avoid CORS issues, direct fetch for native
      if (Platform.OS === 'web') {
        const proxyUrl = `${CORS_PROXY}${this.bookUrl}`;
        console.log(`Using proxy URL: ${proxyUrl}`);
        response = await fetch(proxyUrl);
      } else {
        response = await fetch(this.bookUrl);
      }

      if (!response.ok) {
        throw new Error(`Error fetching book content: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      this.allText = this.extractTextFromHtml(html);
      
      // Fail if we couldn't extract meaningful text
      if (!this.allText || this.allText.length < 100) {
        throw new Error('Could not extract sufficient text content from the source');
      }
      
      return this.allText;
    } catch (error) {
      console.error(`Error fetching book content: ${error.message}`);
      throw error;
    }
  }

  // Extract plain text from HTML content
  extractTextFromHtml(html) {
    if (!html) return '';
    
    try {
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Remove script and style elements
      const scripts = tempDiv.getElementsByTagName('script');
      const styles = tempDiv.getElementsByTagName('style');
      
      for (let i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
      }
      
      for (let i = styles.length - 1; i >= 0; i--) {
        styles[i].parentNode.removeChild(styles[i]);
      }
      
      // Handle special case for Gutenberg books
      // Most URLs have an anchor to the first chapter, try to find content after that
      const bookUrl = this.bookUrl;
      let contentDiv = tempDiv;
      
      if (bookUrl && bookUrl.includes('#')) {
        const anchorId = bookUrl.split('#')[1];
        if (anchorId) {
          // Try to find the element with the specified ID
          const anchorElement = tempDiv.getElementById(anchorId);
          
          if (anchorElement) {
            // If found, use the parent element that contains the actual content
            contentDiv = anchorElement.parentNode || tempDiv;
          }
        }
      }
      
      // Get the text content
      let text = contentDiv.textContent || contentDiv.innerText || '';
      
      // Clean up the text
      text = text
        // Remove excess whitespace
        .replace(/\s+/g, ' ')
        // Remove non-printable characters
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F]/g, ' ')
        .trim();
      
      return text;
    } catch (error) {
      console.error(`Error extracting text from HTML: ${error.message}`);
      // Return the HTML as fallback - let the sentence parser handle it
      return html;
    }
  }

  // Get the next batch of sentences
  getNextBatch(batchSize = 10) {
    if (!this.isInitialized) {
      throw new Error('Book pipe is not initialized');
    }

    const startIdx = this.nextSentenceIndex;
    const endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    
    if (startIdx >= this.sentences.length) {
      return [];
    }
    
    const batch = this.sentences.slice(startIdx, endIdx);
    this.nextSentenceIndex = endIdx;
    
    return batch;
  }

  // Check if there are more sentences available
  hasMoreSentences() {
    return this.isInitialized && this.nextSentenceIndex < this.sentences.length;
  }

  // Get current progress information
  getProgress() {
    return {
      totalSentences: this.sentences.length,
      processedSentences: this.nextSentenceIndex,
      remainingSentences: Math.max(0, this.sentences.length - this.nextSentenceIndex),
      percentage: this.sentences.length > 0 
        ? Math.round((this.nextSentenceIndex / this.sentences.length) * 100) 
        : 0
    };
  }

  // Reset the pipe for a new book
  reset() {
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.allText = '';
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
  }
}

// Export a singleton instance
export default new BookPipe();