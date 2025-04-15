// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, getSL, getUL } from './apiServices';
import { detectLanguageCode } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import BookPipe from './bookPipeCore';
import { Platform } from 'react-native';

// Constants
const BUFFER_SIZE = 100000; // 100K buffer size

class BookReader {
  constructor() {
    // Tracker structure
    this.tracker = {
      studyLanguage: null,
      bookTitle: null,
      offset: 0
    };
    this.trackerExists = false;
    
    // Reader state
    this.reader = null;
    this.readerStudyLanguage = null;
    this.readerBookTitle = null;
    
    // Text buffer state
    this.buffer = "";
    this.bufferSize = 0;
    this.isAtEnd = false;
    
    // Sentence processing
    this.rawSentenceSize = 0;
    this.simpleIndex = 0;
    this.simpleArray = [];
    this.translatedArray = []; // Array of translations for the simplified sentences
    this.readingLevel = 6; // Default reading level
    this.userLanguage = 'en'; // Default user language
    
    // Callback for sentence processing
    this.onSentenceProcessed = null;
    
    // Debug flag
    this.DEBUG = true;
  }
  
  // Initialize the reader with callback for sentence processing
  initialize(callback, userLanguage = 'en') {
    this.onSentenceProcessed = callback;
    this.userLanguage = userLanguage;
    return this;
  }
  
  // Set reading level
  setReadingLevel(level) {
    this.readingLevel = level;
  }
  
