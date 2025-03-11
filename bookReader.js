// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import BookPipe from './bookPipe';

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
    console.log(`[BookReader] handleLoadBook called with language: ${studyLanguage}, book: ${bookTitle}`);
    
    // Reset state
    this.simpleArray = [];
    this.translatedArray = [];
    this.simpleIndex = 0;
    
    // Try to find existing tracker in persistent store
    const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;
    try {
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        this.tracker = JSON.parse(savedTracker);
        this.trackerExists = true;
        console.log(`[BookReader] Found existing tracker with offset: ${this.tracker.offset}`);
      } else {
        // Create new tracker
        this.tracker = {
          studyLanguage: studyLanguage,
          bookTitle: bookTitle,
          offset: 0
        };
        this.trackerExists = true;
        console.log(`[BookReader] Created new tracker`);
        
        // Immediately save the newly created tracker to persistent storage
        await this.saveTrackerState();
      }
    } catch (error) {
      console.error(`[BookReader] Error retrieving tracker: ${error}`);
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
    
    // Initialize reader (using BookPipe in this implementation)
    if (this.reader === null) {
      console.log(`[BookReader] Initializing BookPipe for ${bookTitle}`);
      
      try {
        // Initialize BookPipe with book ID
        const bookSource = bookSources.find(book => book.title === bookTitle);
        
        if (!bookSource) {
          throw new Error(`Book not found: ${bookTitle}`);
        }
        
        const bookId = bookSource.id;
        await BookPipe.initialize(bookId);
        
        // Set reader to initialized state
        this.reader = BookPipe;
        this.readerStudyLanguage = studyLanguage;
        this.readerBookTitle = bookTitle;
        
        // If we have a saved offset, try to advance to that position
        if (this.tracker.offset > 0) {
          console.log(`[BookReader] Attempting to restore position to offset: ${this.tracker.offset}`);
          // Note: BookPipe handles position restoration internally, so we don't need to skip forward
        }
      } catch (error) {
        console.error(`[BookReader] Error initializing reader: ${error}`);
        throw error;
      }
    } else {
      // Close existing reader and open new one
      console.log(`[BookReader] Reinitializing BookPipe for ${bookTitle}`);
      BookPipe.reset();
      
      try {
        // Initialize BookPipe with book ID
        const bookSource = bookSources.find(book => book.title === bookTitle);
        
        if (!bookSource) {
          throw new Error(`Book not found: ${bookTitle}`);
        }
        
        const bookId = bookSource.id;
        await BookPipe.initialize(bookId);
        
        // Set reader to initialized state
        this.reader = BookPipe;
        this.readerStudyLanguage = studyLanguage;
        this.readerBookTitle = bookTitle;
      } catch (error) {
        console.error(`[BookReader] Error reinitializing reader: ${error}`);
        throw error;
      }
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
      console.log(`[BookReader] No tracker exists, cannot get next sentence`);
      return false;
    }
    
    // Check if we have more sentences in the current simple array
    if (this.simpleIndex < (this.simpleArray.length - 1)) {
      console.log(`[BookReader] Moving to next sentence in memory (${this.simpleIndex + 1} of ${this.simpleArray.length})`);
      this.simpleIndex++;
    } else {
      console.log(`[BookReader] Need to load new block of text`);
      
      // Skip reader forward by rawSentenceSize bytes
      // (In our implementation, BookPipe handles this automatically when getNextBatch is called)
      
      // Update offset in tracker
      this.tracker.offset += this.rawSentenceSize;
      
      // Save the updated tracker to persistent storage
      await this.saveTrackerState();
      
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
      console.log(`[BookReader] No tracker exists, cannot rewind`);
      return false;
    }
    
    console.log(`[BookReader] Rewinding book to beginning`);
    
    // Reset tracker offset
    this.tracker.offset = 0;
    
    // Save tracker state with reset offset
    await this.saveTrackerState();
    
    // Reload the book from the beginning
    return this.handleLoadBook(this.tracker.studyLanguage, this.tracker.bookTitle);
  }
  
  // Load and process next raw sentence
  async loadRawSentence() {
    // Save tracker state
    await this.saveTrackerState();
    
    // Check if reader is at EOF
    if (!this.reader.hasMoreSentences()) {
      console.log(`[BookReader] Reached end of book`);
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
        console.log(`[BookReader] No more sentences available`);
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
      const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
      
      if (bookSource && bookSource.language !== this.readerStudyLanguage) {
        console.log(`[BookReader] Translating text from ${bookSource.language} to ${this.readerStudyLanguage}`);
        try {
          // Translate the text to the study language
          const sourceLanguageCode = detectLanguageCode(bookSource.language);
          const targetLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          
          // If we have valid language codes, proceed with translation
          if (sourceLanguageCode && targetLanguageCode && sourceLanguageCode !== targetLanguageCode) {
            const translatedText = await translateBatch([rawText], sourceLanguageCode, targetLanguageCode);
            
            if (translatedText && translatedText.length > 0) {
              textForSimplification = translatedText[0];
              console.log(`[BookReader] Successfully translated text to ${this.readerStudyLanguage}`);
            }
          }
        } catch (error) {
          console.error(`[BookReader] Error translating to study language: ${error}`);
          // Continue with original text as fallback
        }
      }
      
      // 2. THEN SIMPLIFY the text in the study language
      console.log(`[BookReader] Simplifying text with reading level ${this.readingLevel}`);
      const processedText = await processSourceText(textForSimplification, this.readerStudyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
        console.log(`[BookReader] Failed to simplify text`);
        // Use the text we have as fallback (already in study language from previous step)
        this.simpleArray = parseIntoSentences(textForSimplification);
      } else {
        // Split the processed text into individual sentences
        this.simpleArray = processedText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        // If that didn't work well, try another method
        if (this.simpleArray.length < 3) {
          this.simpleArray = parseIntoSentences(processedText);
        }
      }
      
      // 3. TRANSLATE the simplified sentences to user's language
      try {
        if (this.readerStudyLanguage !== this.userLanguage) {
          console.log(`[BookReader] Translating simplified sentences to user language: ${this.userLanguage}`);
          const studyLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          const userLanguageCode = this.userLanguage;
          
          this.translatedArray = await translateBatch(this.simpleArray, studyLanguageCode, userLanguageCode);
          
          if (!this.translatedArray || this.translatedArray.length === 0) {
            // Fallback to original sentences if translation fails
            this.translatedArray = [...this.simpleArray];
          }
        } else {
          // If study language is the same as user language, no need to translate
          this.translatedArray = [...this.simpleArray];
        }
      } catch (error) {
        console.error(`[BookReader] Error translating to user language: ${error}`);
        // Fallback to simplified sentences
        this.translatedArray = [...this.simpleArray];
      }
      
      console.log(`[BookReader] Processed ${this.simpleArray.length} simplified sentences`);
      this.simpleIndex = 0;
    } catch (error) {
      console.error(`[BookReader] Error loading raw sentence: ${error}`);
      this.simpleArray = [`Error loading content: ${error.message}`];
      this.translatedArray = [`Error loading content: ${error.message}`];
      this.simpleIndex = 0;
      this.rawSentenceSize = 0;
    }
  }
  
  // Process and display the current sentence
  processSimpleSentence() {
    if (!this.simpleArray || this.simpleArray.length === 0) {
      console.log(`[BookReader] No sentences to process`);
      return;
    }
    
    // Get the current sentence and its translation
    const currentSentence = this.simpleArray[this.simpleIndex];
    const currentTranslation = this.translatedArray[this.simpleIndex] || currentSentence;
    
    // Submit to the callback for display and TTS
    if (typeof this.onSentenceProcessed === 'function') {
      console.log(`[BookReader] Processing sentence ${this.simpleIndex + 1} of ${this.simpleArray.length}`);
      this.onSentenceProcessed(currentSentence, currentTranslation);
    } else {
      console.error(`[BookReader] No callback defined for sentence processing`);
    }
  }
  
  // Save the tracker state to persistent storage
  async saveTrackerState() {
    if (!this.trackerExists) return;
    
    try {
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      await AsyncStorage.setItem(trackerKey, JSON.stringify(this.tracker));
      console.log(`[BookReader] Saved tracker state with offset: ${this.tracker.offset}`);
    } catch (error) {
      console.error(`[BookReader] Error saving tracker state: ${error}`);
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
      // Close the reader
      BookPipe.reset();
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