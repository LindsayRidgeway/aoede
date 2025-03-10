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
    this.processedTextOffset = 0; // How much text we've processed so far
    this.chunkSize = 50000;      // Size of text chunks to process at once
    this.sentences = [];         // Processed sentences
    this.nextSentenceIndex = 0;  // Current position in sentences array
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;  // Flag to indicate if there's more content to process
    this.savedBookPosition = 0;  // Position in the book where we last saved progress
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
      await this.fetchBookContent();
      
      // Find the anchor position in the HTML
      await this.findAnchorPosition();
      
      // Retrieve saved position from storage
      await this.loadSavedPosition();
      
      // If we have a saved position, apply it
      if (this.savedBookPosition > 0) {
        this.processedTextOffset = this.savedBookPosition;
      }
      
      // Process the first chunk of text
      await this.processNextChunk();
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
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
    if (!this.bookId) return;
    
    try {
      const storageKey = `book_position_${this.bookId}`;
      const currentPosition = this.anchorPosition + this.processedTextOffset;
      
      // Save the position only if it's greater than what we've saved before
      if (currentPosition > this.savedBookPosition) {
        await AsyncStorage.setItem(storageKey, currentPosition.toString());
        this.savedBookPosition = currentPosition;
      }
    } catch (error) {
      // Silent error handling
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
        
        // Look specifically for headings near the anchor to include as first content
        let titleText = '';
        
        // Search for headings after the anchor - common pattern in books
        const headingAfterAnchorPattern = new RegExp(`${match[0]}[\\s\\S]*?<h\\d[^>]*>([^<]+)</h\\d>`, 'i');
        const headingAfterMatch = headingAfterAnchorPattern.exec(this.htmlContent.substring(this.anchorPosition));
        
        if (headingAfterMatch && headingAfterMatch[1]) {
          titleText = headingAfterMatch[1].trim() + '. ';
          
          // Store this title to prepend to the first chunk
          this.titleText = titleText;
        }
      } else {
        // Try looking for a chapter heading
        // Remove digits and "chap" prefix for numerical comparison
        const chapterNum = fragmentId.replace(/^\D+/g, '');
        
        // If we have a chapter number, look for the heading
        if (chapterNum && !isNaN(parseInt(chapterNum))) {
          const chapterHeadings = [
            new RegExp(`<h\\d[^>]*>\\s*Chapter\\s+${chapterNum}\\b[^<]*<\/h\\d>`, 'i'),
            new RegExp(`<h\\d[^>]*>\\s*CHAPTER\\s+${chapterNum}\\b[^<]*<\/h\\d>`, 'i'),
            new RegExp(`<h\\d[^>]*>\\s*${chapterNum}\\.\\s*[^<]*<\/h\\d>`, 'i')
          ];
          
          for (const pattern of chapterHeadings) {
            const headingMatch = pattern.exec(this.htmlContent);
            if (headingMatch) {
              this.anchorPosition = headingMatch.index;
              
              // Extract heading text
              const headingText = headingMatch[0].replace(/<[^>]*>/g, ' ').trim() + '. ';
              this.titleText = headingText;
              
              break;
            }
          }
        }
        
        // If still not found, use the beginning of the document after head
        if (this.anchorPosition === 0) {
          const bodyStart = this.htmlContent.indexOf('<body');
          if (bodyStart !== -1) {
            this.anchorPosition = bodyStart;
          } else {
            this.anchorPosition = 0;
          }
        }
      }
    } catch (error) {
      // Default to start of document
      this.anchorPosition = 0;
    }
  }

  // Process the next chunk of HTML into sentences
  async processNextChunk() {
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
      
      // For the first chunk, prepend the title if we found one
      if (this.processedTextOffset === 0 && this.titleText) {
        textChunk = this.titleText + textChunk;
      }
      
      // Parse the text into sentences
      const newSentences = parseIntoSentences(textChunk);
      
      // Add new sentences to our collection
      this.sentences = [...this.sentences, ...newSentences];
      
      // Update the processed offset
      this.processedTextOffset += (chunkEnd - chunkStart);
      
      // Save the new position
      await this.saveCurrentPosition();
      
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
      
      // Remove all remaining HTML tags
      let text = html.replace(/<[^>]*>/g, ' ');
      
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
      
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      
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
      // Process another chunk
      const newSentences = await this.processNextChunk();
      
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
      bytePosition: this.anchorPosition + this.processedTextOffset
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
    this.titleText = null;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.savedBookPosition = 0;
  }
}

// Export a singleton instance
export default new BookPipe();