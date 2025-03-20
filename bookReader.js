// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode, translateSentences } from './textProcessing';
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
    
    // Debug logging
    this.debugMode = true;
  }
  
  // Debug logging helper
  log(message) {
    if (this.debugMode) {
      console.log(`[BookReader] ${message}`);
    }
  }
  
  // Initialize the reader with callback for sentence processing
  initialize(callback, userLanguage = 'en') {
    this.onSentenceProcessed = callback;
    this.userLanguage = userLanguage;
    this.log(`Reader initialized with userLanguage: ${userLanguage}, platform: ${Platform.OS}`);
    return this;
  }
  
  // Set reading level
  setReadingLevel(level) {
    this.readingLevel = level;
  }
  
  // Handle Load Book button
  async handleLoadBook(studyLanguage, bookTitle) {
    this.log(`Loading book: ${bookTitle} in ${studyLanguage}`);
    
    // Save the current book tracker if we're switching to a new book
    if (this.trackerExists && 
        (this.tracker.studyLanguage !== studyLanguage || this.tracker.bookTitle !== bookTitle)) {
      this.log(`Switching from book ${this.tracker.bookTitle} to ${bookTitle}, saving current state`);
      await this.saveTrackerState();
    }
    
    // Reset state
    this.simpleArray = [];
    this.translatedArray = [];
    this.simpleIndex = 0;
    
    // Try to find existing tracker in persistent store
    const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;
    this.log(`Looking for tracker with key: ${trackerKey}`);
    
    try {
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const parsedTracker = JSON.parse(savedTracker);
          this.log(`Found existing tracker with offset: ${parsedTracker.offset}`);
          this.tracker = parsedTracker;
          this.trackerExists = true;
        } catch (parseError) {
          // Create new tracker if parsing fails
          this.log(`Error parsing tracker: ${parseError.message}, creating new tracker`);
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
        this.log(`No tracker found for key: ${trackerKey}, creating new tracker`);
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
      this.log(`Error accessing tracker: ${error.message}, creating new tracker`);
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
      const bookSource = bookSources.find(book => book.title === bookTitle);
      
      if (!bookSource) {
        throw new Error(`Book not found: ${bookTitle}`);
      }
      
      const bookId = bookSource.id;
      
      // Set up BookPipe with the current offset from the tracker
      if (this.reader !== BookPipe || this.readerBookTitle !== bookTitle) {
        const trackerKey = `book_tracker_${bookId}`;
        
        // Make sure we sync the tracker with BookPipe by saving it with BookPipe's expected key format
        try {
          this.log(`Syncing tracker to BookPipe with key: ${trackerKey} and offset: ${this.tracker.offset}`);
          await AsyncStorage.setItem(trackerKey, JSON.stringify({ 
            bookId: bookId, 
            offset: this.tracker.offset 
          }));
        } catch (syncError) {
          this.log(`Error syncing tracker to BookPipe: ${syncError.message}`);
        }
        
        // Initialize BookPipe with book ID
        this.log(`Initializing BookPipe with book ID: ${bookId}`);
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
      this.log(`Advanced to next sentence in buffer, index: ${this.simpleIndex}`);
    } else {
      // IMPORTANT: Update tracker offset BEFORE loading more content
      // This ensures we maintain the correct position within content that has already been read
      this.tracker.offset += this.rawSentenceSize;
      this.log(`About to load more content, updated offset to: ${this.tracker.offset}`);
      
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
      // 1. Reset tracker offset in our object
      this.tracker.offset = 0;
      this.log(`Rewind requested, resetting offset to 0`);
      
      // 2. Save tracker state with reset offset
      await this.saveTrackerState();
      
      // 3. Set the rewind flag in BookPipe before initializing
      if (this.reader) {
        const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
        if (bookSource) {
          // Set the rewind flag before handling the rewind
          this.reader.isRewindRequested = true;
          this.log(`Set rewind flag in BookPipe: isRewindRequested=true`);
        }
      }
      
      // 4. Reload the book from the beginning
      return this.handleLoadBook(this.tracker.studyLanguage, this.tracker.bookTitle);
      
    } catch (error) {
      this.log(`Error during rewind: ${error.message}`);
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
      
      const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
      
      // DEBUG: Log the book's language and study language
      this.log(`LANGUAGE DEBUG - Book language: ${bookSource?.language}, Study language: ${this.readerStudyLanguage}`);
      
      if (bookSource && bookSource.language !== this.readerStudyLanguage) {
        try {
          // Get language codes directly from the book source and study language
          const sourceLanguageCode = bookSource.language;
          // Check if we need to convert studyLanguage to a language code
          let targetLanguageCode = this.readerStudyLanguage;
          
          // Attempt to fix common language name issues
          if (targetLanguageCode === "Russian") targetLanguageCode = "ru";
          if (targetLanguageCode === "French") targetLanguageCode = "fr";
          if (targetLanguageCode === "Spanish") targetLanguageCode = "es";
          if (targetLanguageCode === "German") targetLanguageCode = "de";
          if (targetLanguageCode === "Italian") targetLanguageCode = "it";
          if (targetLanguageCode === "English") targetLanguageCode = "en";
          
          this.log(`TRANSLATION DEBUG - Converting book from ${sourceLanguageCode} to ${targetLanguageCode}`);
          
          // If we have valid language codes, proceed with translation
          if (sourceLanguageCode && targetLanguageCode && sourceLanguageCode !== targetLanguageCode) {
            this.log(`Translating from ${sourceLanguageCode} to ${targetLanguageCode}`);
            const translatedText = await translateBatch([rawText], sourceLanguageCode, targetLanguageCode);
            
            if (translatedText && translatedText.length > 0) {
              textForSimplification = translatedText[0];
              this.log(`Successfully translated book text to ${targetLanguageCode}`);
            }
          }
        } catch (error) {
          // Continue with original text as fallback
          this.log(`Error translating to study language: ${error.message}`);
        }
      }
      
      // 2. THEN SIMPLIFY the text in the study language
      let processedText;
      try {
        // Check if we need to convert readerStudyLanguage to a language code
        let targetLang = this.readerStudyLanguage;
        if (targetLang === "Russian") targetLang = "ru";
        if (targetLang === "French") targetLang = "fr";
        if (targetLang === "Spanish") targetLang = "es";
        if (targetLang === "German") targetLang = "de";
        if (targetLang === "Italian") targetLang = "it";
        if (targetLang === "English") targetLang = "en";
        
        this.log(`SIMPLIFICATION DEBUG - Calling processSourceText with language: ${targetLang}, level: ${this.readingLevel}`);
        processedText = await processSourceText(textForSimplification, targetLang, this.readingLevel);
        
        if (processedText && processedText.length > 0) {
          this.log(`Successfully simplified text, length: ${processedText.length}`);
        } else {
          this.log(`processSourceText returned empty text`);
        }
      } catch (error) {
        this.log(`Error during simplification: ${error.message}`);
        processedText = null;
      }
      
      if (!processedText || processedText.length === 0) {
        // Use the text we have as fallback (already in study language from previous step)
        this.log(`Using fallback for simplification`);
        this.simpleArray = parseIntoSentences(textForSimplification);
      } else {
        // Split the processed text into individual sentences
        this.simpleArray = processedText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        // If that didn't work well, try another method
        if (this.simpleArray.length < 3) {
          this.log(`Few sentences from split, using parseIntoSentences instead`);
          this.simpleArray = parseIntoSentences(processedText);
        }
      }
      
      this.log(`Created ${this.simpleArray.length} simple sentences`);
      if (this.simpleArray.length > 0) {
        this.log(`First simplified sentence: "${this.simpleArray[0].substring(0, 30)}..."`);
      }
      
      // 3. TRANSLATE the simplified sentences to user's language for display
      // This is critical for Android compatibility
      
      // First, make a deep copy of the simple array as a fallback
      this.translatedArray = [...this.simpleArray];
      this.log(`TRANSLATION DEBUG - Translating from ${this.readerStudyLanguage} to ${this.userLanguage}`);
      
      // Only translate if the languages are different
      if (this.readerStudyLanguage !== this.userLanguage) {
        try {
          // Check if we need to convert language names to codes
          let sourceLang = this.readerStudyLanguage;
          let targetLang = this.userLanguage;
          
          if (sourceLang === "Russian") sourceLang = "ru";
          if (sourceLang === "French") sourceLang = "fr";
          if (sourceLang === "Spanish") sourceLang = "es";
          if (sourceLang === "German") sourceLang = "de"; 
          if (sourceLang === "Italian") sourceLang = "it";
          if (sourceLang === "English") sourceLang = "en";
          
          if (targetLang === "Russian") targetLang = "ru";
          if (targetLang === "French") targetLang = "fr";
          if (targetLang === "Spanish") targetLang = "es";
          if (targetLang === "German") targetLang = "de";
          if (targetLang === "Italian") targetLang = "it";
          if (targetLang === "English") targetLang = "en";
          
          this.log(`TRANSLATION DEBUG - Converting from ${sourceLang} to ${targetLang}`);
          
          // Use translateBatch for better Android compatibility
          const translations = await translateBatch(
            this.simpleArray, 
            sourceLang,
            targetLang
          );
          
          if (translations && translations.length > 0) {
            this.log(`Translated ${translations.length} sentences to ${targetLang}`);
            this.log(`TRANSLATION DEBUG - First translated: "${translations[0].substring(0, 30)}..."`);
            
            // Store translations in the translated array
            this.translatedArray = translations;
          } else {
            this.log(`TRANSLATION ERROR - Translation API returned no results`);
          }
        } catch (error) {
          this.log(`TRANSLATION ERROR: ${error.message}, using fallback`);
        }
      } else {
        this.log(`No translation needed, languages match: ${this.readerStudyLanguage} === ${this.userLanguage}`);
      }
      
      this.simpleIndex = 0;
    } catch (error) {
      this.log(`Error in loadRawSentence: ${error.message}`);
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
    
    // DEBUG: Log what we're sending to the UI
    this.log(`DISPLAY DEBUG - showing sentence ${this.simpleIndex + 1}/${this.simpleArray.length}`);
    this.log(`DISPLAY DEBUG - foreign: "${currentSentence.substring(0, 30)}..."`);
    this.log(`DISPLAY DEBUG - translation: "${currentTranslation.substring(0, 30)}..."`);
    
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
      
      this.log(`Saving tracker state with key: ${trackerKey}, offset: ${this.tracker.offset}`);
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
          
          this.log(`Syncing with BookPipe tracker key: ${bookPipeTrackerKey}, offset: ${this.tracker.offset}`);
          await AsyncStorage.setItem(bookPipeTrackerKey, JSON.stringify(bookPipeTracker));
        }
      }
    } catch (error) {
      this.log(`Error saving tracker state: ${error.message}`);
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