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
      let maxRetries = 3;
      let retryCount = 0;
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          // Use proxy for web to avoid CORS issues, direct fetch for native
          if (Platform.OS === 'web') {
            // If we've tried once with the CORS proxy already, try again with a slight delay
            if (retryCount > 0 && CORS_PROXY) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
            
            const proxyUrl = `${CORS_PROXY}${this.bookUrl}`;
            console.log(`Try ${retryCount + 1}: Using proxy URL: ${proxyUrl}`);
            response = await fetch(proxyUrl, { 
              method: 'GET',
              mode: 'cors',
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Cache-Control': 'no-cache'
              },
              timeout: 10000 // 10 second timeout
            });
          } else {
            // For native platforms, just use direct fetch
            console.log(`Try ${retryCount + 1}: Fetching ${this.bookUrl}`);
            response = await fetch(this.bookUrl);
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          
          success = true;
        } catch (fetchError) {
          retryCount++;
          console.error(`Fetch attempt ${retryCount} failed: ${fetchError.message}`);
          
          if (retryCount >= maxRetries) {
            throw fetchError;
          }
        }
      }
      
      if (!success) {
        throw new Error(`Failed to fetch book content after ${maxRetries} attempts`);
      }

      const html = await response.text();
      console.log(`Successfully fetched HTML content, length: ${html.length} characters`);
      
      this.allText = this.extractTextFromHtml(html);
      console.log(`Extracted text content, length: ${this.allText.length} characters`);
      
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
      
      // Remove script, style, head, header, footer, nav, and other non-content elements
      const elementsToRemove = [
        'script', 'style', 'head', 'header', 'footer', 'nav', 'aside', 'noscript',
        'iframe', 'form', 'button', 'input', 'select', 'option', 'textarea', 'meta'
      ];
      
      elementsToRemove.forEach(tagName => {
        const elements = tempDiv.getElementsByTagName(tagName);
        for (let i = elements.length - 1; i >= 0; i--) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      });
      
      // Remove Project Gutenberg headers and footers that contain metadata
      const divsToCheck = tempDiv.querySelectorAll('div, p');
      for (let i = 0; i < divsToCheck.length; i++) {
        const content = divsToCheck[i].textContent || '';
        // Remove typical Gutenberg header/footer sections
        if (content.includes('Project Gutenberg') || 
            content.includes('This eBook is for the use of') ||
            content.includes('Produced by') ||
            content.includes('www.gutenberg.org') ||
            content.includes('This file was produced by') ||
            content.includes('Transcriber\'s Note') ||
            content.includes('START OF THIS PROJECT GUTENBERG') ||
            content.includes('END OF THIS PROJECT GUTENBERG')) {
          divsToCheck[i].parentNode.removeChild(divsToCheck[i]);
        }
      }
      
      // Handle special case for Gutenberg books
      // Most URLs have an anchor to the first chapter, try to find content after that
      const bookUrl = this.bookUrl;
      let contentElement = null;
      
      if (bookUrl && bookUrl.includes('#')) {
        const anchorId = bookUrl.split('#')[1];
        if (anchorId) {
          // Try to find the element with the specified ID
          const anchorElement = tempDiv.getElementById(anchorId);
          
          if (anchorElement) {
            console.log(`Found anchor element with ID ${anchorId}`);
            
            // For Project Gutenberg: look for the chapter content - typically in a div or p after the anchor
            // We'll try to find the closest logical container for chapter content
            contentElement = anchorElement;
            
            // If it's just an anchor, we need to move to the content that follows
            if (anchorElement.tagName === 'A' || anchorElement.children.length === 0) {
              // Find the chapter container (usually a parent div or the next sibling)
              if (anchorElement.parentNode && 
                  (anchorElement.parentNode.tagName === 'DIV' || 
                   anchorElement.parentNode.tagName === 'SECTION')) {
                contentElement = anchorElement.parentNode;
              } else {
                // If not in a proper container, get the next n paragraphs
                contentElement = tempDiv;
                
                // Start from the anchor and collect the content that follows
                let currentNode = anchorElement;
                let chapterContent = document.createElement('div');
                
                // Find the chapter title node and all subsequent nodes until a new chapter
                while (currentNode && currentNode.nextSibling) {
                  currentNode = currentNode.nextSibling;
                  
                  // Check if this is a new chapter marker
                  if (currentNode.id && currentNode.id !== anchorId) {
                    break;
                  }
                  
                  // Add to our content collection if it's actual content
                  if (currentNode.nodeType === 1) { // Element node
                    chapterContent.appendChild(currentNode.cloneNode(true));
                  }
                }
                
                if (chapterContent.children.length > 0) {
                  contentElement = chapterContent;
                }
              }
            }
          }
        }
      }
      
      // If we couldn't find specific content, try to identify the main content area
      if (!contentElement) {
        // Try common main content containers
        const mainContent = tempDiv.querySelector('main') || 
                            tempDiv.querySelector('#content') || 
                            tempDiv.querySelector('.content') ||
                            tempDiv.querySelector('article');
                            
        if (mainContent) {
          contentElement = mainContent;
        } else {
          // Fallback to the entire body, excluding typical non-content areas
          contentElement = tempDiv;
        }
      }
      
      // Get the text content from the identified element
      let text = contentElement ? (contentElement.textContent || contentElement.innerText || '') : '';
      
      // Clean up the text
      text = text
        // Replace newlines with spaces
        .replace(/\n/g, ' ')
        // Remove excess whitespace
        .replace(/\s+/g, ' ')
        // Remove non-printable characters
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F]/g, ' ')
        // Replace multiple spaces with a single space
        .replace(/\s+/g, ' ')
        .trim();
      
      // Split text into segments by periods and filter out common Gutenberg header/footer lines
      const segments = text.split('.');
      const filteredSegments = segments.filter(segment => {
        const trimmed = segment.trim();
        return trimmed.length > 0 && 
               !trimmed.includes('Project Gutenberg') && 
               !trimmed.includes('www.gutenberg.org') &&
               !trimmed.includes('START OF THIS PROJECT') &&
               !trimmed.includes('END OF THIS PROJECT') &&
               !trimmed.includes('Produced by') &&
               !trimmed.includes('file was produced by');
      });
      
      // Rejoin filtered segments
      const cleanedText = filteredSegments.join('.').trim();
      
      // Only take content after any remaining bookkeeping/header material
      // Most content starts with chapter designations or proper paragraphs
      let startIndex = 0;
      const contentMarkers = [
        'CHAPTER', 'Chapter', 'BOOK', 'Book', 'PART', 'Part', 
        'VOLUME', 'Volume', 'I.', 'II.', 'III.', 'IV.'
      ];
      
      for (const marker of contentMarkers) {
        const index = cleanedText.indexOf(marker);
        if (index > 0) {
          startIndex = Math.max(startIndex, index);
        }
      }
      
      const finalText = cleanedText.substring(startIndex);
      
      return finalText || cleanedText || text;
    } catch (error) {
      console.error(`Error extracting text from HTML: ${error.message}`);
      // Return an empty string rather than potentially broken HTML
      return '';
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