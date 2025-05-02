// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode, translateSentences } from './textProcessing';
import BookPipe from './bookPipeCore';
import { bookPipeProcess } from './bookPipeProcess';
import { Platform } from 'react-native';
import { getUserLibrary, getBookById } from './userLibrary';
import { debugLog } from './DebugPanel';

const BLOCK_SIZE = 10000;

class BookReader {
  constructor() {
    // Original properties
    this.tracker = {
      studyLanguage: null,
      bookTitle: null,
      offset: 0
    };
    this.trackerExists = false;

    this.reader = null;
    this.readerStudyLanguage = null;
    this.readerBookTitle = null;

    this.rawSentenceSize = 0;
    this.simpleIndex = 0;
    this.simpleArray = [];
    this.translatedArray = [];
    this.readingLevel = 6;
    this.userLanguage = 'en';
    this.onSentenceProcessed = null;
    
    // New properties for Aoede 3.0
    this.bookText = null;          // Step 1: Full book text
    this.anchorPosition = 0;       // Step 2: Position of anchor
    this.bookSentences = [];       // Step 3: Array of all sentences in the book
    this.currentSentenceOffset = 0; // Step 4: Current sentence offset in book
    this.sentenceChunks = [];      // Step 5: Array of chunks of sentences
    this.currentChunkIndex = 0;    // Current chunk being processed
    this.simplifiedChunks = [];    // Processed chunks with simplifications
  }

  initialize(callback, userLanguage = 'en') {
    if (__DEV__) console.log("MODULE 0068: bookReader.initialize");
    this.onSentenceProcessed = callback;
    this.userLanguage = userLanguage;
    return this;
  }

  setReadingLevel(level) {
    if (__DEV__) console.log("MODULE 0069: bookReader.setReadingLevel");
    this.readingLevel = level;
  }

  // New function that will implement our new algorithm for Aoede 3.0
  readingManagement() {
    debugLog('BookReader: readingManagement() called');
    
    return {
      // Interface for loading a book in Aoede 3.0 style
      loadBook: async (studyLanguage, bookId) => {
        debugLog(`BookReader: readingManagement().loadBook(${studyLanguage}, ${bookId})`);
        // Implement steps 1 and 2 of our algorithm
        try {
          // Step 1: Load the entire book into memory
          await this.loadEntireBook(bookId);
          
          // Step 2: Find the anchor in the URL
          await this.findAnchor(bookId);
          
          // Show the first 100 chars of text starting at the anchor
          const textAtAnchor = this.bookText.substring(this.anchorPosition, this.anchorPosition + 100);
          debugLog(`Book text at anchor (100 chars): "${textAtAnchor.replace(/\n/g, ' ')}"`);
          
          // For now, tell the user we haven't implemented further steps
          this.simpleArray = ["Aoede 3.0 is under development. The book has been loaded and the anchor found."];
          this.translatedArray = ["Aoede 3.0 is under development. The book has been loaded and the anchor found."];
          this.simpleIndex = 0;
          
          if (this.onSentenceProcessed) {
            this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
          }
          
          return true;
        } catch (error) {
          debugLog(`Error in loadBook: ${error.message}`);
          
          // Display error to the user
          this.simpleArray = [`Error loading book: ${error.message}`];
          this.translatedArray = [`Error loading book: ${error.message}`];
          this.simpleIndex = 0;
          
          if (this.onSentenceProcessed) {
            this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
          }
          
          return false;
        }
      },
      
      advanceToNextSentence: async () => {
        debugLog('BookReader: readingManagement().advanceToNextSentence()');
        // Not implemented yet
        this.simpleArray = ["Next sentence functionality will be implemented in a future version."];
        this.translatedArray = ["Next sentence functionality will be implemented in a future version."];
        this.simpleIndex = 0;
        
        if (this.onSentenceProcessed) {
          this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
        }
        
        return true;
      },
      
      rewindBook: async () => {
        debugLog('BookReader: readingManagement().rewindBook()');
        // Not implemented yet
        this.simpleArray = ["Rewind book functionality will be implemented in a future version."];
        this.translatedArray = ["Rewind book functionality will be implemented in a future version."];
        this.simpleIndex = 0;
        
        if (this.onSentenceProcessed) {
          this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
        }
        
        return true;
      },
      
      getProgress: () => {
        debugLog('BookReader: readingManagement().getProgress()');
        // Return a simple progress object
        return {
          currentSentenceIndex: this.simpleIndex,
          totalSentencesInMemory: this.simpleArray.length,
          hasMoreContent: false
        };
      },
      
      reset: () => {
        debugLog('BookReader: readingManagement().reset()');
        this.reset();
      },
      
      getReadingLevel: () => {
        debugLog('BookReader: readingManagement().getReadingLevel()');
        return this.readingLevel;
      }
    };
  }

