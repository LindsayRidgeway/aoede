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
    // Reset state
    this.simpleArray = [];
    this.translatedArray = [];
    this.simpleIndex = 0;
    
    // Try to find existing tracker in persistent store
    const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          this.tracker = JSON.parse(savedTracker);
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
    
    // Close existing reader if we have one
    if (this.reader !== null) {
      BookPipe.reset();
      this.reader = null;
    }
    
    // Initialize the reader with the book
    try {
      // Find the book in our sources
      const bookSource = bookSources.find(book => book.title === bookTitle);
      
      if (!bookSource) {
        throw new Error(`Book not found: ${bookTitle}`);
      }
      
      const bookId = bookSource.id;
      
      // Initialize BookPipe with book ID
      await BookPipe.initialize(bookId);
      
      // Set reader to initialized state
      this.reader = BookPipe;
      this.readerStudyLanguage = studyLanguage;
      this.readerBookTitle = bookTitle;
      
      // IMPORTANT: If we have a saved offset, explicitly skip forward
      if (this.tracker.offset > 0) {
        // Since BookPipe doesn't have a direct skip method, we need to simulate it
        // by manipulating the internal state or processing chunks until we reach
        // the desired position
        
        // For this implementation, we'll use BookPipe's internal saved position
        // mechanism which is keyed by bookId
        const storageKey = `book_position_${bookId}`;
        
        try {
          // Store the offset in BookPipe's expected storage key
          await AsyncStorage.setItem(storageKey, this.tracker.offset.toString());
          
          // Force BookPipe to reload with this position
          await BookPipe.reset();
          await BookPipe.initialize(bookId);
        } catch (positionError) {
          // Continue without position - at least we tried
        }
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
      return false;
    }
    
    try {
      // 1. Reset tracker offset in our object
      this.tracker.offset = 0;
      
      // 2. Save tracker state with reset offset
      await this.saveTrackerState();
      
      // 3. IMPORTANT: Reset BookPipe's internal position tracking
      if (this.reader) {
        const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
        if (bookSource) {
          const bookId = bookSource.id;
          const storageKey = `book_position_${bookId}`;
          
          // Force position to 0 in BookPipe's storage
          await AsyncStorage.removeItem(storageKey);
          await AsyncStorage.setItem(storageKey, "0");
          
          // Reset the BookPipe object
          BookPipe.reset();
        }
      }
      
      // 4. Reload the book from the beginning
      return this.handleLoadBook(this.tracker.studyLanguage, this.tracker.bookTitle);
      
    } catch (error) {
      return false;
    }
  }
  
  // Load and process next raw sentence
  async loadRawSentence() {
    // Save tracker state
    await this.saveTrackerState();
    
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
      const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
      
      if (bookSource && bookSource.language !== this.readerStudyLanguage) {
        try {
          // Translate the text to the study language
          const sourceLanguageCode = detectLanguageCode(bookSource.language);
          const targetLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          
          // If we have valid language codes, proceed with translation
          if (sourceLanguageCode && targetLanguageCode && sourceLanguageCode !== targetLanguageCode) {
            const translatedText = await translateBatch([rawText], sourceLanguageCode, targetLanguageCode);
            
            if (translatedText && translatedText.length > 0) {
              textForSimplification = translatedText[0];
            }
          }
        } catch (error) {
          // Continue with original text as fallback
        }
      }
      
      // 2. THEN SIMPLIFY the text in the study language
      const processedText = await processSourceText(textForSimplification, this.readerStudyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
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
        // Fallback to simplified sentences
        this.translatedArray = [...this.simpleArray];
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