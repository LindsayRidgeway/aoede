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
      
      console.log(`Initializing book pipe for: "${this.bookTitle}"`);
      console.log(`URL: ${this.bookUrl}`);
      
      // Fetch the book content
      await this.fetchBookContent();
      
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
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
            
            const proxyUrl = `${CORS_PROXY}${this.bookUrl}`;
            console.log(`Try ${retryCount + 1}: Using proxy URL: ${proxyUrl}`);
            
            response = await fetch(proxyUrl, { 
              method: 'GET',
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Cache-Control': 'no-cache'
              }
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
      this.allText = this.extractTextFromFragment(html);
      
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

  // Extract text starting from the fragment ID
  extractTextFromFragment(html) {
    if (!html) return '';
    
    try {
      // Parse the URL fragment (bookmark)
      let fragmentId = '';
      if (this.bookUrl.includes('#')) {
        fragmentId = this.bookUrl.split('#')[1];
        console.log(`Fragment ID in URL: #${fragmentId}`);
      } else {
        // No fragment ID, use the entire HTML
        return this.extractText(html);
      }
      
      // Find the fragment in the HTML using pure regex
      // Start with most common anchor patterns
      
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
      const nameMatch = namePattern.exec(html);
      if (nameMatch) {
        match = nameMatch;
        matchPattern = "name attribute";
      }
      
      // Try id attribute if name didn't match
      if (!match) {
        const idMatch = idPattern.exec(html);
        if (idMatch) {
          match = idMatch;
          matchPattern = "id attribute";
        }
      }
      
      // Try any element with id if the above didn't match
      if (!match) {
        const elemMatch = elemIdPattern.exec(html);
        if (elemMatch) {
          match = elemMatch;
          matchPattern = "element id";
        }
      }
      
      if (match) {
        console.log(`Found fragment #${fragmentId} using ${matchPattern} at position ${match.index}`);
        
        // Look specifically for headings near the anchor to include
        let titleText = '';
        
        // Search for headings after the anchor - common pattern in books
        const headingAfterAnchorPattern = new RegExp(`${match[0]}[\\s\\S]*?<h\\d[^>]*>([^<]+)</h\\d>`, 'i');
        const headingAfterMatch = headingAfterAnchorPattern.exec(html);
        
        if (headingAfterMatch && headingAfterMatch[1]) {
          titleText = headingAfterMatch[1].trim() + '. ';
          console.log(`Found title after anchor: "${titleText}"`);
        }
        
        // Also check for headings that contain the anchor
        const headingWithAnchorPattern = new RegExp(`<h\\d[^>]*>[^<]*?<a[^>]*?\\s(?:name|id)\\s*=\\s*["']?${fragmentId}["']?[^>]*?>[^<]*?</a>[^<]*?</h\\d>`, 'i');
        const headingWithAnchorMatch = headingWithAnchorPattern.exec(html);
        
        if (headingWithAnchorMatch && !titleText) {
          // Extract the heading text
          const headingText = headingWithAnchorMatch[0].replace(/<[^>]*>/g, ' ').trim() + '. ';
          titleText = headingText;
          console.log(`Found title containing anchor: "${titleText}"`);
        }
        
        // Get content from the match position onwards
        let contentAfterFragment = html.substring(match.index);
        
        // Prepend the title if we found one
        const extractedText = this.extractText(contentAfterFragment);
        
        // If we found a title but it's not already in the extracted text, prepend it
        if (titleText && !extractedText.startsWith(titleText)) {
          return titleText + extractedText;
        }
        
        return extractedText;
      }
      
      // Try looking for a chapter/section heading containing the fragment ID
      console.log(`Fragment anchor not found directly, trying to find chapter heading`);
      
      // Remove digits and "chap" prefix for numerical comparison
      const chapterNum = fragmentId.replace(/^\D+/g, '');
      
      // If we have a chapter number, look for the heading
      if (chapterNum && !isNaN(parseInt(chapterNum))) {
        const chapterHeadings = [
          new RegExp(`<h\\d[^>]*>\\s*Chapter\\s+${chapterNum}\\b[^<]*<\/h\\d>`, 'i'),
          new RegExp(`<h\\d[^>]*>\\s*CHAPTER\\s+${chapterNum}\\b[^<]*<\/h\\d>`, 'i'),
          new RegExp(`<h\\d[^>]*>\\s*${chapterNum}\\.\\s*[^<]*<\/h\\d>`, 'i'),
          new RegExp(`<h\\d[^>]*>\\s*[IVX]+\\.\\s*[^<]*<\/h\\d>`, 'i') // Roman numerals
        ];
        
        for (const pattern of chapterHeadings) {
          const headingMatch = pattern.exec(html);
          if (headingMatch) {
            // Get the heading text and prepend it to the content
            const headingText = headingMatch[0].replace(/<[^>]*>/g, ' ').trim() + '. ';
            console.log(`Found chapter heading: "${headingText}" at position ${headingMatch.index}`);
            
            const contentAfterHeading = html.substring(headingMatch.index);
            const extractedText = this.extractText(contentAfterHeading);
            
            // Ensure the heading is included at the beginning
            if (!extractedText.startsWith(headingText)) {
              return headingText + extractedText;
            }
            
            return extractedText;
          }
        }
      }
      
      // If all else fails, try searching for the text of the fragment near a heading
      const fragmentTextPattern = new RegExp(`<h\\d[^>]*>[^<]*?${fragmentId}[^<]*?<\/h\\d>`, 'i');
      const fragmentTextMatch = fragmentTextPattern.exec(html);
      if (fragmentTextMatch) {
        // Extract the heading text
        const headingText = fragmentTextMatch[0].replace(/<[^>]*>/g, ' ').trim() + '. ';
        console.log(`Found fragment text in heading: "${headingText}" at position ${fragmentTextMatch.index}`);
        
        const contentAfterText = html.substring(fragmentTextMatch.index);
        const extractedText = this.extractText(contentAfterText);
        
        // Ensure the heading is included
        if (!extractedText.startsWith(headingText)) {
          return headingText + extractedText;
        }
        
        return extractedText;
      }
      
      // Last resort: if the fragment is a file name (common in Gutenberg URLs), 
      // check for the first heading after the HTML head section
      if (fragmentId.match(/\.(html?|htm)$/i)) {
        const firstHeadingPattern = /<\/head>.*?(<h\d[^>]*>.*?<\/h\d>)/is;
        const firstHeadingMatch = firstHeadingPattern.exec(html);
        if (firstHeadingMatch && firstHeadingMatch[1]) {
          // Extract the heading text
          const headingText = firstHeadingMatch[1].replace(/<[^>]*>/g, ' ').trim() + '. ';
          console.log(`Found first heading after HTML head: "${headingText}"`);
          
          const headingIndex = html.indexOf(firstHeadingMatch[1]);
          const contentAfterHeading = html.substring(headingIndex);
          const extractedText = this.extractText(contentAfterHeading);
          
          // Ensure the heading is included
          if (!extractedText.startsWith(headingText)) {
            return headingText + extractedText;
          }
          
          return extractedText;
        }
      }
      
      console.log(`No fragment match found using any method, using whole document`);
      return this.extractText(html);
    } catch (error) {
      console.error(`Error extracting from fragment: ${error.message}`);
      // Fallback to entire document
      return this.extractText(html);
    }
  }
  
  // Extract readable text from HTML
  extractText(html) {
    try {
      // Remove head, script, and style sections
      html = html.replace(/<head[\s\S]*?<\/head>/gi, ' ');
      html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
      html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
      
      // Remove HTML comments
      html = html.replace(/<!--[\s\S]*?-->/g, ' ');
      
      // Remove navigation, header, footer sections if present
      html = html.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
      html = html.replace(/<header[\s\S]*?<\/header>/gi, ' ');
      html = html.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
      
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
      // Return original HTML with tags stripped as a last resort
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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