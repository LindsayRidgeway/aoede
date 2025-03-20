// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode, translateSentences } from './textProcessing';
import { bookSources, getBookSourceById } from './bookSources';
import BookPipe from './bookPipeCore';

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
      // Update offset in tracker
      this.tracker.offset += this.rawSentenceSize;
      this.log(`Loading more content, updated offset to: ${this.tracker.offset}`);
      
      // IMPORTANT: Save the updated tracker to persistent storage immediately
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
          this.log(`Set rewind flag in BookPipe`);
        }
      }
      
      // 4. Reload the book from the beginning
      return this.handleLoadBook(this.tracker.studyLanguage, this.tracker.bookTitle);
      
    } catch (error) {
      this.log(`Error during rewind: ${error.message}`);
      return false;
    }
  }
  
  // Function to check if a string is mostly in the target language or not
  // Returns true if the text appears to be in the target language
  isInTargetLanguage(text, targetLangCode) {
    if (!text || !targetLangCode) return true;
    
    // Simple check based on common words in different languages
    const commonWords = {
      'it': ['di', 'e', 'il', 'la', 'in', 'un', 'una', 'che', 'è', 'per', 'con', 'non', 'sono'],
      'es': ['el', 'la', 'de', 'en', 'y', 'a', 'que', 'por', 'con', 'no', 'una', 'los', 'se', 'es'],
      'fr': ['le', 'la', 'de', 'et', 'en', 'un', 'une', 'du', 'des', 'à', 'que', 'qui', 'pas', 'sur'],
      'de': ['der', 'die', 'das', 'und', 'in', 'zu', 'von', 'mit', 'auf', 'für', 'ist', 'nicht', 'ein', 'eine']
      // Add more languages as needed
    };
    
    // If we don't have a check for this language, assume it's correct
    if (!commonWords[targetLangCode]) return true;
    
    // Check if any of the common words for the target language appear in the text
    const words = text.toLowerCase().split(/\s+/);
    const matches = words.filter(word => commonWords[targetLangCode].includes(word));
    
    // If we have at least 2 common words matching, it's likely in the target language
    return matches.length >= 2;
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
      let studyLanguageText = null;
      
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
              studyLanguageText = translatedText[0]; // Save the pure translation for verification
            }
          }
        } catch (error) {
          // Continue with original text as fallback
        }
      } else {
        // Book is already in study language
        studyLanguageText = rawText;
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
      
      // 3. VERIFY that our simplified text is actually in the target language
      // This is crucial! If Claude returns English despite being asked for Italian,
      // we need to force a new translation to the study language
      
      // Check a sample of the simplified sentences
      const studyLanguageCode = detectLanguageCode(this.readerStudyLanguage);
      let needsRetranslation = false;
      
      // Only check if we have a valid language code to test against
      if (studyLanguageCode && ['it', 'es', 'fr', 'de'].includes(studyLanguageCode)) {
        // Take the first sentence as a sample
        const sampleSentence = this.simpleArray[0];
        
        // If sample doesn't appear to be in the target language, mark for retranslation
        if (sampleSentence && !this.isInTargetLanguage(sampleSentence, studyLanguageCode)) {
          needsRetranslation = true;
        }
      }
      
      // If needed, re-translate the simplified sentences to the study language
      if (needsRetranslation && studyLanguageCode) {
        try {
          // Re-translate from English to the study language
          const fixedTranslation = await translateBatch(this.simpleArray, 'en', studyLanguageCode);
          
          if (fixedTranslation && fixedTranslation.length > 0) {
            this.simpleArray = fixedTranslation;
          }
        } catch (error) {
          // Continue with what we have if re-translation fails
        }
      }
      
      // 3. TRANSLATE the simplified sentences to user's language
      try {
        if (this.readerStudyLanguage !== this.userLanguage) {
          const studyLanguageCode = detectLanguageCode(this.readerStudyLanguage);
          const userLanguageCode = this.userLanguage;
          
          // One more check to ensure we actually need translation
          if (studyLanguageCode !== userLanguageCode) {
            // Directly use full translateSentences to ensure all needed translation
            this.translatedArray = await translateSentences(this.simpleArray, studyLanguageCode, userLanguageCode);
            
            // Safety check - if translations look identical to originals, try one more approach
            const firstSimple = this.simpleArray[0];
            const firstTranslated = this.translatedArray[0];
            
            if (firstSimple === firstTranslated && firstSimple && firstSimple.length > 5) {
              // Last resort: force a direct translation with translateBatch
              try {
                const forcedTranslations = await translateBatch(this.simpleArray, studyLanguageCode, userLanguageCode);
                if (forcedTranslations && forcedTranslations.length > 0) {
                  this.translatedArray = forcedTranslations;
                }
              } catch (innerError) {
                // Keep the unchanged result if this fails
              }
            }
            
            // If translations still failed completely, use original
            if (!this.translatedArray || this.translatedArray.length === 0) {
              this.translatedArray = [...this.simpleArray];
            }
          } else {
            // If codes are identical, no need to translate
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