  // Handle Load Book button
  async handleLoadBook(studyLanguage, bookTitle) {
    // Save the current book tracker if we're switching to a new book
    if (this.trackerExists && 
        (this.tracker.studyLanguage !== studyLanguage || this.tracker.bookTitle !== bookTitle)) {
      await this.saveTrackerState();
    }
    
    // Reset state
    this.simpleArray = [];
    this.translatedArray = [];
    this.simpleIndex = 0;
    this.buffer = "";
    this.bufferSize = 0;
    this.isAtEnd = false;
    
    // Try to find existing tracker in persistent store
    const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;
    
    try {
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const parsedTracker = JSON.parse(savedTracker);
          this.tracker = parsedTracker;
          this.trackerExists = true;
        } catch (parseError) {
          // Create new tracker if parsing fails
          this.tracker = {
            studyLanguage: studyLanguage,
            bookTitle: bookTitle,
            offset: 0
          };
          this.trackerExists = true;
          
          // Immediately save the newly created tracker to persistent storage
          await this.saveTrackerState();
        }
      } else {
        // Create new tracker
        this.tracker = {
          studyLanguage: studyLanguage,
          bookTitle: bookTitle,
          offset: 0
        };
        this.trackerExists = true;
        
        // Immediately save the newly created tracker to persistent storage
        await this.saveTrackerState();
      }
    } catch (error) {
      // Create new tracker on error
      this.tracker = {
        studyLanguage: studyLanguage,
        bookTitle: bookTitle,
        offset: 0
      };
      this.trackerExists = true;
      
      // Immediately save the newly created tracker to persistent storage
      await this.saveTrackerState();
    }
    
    // Initialize the reader with the book
    try {
      // Find the book in our sources
      const bookSource = bookSources.find(b => b.title === bookTitle);
      
      if (!bookSource) {
        throw new Error(`Book not found: ${bookTitle}`);
      }
      
      const bookId = bookSource.id;
      
      // Set up BookPipe with the current offset from the tracker
      if (this.reader !== BookPipe || this.readerBookTitle !== bookTitle) {
        const trackerKey = `book_tracker_${bookId}`;
        
        // Make sure we sync the tracker with BookPipe by saving it with BookPipe's expected key format
        try {
          await AsyncStorage.setItem(trackerKey, JSON.stringify({ 
            bookId: bookId, 
            offset: this.tracker.offset 
          }));
        } catch (syncError) {
          // Silent error handling
        }
        
        // Initialize BookPipe with book ID
        await BookPipe.initialize(bookId);
        this.reader = BookPipe;
        this.readerStudyLanguage = studyLanguage;
        this.readerBookTitle = bookTitle;
      }
    } catch (error) {
      throw error;
    }
    
    // Load the first sentence batch
    const result = await this.getSentenceBatch();
    
    if (result) {
      // Process the first sentence
      this.processSimpleSentence();
      return true;
    } else {
      // Create a default error message if loading failed
      this.simpleArray = ["Failed to load content. Please try again."];
      this.translatedArray = ["Failed to load content. Please try again."];
      this.simpleIndex = 0;
      this.processSimpleSentence();
      return false;
    }
  }
  
  // Handle Next Sentence button
  async handleNextSentence() {
    if (!this.trackerExists) {
      return false;
    }
    
    // Check if we have more sentences in the current simple array
    if (this.simpleIndex < (this.simpleArray.length - 1)) {
      this.simpleIndex++;
      this.processSimpleSentence();
      return true;
    } else {
      // Enable position saving in BookPipe
      if (this.reader) {
        this.reader.enablePositionSaving();
      }
      
      // Load the next batch of sentences
      const result = await this.getSentenceBatch();
      
      if (result) {
        // Process the sentence
        this.processSimpleSentence();
        return true;
      } else if (this.isAtEnd) {
        // We're at the end of the book
        this.simpleArray = ["You have reached the end of the book."];
        this.translatedArray = ["You have reached the end of the book."];
        this.simpleIndex = 0;
        this.processSimpleSentence();
        return true;
      } else {
        // Error loading more content
        return false;
      }
    }
  }
  
  // Find the end of a sentence, accounting for quotes and other special cases
  findSentenceEnd(text, startPos) {
    const maxLength = text.length;
    let inQuote = false;
    let quoteChar = null;
    let lastChar = null;
    
    for (let i = startPos; i < maxLength; i++) {
      const char = text[i];
      
      // Track quotes
      if ((char === '"' || char === "'" || char === '"' || char === '"' || char === "'" || char === "'") && 
          (lastChar !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if ((char === quoteChar) || 
                   (char === '"' && (quoteChar === '"' || quoteChar === '"')) ||
                   (char === "'" && (quoteChar === "'" || quoteChar === "'"))) {
          inQuote = false;
        }
      }
      
      // Check for sentence end but not inside quotes
      if (!inQuote && 
          (char === '.' || char === '!' || char === '?')) {
        
        // Make sure this period is actually ending a sentence
        // Look ahead to confirm it's followed by space or newline or end of text
        if (i + 1 >= maxLength || 
            text[i + 1] === ' ' || 
            text[i + 1] === '\n' || 
            text[i + 1] === '\r') {
          
          // Also check for quotation marks, parentheses, etc. that might follow a period
          let endPos = i;
          for (let j = i + 1; j < maxLength; j++) {
            const nextChar = text[j];
            if (nextChar === '"' || nextChar === "'" || nextChar === '"' || 
                nextChar === '"' || nextChar === "'" || nextChar === "'" ||
                nextChar === ')' || nextChar === ']') {
              endPos = j;
            } else if (nextChar !== ' ' && nextChar !== '\n' && nextChar !== '\r') {
              break;
            } else {
              endPos = j;
            }
          }
          
          return endPos + 1;
        }
      }
      
      lastChar = char;
    }
    
    // If we couldn't find a proper sentence end, return the end of text
    return maxLength;
  }
  
  // New unified function to get sentence batches
  async getSentenceBatch() {
    if (this.DEBUG) console.log("[DEBUG] getSentenceBatch called");
    
    if (!this.reader || !this.reader.htmlContent) {
      if (this.DEBUG) console.log("[DEBUG] getSentenceBatch: No reader or HTML content");
      return false;
    }
    
    try {
      // Fill buffer if needed
      if (this.bufferSize < BUFFER_SIZE && !this.isAtEnd) {
        const refill = BUFFER_SIZE - this.bufferSize;
        
        // Calculate where to start reading from
        const readStart = this.reader.anchorPosition + this.tracker.offset;
        const readEnd = Math.min(readStart + refill, this.reader.htmlContent.length);
        
        if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Buffer needs refill, reading from ${readStart} to ${readEnd}`);
        
        if (readStart >= this.reader.htmlContent.length) {
          if (this.DEBUG) console.log("[DEBUG] getSentenceBatch: Reached end of content");
          this.isAtEnd = true;
          if (this.bufferSize <= 0) {
            return false;
          }
        } else {
          // Read more content into buffer
          const newContent = this.reader.htmlContent.substring(readStart, readEnd);
          
          // Extract readable text from HTML
          const newText = this.extractText(newContent);
          if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Extracted ${newText.length} bytes of text`);
          
          // Add to buffer
          this.buffer += newText;
          this.bufferSize = this.buffer.length;
          
          // Update offset and save
          this.tracker.offset += (readEnd - readStart);
          await this.saveTrackerState();
          
          // Check for EOF
          if (readEnd >= this.reader.htmlContent.length) {
            if (this.DEBUG) console.log("[DEBUG] getSentenceBatch: Reached end of file");
            this.isAtEnd = true;
          }
        }
      }
      
      // Extract exactly 10 complete sentences from buffer
      let sentenceBatch = "";
      let sentences = [];
      let sentenceCount = 0;
      let currentPos = 0;
      
      if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Extracting sentences from buffer of ${this.bufferSize} bytes`);
      
      // Extract exactly 10 sentences, or as many as we can get
      while (sentenceCount < 10 && currentPos < this.bufferSize) {
        // Find next sentence end using improved method
        let endPos = this.findSentenceEnd(this.buffer, currentPos);
        
        // If no sentence end found, but we're not at EOF, read more
        if (endPos >= this.bufferSize) {
          if (!this.isAtEnd && sentenceCount === 0) {
            // Need more content, but only if we haven't found any sentences yet
            if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: No sentence end found, need more content`);
            break;
          } else {
            // Use what we have if we're at EOF or have at least one sentence
            endPos = this.bufferSize;
          }
        }
        
        // Extract the sentence
        const sentence = this.buffer.substring(currentPos, endPos).trim();
        if (sentence.length > 0) {
          sentences.push(sentence);
          sentenceBatch += (sentenceBatch ? " " : "") + sentence;
          sentenceCount++;
          if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Added sentence ${sentenceCount}: "${sentence.substring(0, 30)}..."`);
        }
        
        // Move to the next position
        currentPos = endPos;
        
        // Skip whitespace between sentences
        while (currentPos < this.bufferSize && 
               (this.buffer[currentPos] === ' ' || 
                this.buffer[currentPos] === '\n' || 
                this.buffer[currentPos] === '\r' || 
                this.buffer[currentPos] === '\t')) {
          currentPos++;
        }
      }
      
      // Remove processed text from buffer
      if (currentPos > 0) {
        this.buffer = this.buffer.substring(currentPos);
        this.bufferSize = this.buffer.length;
        if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Removed ${currentPos} bytes from buffer, ${this.bufferSize} remaining`);
      }
      
      // If we found some sentences, process them
      if (sentenceCount > 0 && sentenceBatch.length > 0) {
        if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Processing batch of ${sentenceCount} sentences`);
        
        // Get proper language code for the study language
        const targetLang = detectLanguageCode(this.readerStudyLanguage);
        
        // Process with API
        const result = await processSourceText(sentenceBatch, targetLang, this.readingLevel);
        if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: processSourceText result: ${result ? 'success' : 'failed'}`);
        
        if (result) {
          // After processSourceText, we need to get sentences from getSL and getUL
          this.simpleArray = [];
          this.translatedArray = [];
          
          let slSentence, ulSentence;
          while ((slSentence = getSL()) !== null) {
            this.simpleArray.push(slSentence);
            
            // Get the corresponding translation
            ulSentence = getUL();
            this.translatedArray.push(ulSentence || slSentence); // Fallback to SL if UL is not available
          }
          
          if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Got ${this.simpleArray.length} SL sentences and ${this.translatedArray.length} UL sentences`);
          
          // Reset index for the new batch
          this.simpleIndex = 0;
          
          return true;
        }
      }
      
      // If we didn't find any sentences but the buffer is empty and we're at EOF
      if (this.bufferSize === 0 && this.isAtEnd) {
        if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch: Buffer empty and at EOF`);
        this.simpleArray = ["You have reached the end of the book."];
        this.translatedArray = ["You have reached the end of the book."];
        this.simpleIndex = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`[ERROR] getSentenceBatch: ${error.message}`);
      if (this.DEBUG) console.log(`[DEBUG] getSentenceBatch error: ${error.message}`);
      this.simpleArray = [`Error loading content: ${error.message}`];
      this.translatedArray = [`Error loading content: ${error.message}`];
      this.simpleIndex = 0;
      return true; // Still return true so we display the error message
    }
  }
  
  // Handle Rewind button
  async handleRewind() {
    if (!this.trackerExists) {
      return false;
    }
    
    try {
      // Step 1: Directly remove ALL trackers for this book from storage
      
      // 1a. Remove our own tracker
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      await AsyncStorage.removeItem(trackerKey);
      
      // 1b. If we have a reader, remove its tracker too
      if (this.reader && this.readerBookTitle) {
        const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
        if (bookSource) {
          const bookPipeTrackerKey = `book_tracker_${bookSource.id}`;
          await AsyncStorage.removeItem(bookPipeTrackerKey);
        }
      }
      
      // Step 2: Reset the tracker in memory but keep track of book/language
      const studyLanguage = this.tracker.studyLanguage;
      const bookTitle = this.tracker.bookTitle;
      
      // Step 3: Reset the reader
      if (this.reader) {
        this.reader.thorough_reset(); // This does a deep reset but doesn't touch storage
        this.reader = null;         // Disconnect from the reader 
      }
      
      // Step 4: Reset our own state fully
      this.reset();
      
      // Step 5: Reload the book from the beginning (this will recreate trackers with offset 0)
      await this.handleLoadBook(studyLanguage, bookTitle);
      
      return true;
    } catch (error) {
      console.log(`[ERROR] handleRewind: ${error.message}`);
      return false;
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
      console.log(`[BookReader] Error extracting text: ${error.message}`);
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  
  // Process and display the current sentence
  processSimpleSentence() {
    if (!this.simpleArray || this.simpleArray.length === 0) {
      if (this.DEBUG) console.log("[DEBUG] processSimpleSentence: No sentences available");
      // Call the callback with empty strings to clear the display
      if (typeof this.onSentenceProcessed === 'function') {
        this.onSentenceProcessed("", "");
      }
      return;
    }
    
    // Get the current sentence and its translation
    const currentSentence = this.simpleArray[this.simpleIndex];
    const currentTranslation = this.translatedArray[this.simpleIndex] || currentSentence;
    
    if (this.DEBUG) console.log(`[DEBUG] processSimpleSentence: Processing sentence ${this.simpleIndex+1}/${this.simpleArray.length}`);
    if (this.DEBUG) console.log(`[DEBUG] SL: "${currentSentence.substring(0, 50)}..."`);
    if (this.DEBUG) console.log(`[DEBUG] UL: "${currentTranslation.substring(0, 50)}..."`);
    
    // Submit to the callback for display and TTS
    if (typeof this.onSentenceProcessed === 'function') {
      this.onSentenceProcessed(currentSentence, currentTranslation);
    } else {
      if (this.DEBUG) console.log("[DEBUG] processSimpleSentence: No callback function available");
    }
  }
  
  // Save the tracker state to persistent storage
  async saveTrackerState() {
    if (!this.trackerExists) return;
    
    try {
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      const trackerJSON = JSON.stringify(this.tracker);
      
      await AsyncStorage.setItem(trackerKey, trackerJSON);
      
      // For compatibility with BookPipe, also save to its expected format
      if (this.readerBookTitle) {
        const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
        if (bookSource) {
          const bookPipeTrackerKey = `book_tracker_${bookSource.id}`;
          const bookPipeTracker = {
            bookId: bookSource.id,
            offset: this.tracker.offset
          };
          
          await AsyncStorage.setItem(bookPipeTrackerKey, JSON.stringify(bookPipeTracker));
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }
  
  // Get current progress information
  getProgress() {
    return {
      bookTitle: this.tracker.bookTitle,
      studyLanguage: this.tracker.studyLanguage,
      currentOffset: this.tracker.offset,
      currentSentenceIndex: this.simpleIndex,
      totalSentencesInMemory: this.simpleArray.length,
      hasMoreContent: !this.isAtEnd || this.bufferSize > 0
    };
  }
  
  // Reset all state
  reset() {
    this.tracker = {
      studyLanguage: null,
      bookTitle: null,
      offset: 0
    };
    this.trackerExists = false;
    
    if (this.reader) {
      // Just set to null, don't reset BookPipe directly
      this.reader = null;
    }
    
    this.readerStudyLanguage = null;
    this.readerBookTitle = null;
    this.rawSentenceSize = 0;
    this.simpleIndex = 0;
    this.simpleArray = [];
    this.translatedArray = [];
    
    // Reset buffer
    this.buffer = "";
    this.bufferSize = 0;
    this.isAtEnd = false;
  }
}

// Export a singleton instance
export default new BookReader();