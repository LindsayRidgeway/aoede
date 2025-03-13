// bookPipe.js - Retrieves book content directly from URLs and processes it in batches

import { parseIntoSentences } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import { CORS_PROXY } from './apiServices';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class BookPipe {
  constructor() {
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;     // Stores the HTML content
    this.anchorPosition = 0;     // Position of the anchor in the HTML
    this.processedTextOffset = 0; // How much text we've processed so far (past the anchor)
    this.chunkSize = 50000;      // Size of text chunks to process at once
    this.sentences = [];         // Processed sentences
    this.nextSentenceIndex = 0;  // Current position in sentences array
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;  // Flag to indicate if there's more content to process
    this.savedBookPosition = 0;  // Position in the book where we last saved progress (relative to anchor)
    this.shouldSavePosition = false; // Flag to prevent auto-saving position when just loading
  }

  // Initialize the pipe with a book ID
  async initialize(bookId) {
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    this.reset();
    this.bookId = bookId;
    this.isLoading = true;
    this.shouldSavePosition = false; // Don't save position on initial load

    try {
      const bookSource = getBookSourceById(bookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      
      // Fetch the book content
      await this.fetchBookContent();
      
      // Find the anchor position in the HTML
      await this.findAnchorPosition();
      
      // Retrieve saved position from storage
      await this.loadSavedPosition();
      
      // Set the processedTextOffset to the saved position
      this.processedTextOffset = this.savedBookPosition;
      
      // Process the first chunk of text starting from the saved position
      await this.processNextChunk(false); // Do not save position when loading
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
      // Always start from the first sentence in the current chunk
      this.nextSentenceIndex = 0;
      
      if (this.isInitialized) {
        return {
          title: this.bookTitle,
          language: this.bookLanguage,
          totalSentences: this.sentences.length,
          resumedFromPosition: this.savedBookPosition > 0
        };
      } else {
        throw new Error('Failed to extract any sentences from the book');
      }
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Load saved book position from AsyncStorage
  async loadSavedPosition() {
    try {
      const storageKey = `book_position_${this.bookId}`;
      const savedPosition = await AsyncStorage.getItem(storageKey);
      
      if (savedPosition) {
        this.savedBookPosition = parseInt(savedPosition, 10);
        // Ensure it's a valid number
        if (isNaN(this.savedBookPosition)) {
          this.savedBookPosition = 0;
        }
      } else {
        this.savedBookPosition = 0;
      }
    } catch (error) {
      this.savedBookPosition = 0;
    }
  }

  // Save current book position to AsyncStorage
  async saveCurrentPosition() {
    if (!this.bookId || !this.shouldSavePosition) return;
    
    try {
      const storageKey = `book_position_${this.bookId}`;
      const currentPosition = this.processedTextOffset;
      
      // Save the position only if it's greater than what we've saved before
      if (currentPosition > this.savedBookPosition) {
        await AsyncStorage.setItem(storageKey, currentPosition.toString());
        this.savedBookPosition = currentPosition;
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Reset book position to the beginning (only to anchor position, not before it)
  async resetBookPosition() {
    if (!this.bookId) return false;
    
    try {
      const storageKey = `book_position_${this.bookId}`;
      // Set saved position to 0 (just the anchor position)
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.setItem(storageKey, "0");
      this.savedBookPosition = 0;
      this.processedTextOffset = 0;
      this.sentences = [];
      this.nextSentenceIndex = 0;
      this.hasMoreContent = true;
      this.shouldSavePosition = false; // Don't save position on rewind
      
      // Process the first chunk from the anchor position
      await this.processNextChunk(false); // Don't save position when loading after rewind
      
      return this.sentences.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Fetch book content from the URL
  async fetchBookContent() {
    if (!this.bookUrl) {
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
              let targetUrl = this.bookUrl;
              if (currentProxy.includes('?url=')) {
                targetUrl = encodeURIComponent(this.bookUrl);
              }
              
              const proxyUrl = `${currentProxy}${targetUrl}`;
              
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
              response = await fetch(this.bookUrl, { 
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
            response = await fetch(this.bookUrl);
          }
          
          if (response.type === 'opaque') {
            // This happens with no-cors mode, and we can't access the content
            throw new Error('Unable to access content due to CORS restrictions');
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          
          this.htmlContent = await response.text();
          
          if (!this.htmlContent || this.htmlContent.length < 1000) {
            throw new Error(`Retrieved HTML is too short (${this.htmlContent ? this.htmlContent.length : 0} characters)`);
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
      throw error;
    }
  }

  // Find the position of the anchor in the HTML
  async findAnchorPosition() {
    if (!this.htmlContent) {
      throw new Error('No HTML content to search for anchor');
    }
    
    try {
      // Parse the URL fragment (bookmark)
      let fragmentId = '';
      if (this.bookUrl.includes('#')) {
        fragmentId = this.bookUrl.split('#')[1];
      } else {
        // No fragment ID, start from the beginning
        this.anchorPosition = 0;
        return;
      }
      
      // Find the anchor in the HTML
      // Pattern 1: <a name="fragmentId"> or <a name='fragmentId'> or <a name=fragmentId>
      const namePattern = new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i');
      
      // Pattern 2: <a id="fragmentId"> or <a id='fragmentId'> or <a id=fragmentId>
      const idPattern = new RegExp(`<a[^>]*?\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i');
      
      // Pattern 3: <element id="fragmentId"> (any element with matching id)
      const elemIdPattern = new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i');
      
      // Try each pattern in order
      let match = null;
      
      // Try name attribute first (most common in older HTML like Gutenberg)
      const nameMatch = namePattern.exec(this.htmlContent);
      if (nameMatch) {
        match = nameMatch;
      }
      
      // Try id attribute if name didn't match
      if (!match) {
        const idMatch = idPattern.exec(this.htmlContent);
        if (idMatch) {
          match = idMatch;
        }
      }
      
      // Try any element with id if the above didn't match
      if (!match) {
        const elemMatch = elemIdPattern.exec(this.htmlContent);
        if (elemMatch) {
          match = elemMatch;
        }
      }
      
      if (match) {
        this.anchorPosition = match.index;
      } else {
        // If no anchor found, use the beginning of the document after head
        const bodyStart = this.htmlContent.indexOf('<body');
        if (bodyStart !== -1) {
          this.anchorPosition = bodyStart;
        } else {
          this.anchorPosition = 0;
        }
      }
    } catch (error) {
      // Default to start of document
      this.anchorPosition = 0;
    }
  }

  // Process the next chunk of HTML into sentences
  async processNextChunk(shouldSave = true) {
    if (!this.htmlContent) {
      this.hasMoreContent = false;
      return [];
    }
    
    try {
      // Calculate the end position for this chunk
      const chunkStart = this.anchorPosition + this.processedTextOffset;
      const chunkEnd = Math.min(chunkStart + this.chunkSize, this.htmlContent.length);
      
      // Check if we're at the end of the content
      if (chunkStart >= this.htmlContent.length || chunkStart >= chunkEnd) {
        this.hasMoreContent = false;
        return [];
      }
      
      // Extract the chunk of HTML
      const htmlChunk = this.htmlContent.substring(chunkStart, chunkEnd);
      
      // Extract text from this HTML chunk
      let textChunk = this.extractText(htmlChunk);
      
      // Parse the text into sentences
      const newSentences = parseIntoSentences(textChunk);
      
      // Add new sentences to our collection
      this.sentences = [...this.sentences, ...newSentences];
      
      // Update the processed offset relative to the anchor position
      const chunkSize = chunkEnd - chunkStart;
      this.processedTextOffset += chunkSize;
      
      // Only save position if instructed to (e.g., after user clicks Next)
      if (shouldSave) {
        this.shouldSavePosition = true; // Now it's ok to save position
        await this.saveCurrentPosition();
      }
      
      // Return the new sentences
      return newSentences;
    } catch (error) {
      return [];
    }
  }
  
  // Extract readable text from HTML
  extractText(html) {
    try {
      // Remove script, style, and metadata tags
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      html = html.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ');
      html = html.replace(/<!--[\s\S]*?-->/g, ' ');
      
      // Remove navigation, header, footer sections if present
      html = html.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
      html = html.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
      html = html.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
      
      // Preserve heading tags by adding newlines before and after them
      // This helps maintain chapter titles and headers
      html = html.replace(/(<h[1-6][^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/h[1-6]>)/gi, '$1\n');
      
      // Add newlines for other structural elements 
      html = html.replace(/(<(div|p|section|article)[^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/(div|p|section|article)>)/gi, '$1\n');
      
      // Special handling for content that's likely to be title elements
      html = html.replace(/(<[^>]*class\s*=\s*["'][^"']*(?:title|chapter|heading|header)[^"']*["'][^>]*>)/gi, '\n$1');
      
      // Remove all remaining HTML tags
      let text = html.replace(/<[^>]*>/g, ' ');
      
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
      
      // Normalize newlines
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Remove consecutive newlines
      text = text.replace(/\n{3,}/g, '\n\n');
      
      // Clean up whitespace while preserving newlines
      text = text.split('\n')
                .map(line => line.replace(/\s+/g, ' ').trim())
                .join('\n')
                .trim();
      
      return text;
    } catch (error) {
      // Return a simplified version as fallback
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Get the next batch of sentences, loading more if needed
  async getNextBatch(batchSize = 10) {
    if (!this.isInitialized) {
      throw new Error('Book pipe is not initialized');
    }

    const startIdx = this.nextSentenceIndex;
    let endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    
    // If we don't have enough sentences and there's more content, process another chunk
    if (endIdx - startIdx < batchSize && this.hasMoreContent) {
      // Process another chunk - only save position if this isn't the initial load
      const newSentences = await this.processNextChunk(this.shouldSavePosition);
      
      // Recalculate the end index
      endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    }
    
    if (startIdx >= this.sentences.length) {
      return [];
    }
    
    // Get the batch of sentences
    const batch = this.sentences.slice(startIdx, endIdx);
    
    // Update our position
    this.nextSentenceIndex = endIdx;
    
    return batch;
  }

  // User actively advanced to next sentence - enable position saving
  enablePositionSaving() {
    this.shouldSavePosition = true;
  }

  // Check if there are more sentences available
  hasMoreSentences() {
    return this.isInitialized && (this.nextSentenceIndex < this.sentences.length || this.hasMoreContent);
  }

  // Get current progress information
  getProgress() {
    return {
      totalSentences: this.sentences.length,
      processedSentences: this.nextSentenceIndex,
      remainingSentences: Math.max(0, this.sentences.length - this.nextSentenceIndex),
      hasMoreContent: this.hasMoreContent,
      percentage: this.sentences.length > 0 
        ? Math.round((this.nextSentenceIndex / this.sentences.length) * 100) 
        : 0,
      bytePosition: this.processedTextOffset,
      anchorPosition: this.anchorPosition
    };
  }

  // Reset the pipe for a new book
  reset() {
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;
    this.anchorPosition = 0;
    this.processedTextOffset = 0;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.savedBookPosition = 0;
    this.shouldSavePosition = false;
  }
}

// Export a singleton instance
export default new BookPipe();