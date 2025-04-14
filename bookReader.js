// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, getSL, getUL } from './apiServices';
import { parseIntoSentences, detectLanguageCode } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import BookPipe from './bookPipeCore';
import { Platform } from 'react-native';

// Constants
const BLOCK_SIZE = 10000; // Size of text chunks to process at once

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
    
    // Sentence processing
    this.rawSentenceSize = 0;
    this.simpleIndex = 0;
    this.simpleArray = [];
    this.translatedArray = []; // Array of translations for the simplified sentences
    this.readingLevel = 6; // Default reading level
    this.userLanguage = 'en'; // Default user language
    
    // Callback for sentence processing
    this.onSentenceProcessed = null;
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
    
    // Load the first sentence
    await this.loadRawSentence();
    
    // Process the first sentence
    this.processSimpleSentence();
    
    return true;
  }
  
  // Handle Next Sentence button
  async handleNextSentence() {
    if (!this.trackerExists) {
      return false;
    }
    
    // Check if we have more sentences in the current simple array
    if (this.simpleIndex < (this.simpleArray.length - 1)) {
      this.simpleIndex++;
    } else {
      // IMPORTANT: Update tracker offset BEFORE loading more content
      // This ensures we maintain the correct position within content that has already been read
      this.tracker.offset += this.rawSentenceSize;
      
      // Save the updated tracker to persistent storage immediately
      await this.saveTrackerState();
      
      // Also enable position saving in BookPipe
      if (this.reader) {
        this.reader.enablePositionSaving();
      }
      
      // Load the next sentence
      await this.loadRawSentence();
    }
    
    // Process and display the current sentence
    this.processSimpleSentence();
    
    return true;
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
      return false;
    }
  }
  
  // Load and process next raw sentence
  async loadRawSentence() {
    // Check if reader is at EOF
    if (!this.reader.hasMoreSentences()) {
      // Handle EOF by setting special state
      this.simpleArray = ["You have reached the end of the book."];
      this.translatedArray = ["You have reached the end of the book."];
      this.simpleIndex = 0;
      this.rawSentenceSize = 0;
      return;
    }
    
    try {
      // Get the next batch of sentences from BookPipe
      const batchSize = 10; // Process 10 sentences at a time
      const rawSentences = await this.reader.getNextBatch(batchSize);
      
      if (!rawSentences || rawSentences.length === 0) {
        this.simpleArray = ["No more sentences available."];
        this.translatedArray = ["No more sentences available."];
        this.simpleIndex = 0;
        this.rawSentenceSize = 0;
        return;
      }
      
      // Join the raw sentences for processing
      const rawText = rawSentences.join(' ');
      this.rawSentenceSize = rawText.length;
      
      // 1. FIRST TRANSLATE to the study language if the book is not already in that language
      let textForSimplification = rawText;
      
      // Find the book source to get its original language
      const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
      
      // No need for additional translation here - we'll use the processSourceText which
      // handles translation to the study language
      
      // 2. Process with OpenAI API which handles simplification and translation in one call
      let processedText;
      try {
        // Get proper language code for the study language
        const targetLang = detectLanguageCode(this.readerStudyLanguage);
        
        processedText = await processSourceText(textForSimplification, targetLang, this.readingLevel);
      } catch (error) {
        processedText = null;
      }
      
      if (!processedText || processedText.length === 0) {
        // Use the text we have as fallback (already in study language from previous step)
        this.simpleArray = parseIntoSentences(textForSimplification);
        // Also set translatedArray to the same content as fallback
        this.translatedArray = [...this.simpleArray];
      } else {
        // Now let's use getSL and getUL to get the paired sentences from apiServices
        this.simpleArray = [];
        this.translatedArray = [];
        
        // Get all available simplified sentences and their translations
        let slSentence, ulSentence;
        while ((slSentence = getSL()) !== null) {
          this.simpleArray.push(slSentence);
          
          // Get the corresponding translation
          ulSentence = getUL();
          this.translatedArray.push(ulSentence || slSentence); // Fallback to SL if UL is not available
        }
      }
      
      this.simpleIndex = 0;
    } catch (error) {
      this.simpleArray = [`Error loading content: ${error.message}`];
      this.translatedArray = [`Error loading content: ${error.message}`];
      this.simpleIndex = 0;
      this.rawSentenceSize = 0;
    }
  }
  
  // Process and display the current sentence
  processSimpleSentence() {
    if (!this.simpleArray || this.simpleArray.length === 0) {
      return;
    }
    
    // Get the current sentence and its translation
    const currentSentence = this.simpleArray[this.simpleIndex];
    const currentTranslation = this.translatedArray[this.simpleIndex] || currentSentence;
    
    // Submit to the callback for display and TTS
    if (typeof this.onSentenceProcessed === 'function') {
      this.onSentenceProcessed(currentSentence, currentTranslation);
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
      hasMoreContent: this.reader ? this.reader.hasMoreSentences() : false
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
  }
}

// Export a singleton instance
export default new BookReader();