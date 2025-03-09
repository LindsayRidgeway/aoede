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
      
      console.log(`Initializing book pipe for: "${this.bookTitle}"`);
      console.log(`URL: ${this.bookUrl}`);
      
      // Fetch the book content
      await this.fetchBookContent();
      
      // Find the anchor position in the HTML
      await this.findAnchorPosition();
      
      // Process the first chunk of text
      await this.processNextChunk();
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
      if (this.isInitialized) {
        console.log(`Book pipe initialized with ${this.sentences.length} sentences initially`);
        return {
          title: this.bookTitle,
          language: this.bookLanguage,
          totalSentences: this.sentences.length
        };
      } else {
        throw new Error('Failed to extract any sentences from the book');
      }
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
              console.log(`Try ${retryCount + 1}: Using proxy: ${proxyUrl}`);
              
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
              console.log(`Try ${retryCount + 1}: Using no-cors mode as fallback`);
              
              // Note: This will result in an opaque response which can't be read directly,
              // but we'll at least show a different error message
              response = await fetch(this.bookUrl, { 
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 15000
              });
            }
          } else {
            // For native platforms, use direct fetch which shouldn't have CORS issues
            console.log(`Try ${retryCount + 1}: Direct fetching ${this.bookUrl}`);
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
          
          console.log(`Successfully fetched HTML, length: ${this.htmlContent.length} characters`);
          success = true;
        } catch (fetchError) {
          retryCount++;
          console.error(`Fetch attempt ${retryCount} failed: ${fetchError.message}`);
          
          // Wait a bit longer between retries
          if (retryCount < maxRetries) {
            const delay = 1000 * retryCount;
            console.log(`Waiting ${delay}ms before next attempt...`);
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
      console.error(`Error fetching book content: ${error.message}`);
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
        console.log(`Fragment ID in URL: #${fragmentId}`);
      } else {
        // No fragment ID, start from the beginning
        console.log('No fragment ID in URL, starting from the beginning');
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
      let matchPattern = null;
      
      // Try name attribute first (most common in older HTML like Gutenberg)
      const nameMatch = namePattern.exec(this.htmlContent);
      if (nameMatch) {
        match = nameMatch;
        matchPattern = "name attribute";
      }
      
      // Try id attribute if name didn't match
      if (!match) {
        const idMatch = idPattern.exec(this.htmlContent);
        if (idMatch) {
          match = idMatch;
          matchPattern = "id attribute";
        }
      }
      
      // Try any element with id if the above didn't match
      if (!match) {
        const elemMatch = elemIdPattern.exec(this.htmlContent);
        if (elemMatch) {
          match = elemMatch;
          matchPattern = "element id";
        }
      }
      
      if (match) {
        this.anchorPosition = match.index;
        console.log(`Found fragment #${fragmentId} using ${matchPattern} at position ${this.anchorPosition}`);
        
        // Look specifically for headings near the anchor to include as first content
        let titleText = '';
        
        // Search for headings after the anchor - common pattern in books
        const headingAfterAnchorPattern = new RegExp(`${match[0]}[\\s\\S]*?<h\\d[^>]*>([^<]+)</h\\d>`, 'i');
        const headingAfterMatch = headingAfterAnchorPattern.exec(this.htmlContent.substring(this.anchorPosition));
        
        if (headingAfterMatch && headingAfterMatch[1]) {
          titleText = headingAfterMatch[1].trim() + '. ';
          console.log(`Found title after anchor: "${titleText}"`);
          
          // Store this title to prepend to the first chunk
          this.titleText = titleText;
        }
      } else {
        // Try looking for a chapter heading
        console.log(`Fragment anchor not found directly, trying to find chapter heading`);
        
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
              
              console.log(`Found chapter heading: "${headingText}" at position ${this.anchorPosition}`);
              break;
            }
          }
        }
        
        // If still not found, use the beginning of the document after head
        if (this.anchorPosition === 0) {
          const bodyStart = this.htmlContent.indexOf('<body');
          if (bodyStart !== -1) {
            this.anchorPosition = bodyStart;
            console.log(`No specific anchor found, starting from body tag at position ${this.anchorPosition}`);
          } else {
            this.anchorPosition = 0;
            console.log(`No anchor found, starting from the beginning of the document`);
          }
        }
      }
    } catch (error) {
      console.error(`Error finding anchor position: ${error.message}`);
      // Default to start of document
      this.anchorPosition = 0;
    }
  }

  // Process the next chunk of HTML into sentences
  async processNextChunk() {
    if (!this.htmlContent) {
      console.log('No HTML content to process');
      this.hasMoreContent = false;
      return [];
    }
    
    try {
      // Calculate the end position for this chunk
      const chunkStart = this.anchorPosition + this.processedTextOffset;
      const chunkEnd = Math.min(chunkStart + this.chunkSize, this.htmlContent.length);
      
      // Check if we're at the end of the content
      if (chunkStart >= this.htmlContent.length || chunkStart >= chunkEnd) {
        console.log('Reached the end of the HTML content');
        this.hasMoreContent = false;
        return [];
      }
      
      console.log(`Processing chunk from position ${chunkStart} to ${chunkEnd} (${chunkEnd - chunkStart} chars)`);
      
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
      console.log(`Extracted ${newSentences.length} sentences from chunk`);
      
      // Add new sentences to our collection
      this.sentences = [...this.sentences, ...newSentences];
      
      // Update the processed offset
      this.processedTextOffset += (chunkEnd - chunkStart);
      
      // Return the new sentences
      return newSentences;
    } catch (error) {
      console.error(`Error processing chunk: ${error.message}`);
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
      console.error(`Error in extractText: ${error.message}`);
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
      console.log(`Only have ${endIdx - startIdx} sentences, need ${batchSize}. Processing more...`);
      
      // Process another chunk
      const newSentences = await this.processNextChunk();
      
      // Recalculate the end index
      endIdx = Math.min(startIdx + batchSize, this.sentences.length);
      
      console.log(`After processing more, now have ${endIdx - startIdx} sentences to return`);
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
        : 0
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
  }
}

// Export a singleton instance
export default new BookPipe();