  // We need to keep previousReadingManagement active but make it call the new function
  previousReadingManagement() {
    // Just redirect to the new implementation
    return this.readingManagement();
  }
  
  // Implementation of Step 1: Load the entire book into memory
  async loadEntireBook(bookId) {
    debugLog(`BookReader: Step 1 - Loading entire book ${bookId} into memory`);
    
    try {
      // Get book details from user library
      const book = await getBookById(bookId);
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      // Initialize BookPipe to get access to the book URL
      await BookPipe.initialize(bookId);
      
      // Store reader for later use
      this.reader = BookPipe;
      this.readerBookTitle = book.title;
      
      // Get the HTML content from BookPipe
      const htmlContent = BookPipe.htmlContent;
      
      if (!htmlContent) {
        throw new Error("Failed to load book content");
      }
      
      // Extract plain text from HTML using the exported bookPipeProcess module
      this.bookText = htmlContent; // Store HTML content, not plain text for anchor searching
      
      debugLog(`Book loaded successfully: ${this.bookText.length} characters`);
      return true;
    } catch (error) {
      debugLog(`Error loading entire book: ${error.message}`);
      this.bookText = null;
      throw error;
    }
  }
  
  // Implementation of Step 2: Find the anchor in the URL
  async findAnchor(bookId) {
    debugLog(`BookReader: Step 2 - Finding anchor for book ${bookId}`);
  
    try {
      if (!this.bookText) {
        throw new Error("Book text not loaded");
      }
    
      // Get book details from user library
      const book = await getBookById(bookId);
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
    
      // Extract URL from book
      const bookUrl = book.url;
      if (!bookUrl) {
        throw new Error("Book URL is missing");
      }
    
      // Check if URL has a fragment identifier (anchor)
      let fragmentId = '';
      if (bookUrl.includes('#')) {
        fragmentId = bookUrl.split('#')[1];
        debugLog(`Looking for anchor: ${fragmentId}`);
      } else {
        throw new Error('URL does not contain an anchor fragment');
      }
      
      // Define patterns to search for the anchor in HTML
      // Order is important - we're using the patterns from Aoede 2.0
      const anchorPatterns = [
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>((?!</a>).)*</a>`, 'i'),
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i'),
        new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i')
      ];
    
      let match = null;
      let patternIndex = -1;
    
      // Try each pattern to find the anchor
      for (let i = 0; i < anchorPatterns.length; i++) {
        debugLog(`Trying pattern ${i}: ${anchorPatterns[i]}`);
        match = anchorPatterns[i].exec(this.bookText);
        if (match) {
          patternIndex = i;
          debugLog(`Found match with pattern ${i}`);
          break;
        }
      }
    
      if (match) {
        this.anchorPosition = match.index;
      
        // Show the first 100 chars of text starting at the anchor
        const textAtAnchor = this.bookText.substring(this.anchorPosition, this.anchorPosition + 100);
        debugLog(`Found anchor "${fragmentId}" at position ${this.anchorPosition}`);
        debugLog(`Book text at anchor (100 chars): "${textAtAnchor.replace(/\n/g, ' ')}"`);
      
        return true;
      } else {
        this.anchorPosition = 0;
        throw new Error(`Anchor "${fragmentId}" not found in book content`);
      }
    } catch (error) {
      debugLog(`Error finding anchor: ${error.message}`);
      this.anchorPosition = 0;
      throw error;
    }
  }
  
  async handleLoadBook(studyLanguage, bookId) {
    if (__DEV__) console.log("MODULE 0070: bookReader.handleLoadBook");
    if (this.trackerExists &&
        (this.tracker.studyLanguage !== studyLanguage || this.tracker.bookTitle !== bookId)) {
      await this.saveTrackerState();
    }

    this.simpleArray = [];
    this.translatedArray = [];
    this.simpleIndex = 0;

    // Get the book to get its title
    const book = await getBookById(bookId);
    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }
    
    const bookTitle = book.title;
    const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;

    try {
      const savedTracker = await AsyncStorage.getItem(trackerKey);

      if (savedTracker) {
        try {
          const parsedTracker = JSON.parse(savedTracker);
          this.tracker = parsedTracker;
          this.trackerExists = true;
        } catch {
          this.tracker = {
            studyLanguage,
            bookTitle: bookTitle,
            offset: 0
          };
          this.trackerExists = true;
          await this.saveTrackerState();
        }
      } else {
        this.tracker = {
          studyLanguage,
          bookTitle: bookTitle,
          offset: 0
        };
        this.trackerExists = true;
        await this.saveTrackerState();
      }
    } catch {
      this.tracker = {
        studyLanguage,
        bookTitle: bookTitle,
        offset: 0
      };
      this.trackerExists = true;
      await this.saveTrackerState();
    }

    try {
      if (this.reader !== BookPipe || this.readerBookTitle !== bookTitle) {
        const trackerKey = `book_tracker_${bookId}`;
        try {
          await AsyncStorage.setItem(trackerKey, JSON.stringify({ bookId, offset: this.tracker.offset }));
        } catch {}
        await BookPipe.initialize(bookId);
        this.reader = BookPipe;
        this.readerStudyLanguage = studyLanguage;
        this.readerBookTitle = bookTitle;
      }
    } catch (error) {
      throw error;
    }

    await this.loadRawSentence();
    this.processSimpleSentence();
    return true;
  }

  async handleNextSentence() {
    if (__DEV__) console.log("MODULE 0071: bookReader.handleNextSentence");
    if (!this.trackerExists) return false;

    if (this.simpleIndex < (this.simpleArray.length - 1)) {
      this.simpleIndex++;
    } else {
      this.tracker.offset += this.rawSentenceSize;
      await this.saveTrackerState();
      if (this.reader) this.reader.enablePositionSaving();
      await this.loadRawSentence();
    }

    this.processSimpleSentence();
    return true;
  }

  async handleRewind() {
    if (__DEV__) console.log("MODULE 0072: bookReader.handleRewind");
    if (!this.trackerExists) return false;

    try {
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      await AsyncStorage.removeItem(trackerKey);

      if (this.reader && this.readerBookTitle) {
        // Get book by title from user library
        const userLibrary = await getUserLibrary();
        const book = userLibrary.find(b => b.title === this.readerBookTitle);
        
        if (book) {
          const bookPipeTrackerKey = `book_tracker_${book.id}`;
          await AsyncStorage.removeItem(bookPipeTrackerKey);
        }
      }

      const studyLanguage = this.tracker.studyLanguage;
      // Store the book ID for reloading
      const bookId = this.reader ? this.reader.bookId : null;

      if (this.reader) {
        this.reader.thorough_reset();
        this.reader = null;
      }

      this.reset();
      
      if (bookId) {
        await this.handleLoadBook(studyLanguage, bookId);
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  async loadRawSentence() {
    if (__DEV__) console.log("MODULE 0073: bookReader.loadRawSentence");
    if (!this.reader.hasMoreSentences()) {
      this.simpleArray = ["You have reached the end of the book."];
      this.translatedArray = ["You have reached the end of the book."];
      this.simpleIndex = 0;
      this.rawSentenceSize = 0;
      return;
    }

    try {
      const batchSize = 10;
      const rawSentences = await this.reader.getNextBatch(batchSize);

      if (!rawSentences || rawSentences.length === 0) {
        this.simpleArray = ["No more sentences available."];
        this.translatedArray = ["No more sentences available."];
        this.simpleIndex = 0;
        this.rawSentenceSize = 0;
        return;
      }

      const rawText = rawSentences.join(' ');
      this.rawSentenceSize = rawText.length;

      let textForSimplification = rawText;
      // Get book using reader's bookId
      const book = await getBookById(this.reader.bookId);
      const sourceLanguageCode = book ? book.language : 'en';
      const targetLanguageCode = detectLanguageCode(this.readerStudyLanguage);
      const userLanguageCode = detectLanguageCode(this.userLanguage);

      textForSimplification = rawText;

      let processedText;
      try {
        processedText = await processSourceText(
          textForSimplification,
          sourceLanguageCode,
          targetLanguageCode,
          userLanguageCode,
          this.readingLevel
        );

        const slArray = this.getSL(processedText);
        const ulArray = this.getUL(processedText);

        this.simpleArray = slArray;
        this.translatedArray = ulArray;
      } catch (error) {
        console.error("[bookReader] ❌ Error during simplification or SL/UL extraction:", error.message);
        processedText = null;
      }

      this.simpleIndex = 0;
    } catch (error) {
      this.simpleArray = [`Error loading content: ${error.message}`];
      this.translatedArray = [`Error loading content: ${error.message}`];
      this.simpleIndex = 0;
      this.rawSentenceSize = 0;
    }
  }

  processSimpleSentence() {
    if (__DEV__) console.log("MODULE 0074: bookReader.processSimpleSentence");
    if (!this.simpleArray || this.simpleArray.length === 0) return;

    const currentSentence = this.simpleArray[this.simpleIndex];
    const currentTranslation = this.translatedArray[this.simpleIndex] || currentSentence;

    if (typeof this.onSentenceProcessed === 'function') {
      this.onSentenceProcessed(currentSentence, currentTranslation);
    }
  }

  async saveTrackerState() {
    if (__DEV__) console.log("MODULE 0075: bookReader.saveTrackerState");
    if (!this.trackerExists) return;

    try {
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      const trackerJSON = JSON.stringify(this.tracker);
      await AsyncStorage.setItem(trackerKey, trackerJSON);

      if (this.reader && this.reader.bookId) {
        const bookPipeTrackerKey = `book_tracker_${this.reader.bookId}`;
        const bookPipeTracker = {
          bookId: this.reader.bookId,
          offset: this.tracker.offset
        };
        await AsyncStorage.setItem(bookPipeTrackerKey, JSON.stringify(bookPipeTracker));
      }
    } catch {}
  }

  getProgress() {
    if (__DEV__) console.log("MODULE 0076: bookReader.getProgress");
    return {
      bookTitle: this.tracker.bookTitle,
      studyLanguage: this.tracker.studyLanguage,
      currentOffset: this.tracker.offset,
      currentSentenceIndex: this.simpleIndex,
      totalSentencesInMemory: this.simpleArray.length,
      hasMoreContent: this.reader ? this.reader.hasMoreSentences() : false
    };
  }

  reset() {
    if (__DEV__) console.log("MODULE 0077: bookReader.reset");
    this.tracker = {
      studyLanguage: null,
      bookTitle: null,
      offset: 0
    };
    this.trackerExists = false;

    if (this.reader) {
      this.reader = null;
    }

    this.readerStudyLanguage = null;
    this.readerBookTitle = null;
    this.rawSentenceSize = 0;
    this.simpleIndex = 0;
    this.simpleArray = [];
    this.translatedArray = [];
    
    // Reset 3.0 properties
    this.bookText = null;          
    this.anchorPosition = 0;       
    this.bookSentences = [];       
    this.currentSentenceOffset = 0; 
    this.sentenceChunks = [];      
    this.currentChunkIndex = 0;    
    this.simplifiedChunks = [];    
  }

  getSL(multilineText) {
    if (__DEV__) console.log("MODULE 0078: bookReader.getSL");
    const lines = multilineText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const sl = [];
    for (let i = 0; i < lines.length; i += 2) {
      sl.push(lines[i]);
    }
    return sl;
  }

  getUL(multilineText) {
    if (__DEV__) console.log("MODULE 0079: bookReader.getUL");
    const lines = multilineText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const ul = [];
    for (let i = 1; i < lines.length; i += 2) {
      ul.push(lines[i]);
    }
    return ul;
  }
}

export default new BookReader();