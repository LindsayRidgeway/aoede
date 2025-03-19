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
    this.currentReadPosition = 0; // Current reading position relative to anchor
    this.chunkSize = 50000;      // Size of text chunks to process at once
    this.sentences = [];         // Processed sentences
    this.nextSentenceIndex = 0;  // Current position in sentences array
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;  // Flag to indicate if there's more content to process
    this.shouldSavePosition = false; // Flag to prevent auto-saving position when just loading
    this.debugMode = true;       // Enable debug logging
  }

  // Debug logging helper
  log(message) {
    if (this.debugMode) {
      console.log(`[BookPipe] ${message}`);
    }
  }

  // Initialize the pipe with a book ID
  async initialize(bookId) {
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    this.log(`Initializing book ID: ${bookId}`);
    this.reset();
    this.bookId = bookId;
    this.isLoading = true;
    this.shouldSavePosition = false; // Don't save position on initial load
    this.log(`After reset: currentReadPosition=${this.currentReadPosition}, shouldSavePosition=${this.shouldSavePosition}`);

    try {
      const bookSource = getBookSourceById(bookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      this.log(`Book info: title="${this.bookTitle}", language=${this.bookLanguage}, url=${this.bookUrl}`);
      
      // Fetch the book content
      await this.fetchBookContent();
      
      // Find the anchor position in the HTML
      await this.findAnchorPosition();
      this.log(`Found anchor at position: ${this.anchorPosition}`);
      
      // Load saved reading position if available
      await this.loadReadingPosition();
      this.log(`After loading position: currentReadPosition=${this.currentReadPosition}`);
      
      // Process the first chunk of text starting from the anchor position plus saved read position
      await this.processNextChunk(false); // Do not save position when loading
      this.log(`After processing first chunk: ${this.sentences.length} sentences, currentReadPosition=${this.currentReadPosition}`);
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
      // Always start from the first sentence in the current chunk
      this.nextSentenceIndex = 0;
      
      if (this.isInitialized) {
        return {
          title: this.bookTitle,
          language: this.bookLanguage,
          totalSentences: this.sentences.length,
          resumedFromPosition: this.currentReadPosition > 0
        };
      } else {
        throw new Error('Failed to extract any sentences from the book');
      }
    } catch (error) {
      this.error = error.message;
      this.log(`Initialization error: ${error.message}`);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Load saved reading position from AsyncStorage
  async loadReadingPosition() {
    try {
      const storageKey = `book_reading_position_${this.bookId}`;
      this.log(`Loading position for key: ${storageKey}`);
      
      const savedPosition = await AsyncStorage.getItem(storageKey);
      
      if (savedPosition) {
        this.log(`Found saved position: ${savedPosition}`);
        this.currentReadPosition = parseInt(savedPosition, 10);
        // Ensure it's a valid number
        if (isNaN(this.currentReadPosition)) {
          this.log(`Saved position is not a valid number, resetting to 0`);
          this.currentReadPosition = 0;
        }
      } else {
        this.log(`No saved position found for storage key: ${storageKey}`);
        
        // Check for legacy storage format
        const legacyKey = `book_position_${this.bookId}`;
        this.log(`Checking legacy key: ${legacyKey}`);
        const legacyPosition = await AsyncStorage.getItem(legacyKey);
        
        if (legacyPosition) {
          this.log(`Found legacy position: ${legacyPosition}`);
          // Convert legacy position to new format
          this.currentReadPosition = parseInt(legacyPosition, 10);
          if (isNaN(this.currentReadPosition)) {
            this.log(`Legacy position is not a valid number, resetting to 0`);
            this.currentReadPosition = 0;
          }
          
          // Save in new format and clean up legacy format
          await AsyncStorage.setItem(storageKey, this.currentReadPosition.toString());
          this.log(`Saved legacy position to new format: ${this.currentReadPosition}`);
          await AsyncStorage.removeItem(legacyKey);
          this.log(`Removed legacy storage key`);
        } else {
          this.log(`No legacy position found, setting currentReadPosition to 0`);
          this.currentReadPosition = 0;
        }
      }
      
      this.log(`Final currentReadPosition after loading: ${this.currentReadPosition}`);
    } catch (error) {
      this.log(`Error loading position: ${error.message}`);
      this.currentReadPosition = 0;
    }
  }

  // Save current reading position to AsyncStorage
  async saveReadingPosition() {
    if (!this.bookId) {
      this.log(`Cannot save position: bookId is null`);
      return;
    }
    
    if (!this.shouldSavePosition) {
      this.log(`Not saving position because shouldSavePosition=${this.shouldSavePosition}`);
      return;
    }
    
    try {
      const storageKey = `book_reading_position_${this.bookId}`;
      this.log(`Saving position ${this.currentReadPosition} to key: ${storageKey}`);
      
      await AsyncStorage.setItem(storageKey, this.currentReadPosition.toString());
      this.log(`Successfully saved position ${this.currentReadPosition}`);
      
      // Verify what we saved
      const verification = await AsyncStorage.getItem(storageKey);
      this.log(`Verification - read back saved position: ${verification}`);
    } catch (error) {
      this.log(`Error saving position: ${error.message}`);
    }
  }

  // Full reset that mimics creating a new object instance
  thorough_reset() {
    // Save what we need to keep
    const bookId = this.bookId;
    
    this.log(`Performing thorough reset, current bookId: ${bookId}`);
    
    // Reset EVERYTHING to initial values
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;
    this.anchorPosition = 0;
    this.currentReadPosition = 0;
    this.chunkSize = 50000;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
    
    // Don't reset debug mode
    
    this.log(`After thorough reset: currentReadPosition=${this.currentReadPosition}, shouldSavePosition=${this.shouldSavePosition}`);
    
    return bookId;
  }

  // Reset book position to the beginning - explicit command to the singleton
  async resetBookPosition() {
    if (!this.bookId) return false;
    
    try {
      // Remember current book ID
      const currentBookId = this.bookId;
      this.log(`Resetting book position for: ${currentBookId}`);
      
      // 1. Delete ALL storage for this book - both formats
      const storageKey = `book_reading_position_${currentBookId}`;
      this.log(`Removing storage key: ${storageKey}`);
      await AsyncStorage.removeItem(storageKey);
      
      const legacyKey = `book_position_${currentBookId}`;
      this.log(`Removing legacy key: ${legacyKey}`);
      await AsyncStorage.removeItem(legacyKey);
      
      // Other book tracker info
      const trackerKey = `book_tracker_${currentBookId}`;
      this.log(`Removing tracker key: ${trackerKey}`);
      await AsyncStorage.removeItem(trackerKey);
      
      // 2. Full reset - return the singleton to its initial state
      this.thorough_reset();
      
      // 3. Now rebuild from scratch with forced zero offset
      this.bookId = currentBookId;
      this.isLoading = true;
      this.shouldSavePosition = false;
      this.log(`After reset, starting rebuild: bookId=${this.bookId}, currentReadPosition=${this.currentReadPosition}`);
      
      // 4. Get book information
      const bookSource = getBookSourceById(currentBookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${currentBookId} not found`);
      }
      
      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      this.log(`Rebuilt book info: title="${this.bookTitle}", language=${this.bookLanguage}, url=${this.bookUrl}`);
      
      // 5. Fetch fresh content with no caching
      await this.fetchContentWithNoCaching();
      
      // 6. Find the anchor directly - do not use saved info
      await this.findAnchorPosition();
      this.log(`Found anchor at position: ${this.anchorPosition}`);
      
      // 7. Force reading position to zero - do not load from storage
      this.currentReadPosition = 0;
      this.log(`Forced currentReadPosition to 0`);
      
      // 8. Process the first chunk
      await this.processNextChunk(false);
      this.log(`After processing chunk: ${this.sentences.length} sentences, currentReadPosition=${this.currentReadPosition}`);
      
      // 9. If we got sentences, we're initialized
      this.isInitialized = this.sentences.length > 0;
      this.nextSentenceIndex = 0;
      this.isLoading = false;
      
      return this.sentences.length > 0;
    } catch (error) {
      this.log(`Error during reset: ${error.message}`);
      return false;
    }
  }
  
  // Special fetch that ensures no caching
  async fetchContentWithNoCaching() {
    if (!this.bookUrl) {
      throw new Error('Book URL is not set');
    }
    
    this.log(`Fetching content with no caching from: ${this.bookUrl}`);
    
    // Add a unique cache-busting parameter
    let targetUrl = this.bookUrl;
    if (targetUrl.includes('?')) {
      targetUrl = `${targetUrl}&_=${Date.now()}`;
    } else if (targetUrl.includes('#')) {
      const [baseUrl, fragment] = targetUrl.split('#');
      targetUrl = `${baseUrl}?_=${Date.now()}#${fragment}`;
    } else {
      targetUrl = `${targetUrl}?_=${Date.now()}`;
    }
    
    this.log(`Using cache-busted URL: ${targetUrl}`);
    
    // Clear HTML content first to ensure a fresh start
    this.htmlContent = null;
    
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
        this.log(`Trying proxy: ${proxy}`);
        
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
          this.htmlContent = await response.text();
          
          if (this.htmlContent && this.htmlContent.length >= 1000) {
            this.log(`Successfully fetched content: ${this.htmlContent.length} bytes`);
            return; // Success, exit the function
          }
        }
      } catch (error) {
        this.log(`Fetch error with proxy ${proxy}: ${error.message}`);
        // Try next proxy
      }
    }
    
    // If we reach here, all proxies failed
    throw new Error('Failed to fetch book content with fresh request');
  }

  // Fetch book content from the URL
  async fetchBookContent() {
    if (!this.bookUrl) {
      throw new Error('Book URL is not set');
    }

    this.log(`Fetching book content from: ${this.bookUrl}`);

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
              this.log(`Using proxy: ${currentProxy}`);
              
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
              this.log(`No proxy available, trying no-cors request`);
              response = await fetch(this.bookUrl, { 
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
            this.log(`Using direct fetch for native platform`);
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
          this.log(`Successfully fetched content: ${this.htmlContent.length} bytes`);
        } catch (fetchError) {
          retryCount++;
          this.log(`Fetch attempt ${retryCount} failed: ${fetchError.message}`);
          
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
      this.log(`Fatal fetch error: ${error.message}`);
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
        this.log(`Found fragment ID: ${fragmentId}`);
      } else {
        // No fragment ID, we don't have a specific anchor to find
        this.sentences = ["Unable to find the beginning of the text. URL has no anchor."];
        throw new Error('URL does not contain an anchor fragment');
      }
      
      // Look for anchor element patterns
      const anchorPatterns = [
        // Pattern 1: <a name="i"> - classic HTML anchor
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>((?!</a>).)*</a>`, 'i'),
        
        // Pattern 2: <a name="i" - with any attributes after
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i'),
        
        // Pattern 3: <element id="i"> - any element with matching ID
        new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i')
      ];
      
      // Try each pattern
      let match = null;
      let patternIndex = -1;
      
      for (let i = 0; i < anchorPatterns.length; i++) {
        match = anchorPatterns[i].exec(this.htmlContent);
        if (match) {
          patternIndex = i;
          break;
        }
      }
      
      if (match) {
        this.anchorPosition = match.index;
        this.log(`Found anchor using pattern ${patternIndex + 1} at position ${match.index}`);
        
        // Log surrounding context for debugging
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(this.htmlContent.length, match.index + 150);
        const context = this.htmlContent.substring(contextStart, contextEnd);
        this.log(`Context around anchor: ${context.replace(/\s+/g, ' ')}`);
      } else {
        // We couldn't find the anchor - clear state
        this.sentences = [`Unable to find the beginning of the text. Anchor "#${fragmentId}" not found.`];
        this.log(`Could not find anchor "#${fragmentId}" in HTML content`);
        throw new Error(`Anchor "#${fragmentId}" not found in HTML content`);
      }
    } catch (error) {
      // Error already handled by setting this.sentences
      throw error;
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
      const chunkStart = this.anchorPosition + this.currentReadPosition;
      const chunkEnd = Math.min(chunkStart + this.chunkSize, this.htmlContent.length);
      
      this.log(`Processing chunk from ${chunkStart} to ${chunkEnd}, shouldSave=${shouldSave}`);
      
      // Check if we're at the end of the content
      if (chunkStart >= this.htmlContent.length || chunkStart >= chunkEnd) {
        this.hasMoreContent = false;
        this.log(`Reached end of content`);
        return [];
      }
      
      // Extract the chunk of HTML
      const htmlChunk = this.htmlContent.substring(chunkStart, chunkEnd);
      
      // Extract text from this HTML chunk
      let textChunk = this.extractText(htmlChunk);
      
      // Parse the text into sentences
      const newSentences = parseIntoSentences(textChunk);
      this.log(`Extracted ${newSentences.length} sentences from chunk`);
      
      if (newSentences.length > 0) {
        this.log(`First sentence: "${newSentences[0].substring(0, 30)}..."`);
      }
      
      // Add new sentences to our collection
      this.sentences = [...this.sentences, ...newSentences];
      
      // Update the current read position
      const chunkSize = chunkEnd - chunkStart;
      this.currentReadPosition += chunkSize;
      this.log(`Updated currentReadPosition to ${this.currentReadPosition}`);
      
      // Only save position if instructed to (e.g., after user clicks Next)
      if (shouldSave) {
        this.shouldSavePosition = true; // Now it's ok to save position
        this.log(`Setting shouldSavePosition=true`);
        await this.saveReadingPosition();
      } else {
        this.log(`Not saving position (shouldSave=${shouldSave})`);
      }
      
      // Return the new sentences
      return newSentences;
    } catch (error) {
      this.log(`Error processing chunk: ${error.message}`);
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
      
      // Remove table elements - often contain TOC or other navigation
      html = html.replace(/<table\b[^<]*(?:(?!<\/table>)<[^<]*)*<\/table>/gi, ' ');
      
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
                .replace(/&#39;/g, "'")
                .replace(/&ldquo;/g, '"')
                .replace(/&rdquo;/g, '"')
                .replace(/&lsquo;/g, "'")
                .replace(/&rsquo;/g, "'")
                .replace(/&mdash;/g, '-')
                .replace(/&ndash;/g, '-');
      
      // Handle numeric entities
      text = text.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
      });
      
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
      this.log(`Error extracting text: ${error.message}`);
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
    
    this.log(`Getting next batch: startIdx=${startIdx}, endIdx=${endIdx}, totalSentences=${this.sentences.length}`);
    
    // If we don't have enough sentences and there's more content, process another chunk
    if (endIdx - startIdx < batchSize && this.hasMoreContent) {
      this.log(`Need more sentences, processing another chunk (have ${endIdx - startIdx}, need ${batchSize})`);
      // Process another chunk - only save position if this isn't the initial load
      const newSentences = await this.processNextChunk(this.shouldSavePosition);
      
      // Recalculate the end index
      endIdx = Math.min(startIdx + batchSize, this.sentences.length);
      this.log(`After processing chunk: endIdx=${endIdx}, totalSentences=${this.sentences.length}`);
    }
    
    if (startIdx >= this.sentences.length) {
      this.log(`No more sentences available (startIdx=${startIdx} >= totalSentences=${this.sentences.length})`);
      return [];
    }
    
    // Get the batch of sentences
    const batch = this.sentences.slice(startIdx, endIdx);
    
    // Update our position
    this.nextSentenceIndex = endIdx;
    this.log(`Updated nextSentenceIndex to ${this.nextSentenceIndex}`);
    
    return batch;
  }

  // User actively advanced to next sentence - enable position saving
  enablePositionSaving() {
    const oldValue = this.shouldSavePosition;
    this.shouldSavePosition = true;
    this.log(`enablePositionSaving called: shouldSavePosition changed from ${oldValue} to ${this.shouldSavePosition}`);
  }

  // Check if there are more sentences available
  hasMoreSentences() {
    const hasMore = this.isInitialized && (this.nextSentenceIndex < this.sentences.length || this.hasMoreContent);
    this.log(`hasMoreSentences called: ${hasMore} (nextSentenceIndex=${this.nextSentenceIndex}, totalSentences=${this.sentences.length}, hasMoreContent=${this.hasMoreContent})`);
    return hasMore;
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
      bytePosition: this.currentReadPosition,
      anchorPosition: this.anchorPosition
    };
  }

  // Reset the pipe for a new book - basic version, not thorough
  reset() {
    this.log(`Basic reset called`);
    // Note: This is not a thorough reset - see thorough_reset for that
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;
    this.anchorPosition = 0;
    this.currentReadPosition = 0;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false