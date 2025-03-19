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
  }

  // Get original anchor position for a given fragment ID in HTML
  findOriginalAnchorPosition(html, fragmentId) {
    if (!html || !fragmentId) return -1;
    
    // Escape special regex characters in the fragment ID
    const escapedFragmentId = fragmentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern for the anchor element
    const anchorPattern = new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${escapedFragmentId}["']?[^>]*?>`, 'i');
    
    // Try to find the anchor in the HTML
    const match = anchorPattern.exec(html);
    
    if (match) {
      return match.index;
    }
    
    return -1;
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
      
      // Load saved reading position if available
      await this.loadReadingPosition();
      
      // Process the first chunk of text starting from the anchor position plus saved read position
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
          resumedFromPosition: this.currentReadPosition > 0
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

  // Load saved reading position from AsyncStorage
  async loadReadingPosition() {
    try {
      const storageKey = `book_reading_position_${this.bookId}`;
      const savedPosition = await AsyncStorage.getItem(storageKey);
      
      if (savedPosition) {
        this.currentReadPosition = parseInt(savedPosition, 10);
        // Ensure it's a valid number
        if (isNaN(this.currentReadPosition)) {
          this.currentReadPosition = 0;
        }
        console.log(`[BookPipe] Loaded saved position: ${this.currentReadPosition}`);
      } else {
        // Check for legacy storage format
        const legacyKey = `book_position_${this.bookId}`;
        const legacyPosition = await AsyncStorage.getItem(legacyKey);
        
        if (legacyPosition) {
          // Convert legacy position to new format
          this.currentReadPosition = parseInt(legacyPosition, 10);
          if (isNaN(this.currentReadPosition)) {
            this.currentReadPosition = 0;
          }
          
          // Save in new format and clean up legacy format
          await AsyncStorage.setItem(storageKey, this.currentReadPosition.toString());
          await AsyncStorage.removeItem(legacyKey);
          console.log(`[BookPipe] Converted legacy position: ${this.currentReadPosition}`);
        } else {
          this.currentReadPosition = 0;
          console.log(`[BookPipe] No saved position found, using 0`);
        }
      }
    } catch (error) {
      this.currentReadPosition = 0;
      console.log(`[BookPipe] Error loading position: ${error.message}`);
    }
  }

  // Save current reading position to AsyncStorage
  async saveReadingPosition() {
    if (!this.bookId || !this.shouldSavePosition) return;
    
    try {
      const storageKey = `book_reading_position_${this.bookId}`;
      await AsyncStorage.setItem(storageKey, this.currentReadPosition.toString());
      console.log(`[BookPipe] Saved position: ${this.currentReadPosition}`);
    } catch (error) {
      // Silent error handling
      console.log(`[BookPipe] Error saving position: ${error.message}`);
    }
  }

  // Reset book position to the beginning - complete bypass of the regular flow
  async resetBookPosition() {
    if (!this.bookId) return false;
    
    try {
      console.log(`[BookPipe] Rewinding book ID: ${this.bookId}`);
      
      // Get the current book information before resetting
      const currentBookId = this.bookId;
      const bookSource = getBookSourceById(currentBookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${this.bookId} not found`);
      }
      
      const bookUrl = bookSource.url;
      
      // 1. Clear the storage positions
      const storageKey = `book_reading_position_${currentBookId}`;
      await AsyncStorage.removeItem(storageKey);
      
      const legacyKey = `book_position_${currentBookId}`;
      await AsyncStorage.removeItem(legacyKey);
      
      console.log(`[BookPipe] Cleared storage positions`);
      
      // 2. Bypass the pipe and fetch the content directly
      console.log(`[BookPipe] Fetching fresh content from: ${bookUrl}`);
      let freshHtmlContent = null;
      
      // List of CORS proxies to try
      const corsProxies = [
        `${CORS_PROXY}`, // Use the configured CORS proxy first
        'https://corsproxy.io/?', // Alternative proxy 1
        'https://api.allorigins.win/raw?url=', // Alternative proxy 2
        'https://proxy.cors.sh/' // Alternative proxy 3
      ];
      
      let response = null;
      let fetchSuccess = false;
      
      // Try each proxy until one works
      for (const proxy of corsProxies) {
        if (fetchSuccess) break;
        
        try {
          // Ensure URL is properly encoded if using a proxy that requires it
          let targetUrl = bookUrl;
          if (proxy.includes('?url=')) {
            targetUrl = encodeURIComponent(bookUrl);
          }
          
          const proxyUrl = `${proxy}${targetUrl}`;
          console.log(`[BookPipe] Trying proxy: ${proxy}`);
          
          response = await fetch(proxyUrl, { 
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            cache: 'no-store'
          });
          
          if (response.ok) {
            freshHtmlContent = await response.text();
            fetchSuccess = true;
            console.log(`[BookPipe] Successfully fetched fresh content (${freshHtmlContent.length} bytes)`);
          }
        } catch (error) {
          console.log(`[BookPipe] Proxy fetch error: ${error.message}`);
        }
      }
      
      if (!freshHtmlContent) {
        throw new Error('Could not fetch fresh content for rewinding');
      }
      
      // 3. Find the anchor directly in the fresh content
      const fragmentId = bookUrl.includes('#') ? bookUrl.split('#')[1] : '';
      if (!fragmentId) {
        throw new Error('URL does not contain an anchor fragment');
      }
      
      const anchorPosition = this.findOriginalAnchorPosition(freshHtmlContent, fragmentId);
      
      if (anchorPosition === -1) {
        throw new Error(`Could not find anchor "#${fragmentId}" in content`);
      }
      
      console.log(`[BookPipe] Found anchor at position: ${anchorPosition}`);
      
      // 4. Extract a chunk of text from anchor position
      const chunkEnd = Math.min(anchorPosition + this.chunkSize, freshHtmlContent.length);
      const htmlChunk = freshHtmlContent.substring(anchorPosition, chunkEnd);
      
      // 5. Process text and extract sentences
      const textChunk = this.extractText(htmlChunk);
      const newSentences = parseIntoSentences(textChunk);
      
      console.log(`[BookPipe] Extracted ${newSentences.length} sentences from anchor`);
      
      if (newSentences.length > 0) {
        console.log(`[BookPipe] First sentence: "${newSentences[0]}"`);
      }
      
      // 6. Complete refresh of the pipe state
      this.reset();
      
      // 7. Set up the pipe with fresh state
      this.bookId = currentBookId;
      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookUrl;
      this.htmlContent = freshHtmlContent;
      this.anchorPosition = anchorPosition;
      this.currentReadPosition = 0;
      this.sentences = newSentences;
      this.nextSentenceIndex = 0;
      this.isInitialized = newSentences.length > 0;
      this.hasMoreContent = true;
      
      return newSentences.length > 0;
    } catch (error) {
      console.log(`[BookPipe] Rewind error: ${error.message}`);
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
      
      // Add cache-busting query parameter
      let targetUrl = this.bookUrl;
      if (targetUrl.includes('?')) {
        targetUrl += `&_cb=${Date.now()}`;
      } else if (targetUrl.includes('#')) {
        const [urlBase, fragment] = targetUrl.split('#');
        targetUrl = `${urlBase}?_cb=${Date.now()}#${fragment}`;
      } else {
        targetUrl += `?_cb=${Date.now()}`;
      }
      
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
              let proxyTargetUrl = targetUrl;
              if (currentProxy.includes('?url=')) {
                proxyTargetUrl = encodeURIComponent(targetUrl);
              }
              
              const proxyUrl = `${currentProxy}${proxyTargetUrl}`;
              console.log(`[BookPipe] Using proxy: ${currentProxy}`);
              
              response = await fetch(proxyUrl, { 
                method: 'GET',
                mode: 'cors',
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                cache: 'no-store',
                timeout: 15000 // 15 second timeout
              });
            } else {
              // If no proxy is available or they all failed, try a no-cors request as last resort
              response = await fetch(targetUrl, { 
                method: 'GET',
                mode: 'no-cors',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                cache: 'no-store',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
            response = await fetch(targetUrl, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              cache: 'no-store'
            });
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
          console.log(`[BookPipe] Successfully fetched content (${this.htmlContent.length} bytes)`);
        } catch (fetchError) {
          retryCount++;
          console.log(`[BookPipe] Fetch attempt ${retryCount} failed: ${fetchError.message}`);
          
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
        console.log(`[BookPipe] Found fragment ID: ${fragmentId}`);
      } else {
        // No fragment ID, we don't have a specific anchor to find
        this.sentences = ["Unable to find the beginning of the text. URL has no anchor."];
        throw new Error('URL does not contain an anchor fragment');
      }
      
      const anchorPosition = this.findOriginalAnchorPosition(this.htmlContent, fragmentId);
      
      if (anchorPosition !== -1) {
        this.anchorPosition = anchorPosition;
        console.log(`[BookPipe] Found anchor at position ${this.anchorPosition}`);
        
        // Log a snippet of context
        const snippetStart = Math.max(0, this.anchorPosition - 50);
        const snippetEnd = Math.min(this.htmlContent.length, this.anchorPosition + 150);
        const snippet = this.htmlContent.substring(snippetStart, snippetEnd).replace(/\s+/g, ' ');
        console.log(`[BookPipe] Context around match: ${snippet}`);
      } else {
        // We couldn't find the anchor - alert the user with a clear message
        this.sentences = [`Unable to find the beginning of the text. Anchor "#${fragmentId}" not found.`];
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
      
      if (newSentences.length > 0) {
        console.log(`[BookPipe] First sentence: ${newSentences[0]}`);
      }
      
      // Add new sentences to our collection
      this.sentences = [...this.sentences, ...newSentences];
      
      // Update the current read position
      const chunkSize = chunkEnd - chunkStart;
      this.currentReadPosition += chunkSize;
      
      // Only save position if instructed to (e.g., after user clicks Next)
      if (shouldSave) {
        this.shouldSavePosition = true; // Now it's ok to save position
        await this.saveReadingPosition();
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
      
      // Remove tables, they often contain distracting information
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
      bytePosition: this.currentReadPosition,
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
    this.currentReadPosition = 0;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
  }
}

// Export a singleton instance
export default new BookPipe();