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
    
    console.log('[BookReader] Constructor called - initialized with default state');
  }
  
  // Initialize the reader with callback for sentence processing
  initialize(callback, userLanguage = 'en') {
    console.log(`[BookReader] Initialize called with userLanguage: ${userLanguage}`);
    this.onSentenceProcessed = callback;
    this.userLanguage = userLanguage;
    return this;
  }
  
  // Set reading level
  setReadingLevel(level) {
    console.log(`[BookReader] Setting reading level to: ${level}`);
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
    console.log(`[BookReader] Looking for tracker with key: ${trackerKey}`);
    
    try {
      // DEBUG: List all keys in AsyncStorage
      console.log('[BookReader] Listing all AsyncStorage keys:');
      const allKeys = await AsyncStorage.getAllKeys();
      console.log(allKeys);
      
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      console.log(`[BookReader] Retrieved from AsyncStorage: ${savedTracker}`);
      
      if (savedTracker) {
        try {
          this.tracker = JSON.parse(savedTracker);
          this.trackerExists = true;
          console.log(`[BookReader] Found existing tracker with offset: ${this.tracker.offset}`);
          console.log(`[BookReader] Full tracker object: ${JSON.stringify(this.tracker)}`);
        } catch (parseError) {
          console.error(`[BookReader] Error parsing tracker: ${parseError}`);
          console.log(`[BookReader] Raw tracker data: ${savedTracker}`);
          
          // Create new tracker if parsing fails
          this.tracker = {
            studyLanguage: studyLanguage,
            bookTitle: bookTitle,
            offset: 0
          };
          this.trackerExists = true;
          console.log(`[BookReader] Created new tracker due to parse error`);
          
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
        console.log(`[BookReader] Created new tracker`);
        console.log(`[BookReader] New tracker object: ${JSON.stringify(this.tracker)}`);
        
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
      console.log(`[BookReader] Created new tracker due to error`);
      
      // Immediately save the newly created tracker to persistent storage
      await this.saveTrackerState();
    }
    
    // Close existing reader if we have one
    if (this.reader !== null) {
      console.log(`[BookReader] Closing existing reader`);
      BookPipe.reset();
      this.reader = null;
    }
    
    // Initialize the reader with the book
    try {
      // Find the book in our sources
      const bookSource = bookSources.find(book => book.title === bookTitle);
      
      if (!bookSource) {
        console.error(`[BookReader] Book not found: ${bookTitle}`);
        throw new Error(`Book not found: ${bookTitle}`);
      }
      
      const bookId = bookSource.id;
      console.log(`[BookReader] Found book ID: ${bookId} for title: ${bookTitle}`);
      
      // Initialize BookPipe with book ID
      console.log(`[BookReader] Calling BookPipe.initialize with bookId: ${bookId}`);
      await BookPipe.initialize(bookId);
      
      // Set reader to initialized state
      this.reader = BookPipe;
      this.readerStudyLanguage = studyLanguage;
      this.readerBookTitle = bookTitle;
      
      // IMPORTANT: If we have a saved offset, explicitly skip forward
      if (this.tracker.offset > 0) {
        console.log(`[BookReader] We have a saved offset: ${this.tracker.offset}, explicitly skipping forward`);
        
        // Since BookPipe doesn't have a direct skip method, we need to simulate it
        // by manipulating the internal state or processing chunks until we reach
        // the desired position
        
        // For this implementation, we'll use BookPipe's internal saved position
        // mechanism which is keyed by bookId
        const storageKey = `book_position_${bookId}`;
        console.log(`[BookReader] Setting BookPipe position with key: ${storageKey} to offset: ${this.tracker.offset}`);
        
        try {
          // Store the offset in BookPipe's expected storage key
          await AsyncStorage.setItem(storageKey, this.tracker.offset.toString());
          
          // Force BookPipe to reload with this position
          await BookPipe.reset();
          await BookPipe.initialize(bookId);
          
          console.log(`[BookReader] BookPipe reinitialized with saved position`);
          
          // DEBUG: Check if BookPipe's state reflects our saved position
          const bookPipeProgress = BookPipe.getProgress();
          console.log(`[BookReader] BookPipe progress after position update: ${JSON.stringify(bookPipeProgress)}`);
        } catch (positionError) {
          console.error(`[BookReader] Error setting BookPipe position: ${positionError}`);
          // Continue without position - at least we tried
        }
      } else {
        console.log(`[BookReader] No saved offset, starting from beginning`);
      }
    } catch (error) {
      console.error(`[BookReader] Error initializing reader: ${error}`);
      throw error;
    }
    
    // Load the first sentence
    console.log(`[BookReader] Calling loadRawSentence()`);
    await this.loadRawSentence();
    
    // Process the first sentence
    console.log(`[BookReader] Calling processSimpleSentence()`);
    this.processSimpleSentence();
    
    return true;
  }
  
  // Handle Next Sentence button
  async handleNextSentence() {
    console.log(`[BookReader] handleNextSentence called`);
    
    if (!this.trackerExists) {
      console.log(`[BookReader] No tracker exists, cannot get next sentence`);
      return false;
    }
    
    // Check if we have more sentences in the current simple array
    if (this.simpleIndex < (this.simpleArray.length - 1)) {
      console.log(`[BookReader] Moving to next sentence in memory (${this.simpleIndex + 1} of ${this.simpleArray.length})`);
      this.simpleIndex++;
    } else {
      console.log(`[BookReader] At end of current batch, need to load new block of text`);
      console.log(`[BookReader] Current offset before update: ${this.tracker.offset}`);
      
      // Update offset in tracker
      this.tracker.offset += this.rawSentenceSize;
      console.log(`[BookReader] Updated offset to: ${this.tracker.offset} (added ${this.rawSentenceSize} bytes)`);
      
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
    console.log(`[BookReader] handleRewind called`);
    
    if (!this.trackerExists) {
      console.log(`[BookReader] No tracker exists, cannot rewind`);
      return false;
    }
    
    console.log(`[BookReader] Rewinding book to beginning`);
    console.log(`[BookReader] Current offset before rewind: ${this.tracker.offset}`);
    
    try {
      // 1. Reset tracker offset in our object
      this.tracker.offset = 0;
      console.log(`[BookReader] Reset offset to 0`);
      
      // 2. Save tracker state with reset offset
      await this.saveTrackerState();
      
      // 3. IMPORTANT: Reset BookPipe's internal position tracking
      if (this.reader) {
        const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
        if (bookSource) {
          const bookId = bookSource.id;
          const storageKey = `book_position_${bookId}`;
          
          console.log(`[BookReader] Resetting BookPipe position with key: ${storageKey}`);
          
          // Force position to 0 in BookPipe's storage
          await AsyncStorage.removeItem(storageKey);
          await AsyncStorage.setItem(storageKey, "0");
          
          // Reset the BookPipe object
          console.log(`[BookReader] Resetting BookPipe object`);
          BookPipe.reset();
        }
      }
      
      // 4. Reload the book from the beginning
      console.log(`[BookReader] Reloading book from beginning`);
      return this.handleLoadBook(this.tracker.studyLanguage, this.tracker.bookTitle);
      
    } catch (error) {
      console.error(`[BookReader] Error during rewind: ${error}`);
      return false;
    }
  }
  
  // Load and process next raw sentence
  async loadRawSentence() {
    console.log(`[BookReader] loadRawSentence called`);
    
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
      console.log(`[BookReader] Getting next batch of ${batchSize} sentences from BookPipe`);
      
      // Get BookPipe state before getting batch
      const beforeProgress = this.reader.getProgress();
      console.log(`[BookReader] BookPipe progress before getNextBatch: ${JSON.stringify(beforeProgress)}`);
      
      const rawSentences = await this.reader.getNextBatch(batchSize);
      
      // Get BookPipe state after getting batch
      const afterProgress = this.reader.getProgress();
      console.log(`[BookReader] BookPipe progress after getNextBatch: ${JSON.stringify(afterProgress)}`);
      
      if (!rawSentences || rawSentences.length === 0) {
        console.log(`[BookReader] No more sentences available`);
        this.simpleArray = ["No more sentences available."];
        this.translatedArray = ["No more sentences available."];
        this.simpleIndex = 0;
        this.rawSentenceSize = 0;
        return;
      }
      
      console.log(`[BookReader] Got ${rawSentences.length} raw sentences`);
      
      // Join the raw sentences for processing
      const rawText = rawSentences.join(' ');
      this.rawSentenceSize = rawText.length;
      console.log(`[BookReader] Raw text size: ${this.rawSentenceSize} bytes`);
      
      // 1. FIRST TRANSLATE to the study language if the book is not already in that language
      let textForSimplification = rawText;
      const bookSource = bookSources.find(book => book.title === this.readerBookTitle);
      
      if (bookSource && bookSource.language !== this.readerStudyLanguage) {
        console.log(`[BookReader] Book language (${bookSource.language}) differs from study language (${this.readerStudyLanguage})`);
        console.log(`[BookReader] Translating text from ${bookSource.language} to ${this.readerStudyLanguage}`);
        try {
          // Translate the text to the study language
          const sourceLanguageCode = detectLanguageCode(bookSource.language);
          const targetLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          console.log(`[BookReader] Source language code: ${sourceLanguageCode}, target language code: ${targetLanguageCode}`);
          
          // If we have valid language codes, proceed with translation
          if (sourceLanguageCode && targetLanguageCode && sourceLanguageCode !== targetLanguageCode) {
            const translatedText = await translateBatch([rawText], sourceLanguageCode, targetLanguageCode);
            
            if (translatedText && translatedText.length > 0) {
              textForSimplification = translatedText[0];
              console.log(`[BookReader] Successfully translated text to ${this.readerStudyLanguage}`);
            } else {
              console.log(`[BookReader] Translation failed or returned empty result, using original text`);
            }
          } else {
            console.log(`[BookReader] Invalid language codes or same language, skipping translation`);
          }
        } catch (error) {
          console.error(`[BookReader] Error translating to study language: ${error}`);
          console.log(`[BookReader] Using original text as fallback`);
          // Continue with original text as fallback
        }
      } else {
        console.log(`[BookReader] Book already in study language (${this.readerStudyLanguage}), skipping translation`);
      }
      
      // 2. THEN SIMPLIFY the text in the study language
      console.log(`[BookReader] Simplifying text with reading level ${this.readingLevel}`);
      const processedText = await processSourceText(textForSimplification, this.readerStudyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
        console.log(`[BookReader] Failed to simplify text, falling back to original`);
        // Use the text we have as fallback (already in study language from previous step)
        this.simpleArray = parseIntoSentences(textForSimplification);
        console.log(`[BookReader] Parsed ${this.simpleArray.length} sentences from original text`);
      } else {
        // Split the processed text into individual sentences
        this.simpleArray = processedText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        console.log(`[BookReader] Split simplified text into ${this.simpleArray.length} sentences`);
        
        // If that didn't work well, try another method
        if (this.simpleArray.length < 3) {
          console.log(`[BookReader] Few sentences detected, trying alternative parsing`);
          this.simpleArray = parseIntoSentences(processedText);
          console.log(`[BookReader] Alternative parsing yielded ${this.simpleArray.length} sentences`);
        }
      }
      
      // 3. TRANSLATE the simplified sentences to user's language
      try {
        if (this.readerStudyLanguage !== this.userLanguage) {
          console.log(`[BookReader] Translating simplified sentences from ${this.readerStudyLanguage} to user language: ${this.userLanguage}`);
          const studyLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          const userLanguageCode = this.userLanguage;
          console.log(`[BookReader] Study language code: ${studyLanguageCode}, user language code: ${userLanguageCode}`);
          
          this.translatedArray = await translateBatch(this.simpleArray, studyLanguageCode, userLanguageCode);
          
          if (!this.translatedArray || this.translatedArray.length === 0) {
            console.log(`[BookReader] Translation to user language failed, using original sentences`);
            // Fallback to original sentences if translation fails
            this.translatedArray = [...this.simpleArray];
          } else {
            console.log(`[BookReader] Successfully translated ${this.translatedArray.length} sentences to user language`);
          }
        } else {
          console.log(`[BookReader] Study language same as user language, skipping translation`);
          // If study language is the same as user language, no need to translate
          this.translatedArray = [...this.simpleArray];
        }
      } catch (error) {
        console.error(`[BookReader] Error translating to user language: ${error}`);
        console.log(`[BookReader] Using simplified sentences as fallback`);
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
    console.log(`[BookReader] processSimpleSentence called`);
    
    if (!this.simpleArray || this.simpleArray.length === 0) {
      console.log(`[BookReader] No sentences to process`);
      return;
    }
    
    // Get the current sentence and its translation
    const currentSentence = this.simpleArray[this.simpleIndex];
    const currentTranslation = this.translatedArray[this.simpleIndex] || currentSentence;
    
    console.log(`[BookReader] Processing sentence ${this.simpleIndex + 1} of ${this.simpleArray.length}`);
    console.log(`[BookReader] Current sentence (first 50 chars): ${currentSentence.substring(0, 50)}...`);
    console.log(`[BookReader] Current translation (first 50 chars): ${currentTranslation.substring(0, 50)}...`);
    
    // Submit to the callback for display and TTS
    if (typeof this.onSentenceProcessed === 'function') {
      console.log(`[BookReader] Calling sentence processed callback`);
      this.onSentenceProcessed(currentSentence, currentTranslation);
    } else {
      console.error(`[BookReader] No callback defined for sentence processing`);
    }
  }
  
  // Save the tracker state to persistent storage
  async saveTrackerState() {
    console.log(`[BookReader] saveTrackerState called`);
    
    if (!this.trackerExists) {
      console.log(`[BookReader] No tracker exists, nothing to save`);
      return;
    }
    
    try {
      const trackerKey = `book_tracker_${this.tracker.studyLanguage}_${this.tracker.bookTitle}`;
      const trackerJSON = JSON.stringify(this.tracker);
      console.log(`[BookReader] Saving tracker with key: ${trackerKey}`);
      console.log(`[BookReader] Tracker data to save: ${trackerJSON}`);
      
      await AsyncStorage.setItem(trackerKey, trackerJSON);
      console.log(`[BookReader] Successfully saved tracker state with offset: ${this.tracker.offset}`);
      
      // Verify the save by reading it back
      const verifyData = await AsyncStorage.getItem(trackerKey);
      console.log(`[BookReader] Verification read: ${verifyData}`);
      
      if (verifyData === trackerJSON) {
        console.log(`[BookReader] Verification successful - data matches`);
      } else {
        console.log(`[BookReader] Verification warning - saved data doesn't match what we tried to save`);
      }
    } catch (error) {
      console.error(`[BookReader] Error saving tracker state: ${error}`);
    }
  }
  
  // Get current progress information
  getProgress() {
    const progress = {
      bookTitle: this.tracker.bookTitle,
      studyLanguage: this.tracker.studyLanguage,
      currentOffset: this.tracker.offset,
      currentSentenceIndex: this.simpleIndex,
      totalSentencesInMemory: this.simpleArray.length,
      hasMoreContent: this.reader ? this.reader.hasMoreSentences() : false
    };
    
    console.log(`[BookReader] getProgress called, returning: ${JSON.stringify(progress)}`);
    return progress;
  }
  
  // Reset all state
  reset() {
    console.log(`[BookReader] reset called`);
    
    this.tracker = {
      studyLanguage: null,
      bookTitle: null,
      offset: 0
    };
    this.trackerExists = false;
    
    if (this.reader) {
      console.log(`[BookReader] Resetting BookPipe`);
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
    
    console.log(`[BookReader] Reset complete`);
  }
}

// Export a singleton instance
export default new BookReader();