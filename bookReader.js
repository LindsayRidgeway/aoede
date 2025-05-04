// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText } from './apiServices';
import { parseIntoSentences, detectLanguageCode } from './textProcessing';
import BookPipe from './bookPipeCore';
import { bookPipeProcess } from './bookPipeProcess';
import { Platform } from 'react-native';
import { getUserLibrary, getBookById } from './userLibrary';
import { debugLog } from './DebugPanel';
import { directTranslate } from './App';

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
    this.bookTextPlain = null;     // Plain text version of the book for sentence extraction
    this.anchorPosition = 0;       // Step 2: Position of anchor
    this.bookSentences = [];       // Step 3: Array of all sentences in the book after the anchor
    this.currentSentenceIndex = 0; // Current index in the bookSentences array
    this.currentCharOffset = 0;    // Current character offset in the original text
    this.bookLanguage = 'en';      // Language of the book
    this.studyLanguage = null;     // Language being studied
    this.simplifiedSentences = []; // Array of simplified sentences for the current sentence
    this.currentSimplifiedIndex = 0; // Index within the simplified sentences
    this.sentenceOffsets = [];     // Array to store character offsets for each sentence
    
    // Cache for translated sentences (UL translations)
    this.translationCache = {};    // Cache for translated sentences to avoid duplicate API calls
    this.isProcessing = false;     // Flag to track if processing is in progress
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
        
        // Set processing flag
        this.isProcessing = true;
        
        // Implement the simplified algorithm
        try {
          // Step 1: Load the entire book into memory
          await this.loadEntireBook(bookId);
          
          // Step 2: Find the anchor in the URL
          await this.findAnchor(bookId);
          
          // Step 3: Separate book into sentences AFTER the anchor position
          await this.extractSentences();
          
          // Step 4: Calculate character offsets for each sentence
          this.calculateSentenceOffsets();
          
          // Step 5: Identify the user's previous position using the tracker
          await this.identifyUserPosition(studyLanguage, bookId);
          
          // Step 6: Load the first sentence and simplify it
          await this.processCurrentSentence();
          
          // Step 7: Set up the initial display
          this.setupInitialDisplay();
          
          // Clear processing flag
          this.isProcessing = false;
          
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
          
          // Clear processing flag
          this.isProcessing = false;
          
          return false;
        }
      },
      
      advanceToNextSentence: async () => {
        debugLog('BookReader: readingManagement().advanceToNextSentence()');
        
        // If already processing, don't allow another operation
        if (this.isProcessing) {
          return false;
        }
        
        // Set processing flag
        this.isProcessing = true;
        
        try {
          // If we have more simplified sentences for the current original sentence
          if (this.currentSimplifiedIndex < this.simplifiedSentences.length - 1) {
            // Just move to the next simplified sentence
            this.currentSimplifiedIndex++;
            await this.updateDisplay();
            
            // Clear processing flag
            this.isProcessing = false;
            return true;
          }
          
          // If we're at the end of simplified sentences, move to the next original sentence
          if (this.currentSentenceIndex < this.bookSentences.length - 1) {
            this.currentSentenceIndex++;
            // Update the character offset
            this.currentCharOffset = this.sentenceOffsets[this.currentSentenceIndex];
            // Reset simplified index
            this.currentSimplifiedIndex = 0;
            // Process the new sentence
            await this.processCurrentSentence();
            // Update the display
            await this.updateDisplay();
            // Save the updated position
            await this.savePosition();
            
            // Clear processing flag
            this.isProcessing = false;
            return true;
          }
          
          // If we're at the end of the book
          debugLog("Reached the end of the book");
          
          // Clear processing flag
          this.isProcessing = false;
          return false;
        } catch (error) {
          // Clear processing flag on error
          this.isProcessing = false;
          throw error;
        }
      },
      
      goToPreviousSentence: async () => {
        debugLog('BookReader: readingManagement().goToPreviousSentence()');
        
        // If already processing, don't allow another operation
        if (this.isProcessing) {
          return false;
        }
        
        // Set processing flag
        this.isProcessing = true;
        
        try {
          // If we have previous simplified sentences for the current original sentence
          if (this.currentSimplifiedIndex > 0) {
            // Just move to the previous simplified sentence
            this.currentSimplifiedIndex--;
            await this.updateDisplay();
            
            // Clear processing flag
            this.isProcessing = false;
            return true;
          }
          
          // If we're at the beginning of simplified sentences but not at the first original sentence
          if (this.currentSentenceIndex > 0) {
            this.currentSentenceIndex--;
            // Update the character offset
            this.currentCharOffset = this.sentenceOffsets[this.currentSentenceIndex];
            // Process the new sentence
            await this.processCurrentSentence();
            // Set index to the last simplified sentence
            this.currentSimplifiedIndex = this.simplifiedSentences.length - 1;
            // Update the display
            await this.updateDisplay();
            // Save the updated position
            await this.savePosition();
            
            // Clear processing flag
            this.isProcessing = false;
            return true;
          }
          
          // If we're at the beginning of the book
          debugLog("At the beginning of the book");
          
          // Clear processing flag
          this.isProcessing = false;
          return false;
        } catch (error) {
          // Clear processing flag on error
          this.isProcessing = false;
          throw error;
        }
      },
      
      rewindBook: async () => {
        debugLog('BookReader: readingManagement().rewindBook()');
        
        // If already processing, don't allow another operation
        if (this.isProcessing) {
          return false;
        }
        
        // Set processing flag
        this.isProcessing = true;
        
        try {
          // Go back to the beginning of the book
          this.currentSentenceIndex = 0;
          this.currentCharOffset = 0;
          this.currentSimplifiedIndex = 0;
          
          // Process the first sentence
          await this.processCurrentSentence();
          
          // Update the display
          await this.updateDisplay();
          
          // Save the position
          await this.savePosition();
          
          // Clear processing flag
          this.isProcessing = false;
          return true;
        } catch (error) {
          // Clear processing flag on error
          this.isProcessing = false;
          throw error;
        }
      },
      
      getProgress: () => {
        debugLog('BookReader: readingManagement().getProgress()');
        // Return a simple progress object
        return {
          currentSentenceIndex: this.currentSentenceIndex,
          totalSentencesInBook: this.bookSentences.length,
          currentSimplifiedIndex: this.currentSimplifiedIndex,
          totalSimplifiedSentences: this.simplifiedSentences.length,
          hasMoreContent: this.currentSentenceIndex < this.bookSentences.length - 1 || 
                          this.currentSimplifiedIndex < this.simplifiedSentences.length - 1,
          isProcessing: this.isProcessing
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
      
      // Store the book language
      this.bookLanguage = book.language || 'en';
      
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
      
      // Store the HTML content for anchor searching
      this.bookText = htmlContent;
      
      // Extract plain text for sentence extraction
      this.bookTextPlain = bookPipeProcess.extractText(htmlContent);
      
      debugLog(`Book loaded successfully: ${this.bookText.length} characters`);
      return true;
    } catch (error) {
      debugLog(`Error loading entire book: ${error.message}`);
      this.bookText = null;
      this.bookTextPlain = null;
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
        match = anchorPatterns[i].exec(this.bookText);
        if (match) {
          patternIndex = i;
          debugLog(`Found anchor match with pattern ${i}`);
          break;
        }
      }
    
      if (match) {
        this.anchorPosition = match.index;
        debugLog(`Found anchor "${fragmentId}" at position ${this.anchorPosition}`);
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
  
  // Implementation of Step 3: Separate book into sentences AFTER THE ANCHOR POSITION
  async extractSentences() {
    debugLog(`BookReader: Step 3 - Extracting sentences from the book`);
    
    try {
      if (!this.bookTextPlain) {
        throw new Error("Book text not available");
      }
      
      // Get text AFTER the anchor position in plain text
      // First find where in the plain text the anchor corresponds to
      const htmlBeforeAnchor = this.bookText.substring(0, this.anchorPosition);
      const plainBeforeAnchor = bookPipeProcess.extractText(htmlBeforeAnchor);
      const plainTextAnchorPosition = plainBeforeAnchor.length;
      
      // Now get text after the anchor in plain text
      const textFromAnchor = this.bookTextPlain.substring(plainTextAnchorPosition);
      
      // Extract sentences using our improved method
      this.bookSentences = this.extractSentencesFromText(textFromAnchor);
      
      debugLog(`Extracted ${this.bookSentences.length} sentences from the book`);
      
      // Only log a sample of sentences to avoid flooding the debug log
      const sampleSize = Math.min(3, this.bookSentences.length);
      debugLog(`Sample of first ${sampleSize} sentences:`);
      for (let i = 0; i < sampleSize; i++) {
        const sentence = this.bookSentences[i];
        debugLog(`Sentence ${i + 1}: "${sentence}"`);
      }
      
      return true;
    } catch (error) {
      debugLog(`Error extracting sentences: ${error.message}`);
      this.bookSentences = [];
      throw error;
    }
  }
  
  // Calculate offsets for each sentence (for position tracking)
  calculateSentenceOffsets() {
    debugLog(`Calculating character offsets for each sentence`);
    
    this.sentenceOffsets = [];
    let currentOffset = 0;
    
    // For each sentence, store its starting offset
    for (let i = 0; i < this.bookSentences.length; i++) {
      this.sentenceOffsets.push(currentOffset);
      // Add the length of this sentence to the offset for the next sentence
      currentOffset += this.bookSentences[i].length;
    }
    
    debugLog(`Calculated offsets for ${this.sentenceOffsets.length} sentences`);
    return true;
  }
  
  // Helper method to extract sentences from text
  extractSentencesFromText(text) {
    // Prepare the text by normalizing whitespace
    const normalizedText = text.replace(/\r\n/g, '\n');
    
    // Split by paragraphs first to maintain structure
    const paragraphs = normalizedText.split(/\n\n+/);
    const sentences = [];
    
    // Regular expression to find sentences - end punctuation followed by space and capital letter
    // This is a simple pattern that will work for most cases
    const sentenceRegex = /[.!?][ \n]+[A-Z]/g;
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      // Find all potential sentence endings
      let lastIndex = 0;
      let match;
      
      // Copy of paragraph for manipulation
      let remainingText = paragraph;
      
      // First check if paragraph is a standalone sentence (no ending punctuation)
      if (!/[.!?]/.test(remainingText)) {
        sentences.push(remainingText.trim());
        continue;
      }
      
      // Find sentence boundaries
      while ((match = sentenceRegex.exec(remainingText)) !== null) {
        // The match includes the punctuation and the first letter of the next sentence
        // So we need to adjust to get just the sentence
        const endIndex = match.index + 1; // Include the punctuation
        
        if (endIndex > lastIndex) {
          const sentence = remainingText.substring(lastIndex, endIndex).trim();
          if (sentence.length > 0) {
            sentences.push(sentence);
          }
        }
        
        lastIndex = endIndex + 1; // Skip the space after punctuation
      }
      
      // Add the last sentence if there's anything left
      if (lastIndex < remainingText.length) {
        const lastSentence = remainingText.substring(lastIndex).trim();
        if (lastSentence.length > 0) {
          sentences.push(lastSentence);
        }
      }
    }
    
    return sentences;
  }
  
  // Implementation of Step 5: Identify the user's previous position
  async identifyUserPosition(studyLanguage, bookId) {
    debugLog(`BookReader: Step 5 - Identifying user position from tracker`);
    
    try {
      // Store the study language
      this.studyLanguage = studyLanguage;
      
      // Get book details
      const book = await getBookById(bookId);
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      const bookTitle = book.title;
      
      // Calculate tracker key
      const trackerKey = `book_tracker_${bookId}`;
      
      // Try to get the existing tracker
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const parsedTracker = JSON.parse(savedTracker);
          
          // Store tracker information
          this.tracker = {
            studyLanguage,
            bookTitle,
            offset: parsedTracker.offset || 0
          };
          this.trackerExists = true;
          
          // Get the offset from the tracker - this is the character offset in the book
          const offset = parsedTracker.offset || 0;
          this.currentCharOffset = offset;
          
          // Find the sentence index corresponding to this offset
          let foundIndex = false;
          for (let i = 0; i < this.sentenceOffsets.length; i++) {
            if (i + 1 < this.sentenceOffsets.length) {
              if (offset >= this.sentenceOffsets[i] && offset < this.sentenceOffsets[i + 1]) {
                this.currentSentenceIndex = i;
                foundIndex = true;
                break;
              }
            }
          }
          
          // If we didn't find a matching sentence, use the last sentence
          if (!foundIndex && this.sentenceOffsets.length > 0) {
            this.currentSentenceIndex = this.sentenceOffsets.length - 1;
          } else if (!foundIndex) {
            // Or the first if there are no sentences
            this.currentSentenceIndex = 0;
          }
          
          debugLog(`Found tracker with offset ${offset}. Starting at sentence index ${this.currentSentenceIndex}`);
        } catch (error) {
          // If there's an error parsing, create a new tracker
          debugLog(`Error parsing tracker, creating new one: ${error.message}`);
          this.tracker = {
            studyLanguage,
            bookTitle,
            offset: 0
          };
          this.trackerExists = true;
          this.currentSentenceIndex = 0;
          this.currentCharOffset = 0;
          await this.savePosition();
        }
      } else {
        // If no tracker exists, create a new one
        debugLog('No tracker found, creating new one');
        this.tracker = {
          studyLanguage,
          bookTitle,
          offset: 0
        };
        this.trackerExists = true;
        this.currentSentenceIndex = 0;
        this.currentCharOffset = 0;
        await this.savePosition();
      }
      
      return true;
    } catch (error) {
      debugLog(`Error identifying user position: ${error.message}`);
      
      // Default to starting from the beginning
      this.currentSentenceIndex = 0;
      this.currentCharOffset = 0;
      
      // Create a default tracker
      this.tracker = {
        studyLanguage,
        bookTitle: this.readerBookTitle || bookId,
        offset: 0
      };
      this.trackerExists = true;
      await this.savePosition();
      
      throw error;
    }
  }
  
  // Process the current sentence through the API
  async processCurrentSentence() {
    try {
      if (this.currentSentenceIndex >= this.bookSentences.length) {
        throw new Error("Invalid sentence index");
      }
      
      const sentence = this.bookSentences[this.currentSentenceIndex];
      
      // Make the API call for this single sentence
      const result = await this.processSentenceWithOpenAI(sentence);
      
      if (result) {
        return true;
      } else {
        // If API fails, use the original sentence as fallback
        this.simplifiedSentences = [sentence];
        return false;
      }
    } catch (error) {
      debugLog(`Error processing sentence: ${error.message}`);
      // Fallback to using the original sentence
      if (this.currentSentenceIndex < this.bookSentences.length) {
        this.simplifiedSentences = [this.bookSentences[this.currentSentenceIndex]];
      } else {
        this.simplifiedSentences = ["Error: Unable to process sentence"];
      }
      return false;
    }
  }
  
  // Process a single sentence with OpenAI API
  async processSentenceWithOpenAI(sentence) {
    debugLog(`Input to API: "${sentence}"`);
    
    try {
      // Import the simplification prompt using dynamic import
      let simplificationPrompt;
      try {
        const simplifierModule = await import('./simplifiers/simplify6.js');
        simplificationPrompt = simplifierModule.default;
      } catch (importError) {
        debugLog(`Error importing simplifier: ${importError.message}`);
        throw new Error("Could not load simplification prompt");
      }
      
      // Call the API using processSourceText from apiServices
      const processedText = await processSourceText(
        sentence, 
        this.bookLanguage, 
        this.studyLanguage, 
        this.userLanguage, 
        this.readingLevel
      );
      
      if (!processedText) {
        throw new Error("API returned empty response");
      }
      
      // Log the exact text returned from the API
      debugLog(`Output from API: "${processedText}"`);
      
      // Split the response into separate sentences by newlines
      const simplifiedSentences = processedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (simplifiedSentences.length === 0) {
        throw new Error("No valid sentences found in API response");
      }
      
      // Store the simplified sentences
      this.simplifiedSentences = simplifiedSentences;
      
      // Reset the simplified index to the first sentence
      this.currentSimplifiedIndex = 0;
      
      // Clear translation cache for this new set of sentences
      this.translationCache = {};
      
      return true;
    } catch (error) {
      debugLog(`API error: ${error.message}`);
      return false;
    }
  }
  
  
  
  /*
  // Simple direct translation using the OpenAI API
  async directTranslate(sentence) {
    try {
      // Check if we already have a translation for this sentence
      if (this.translationCache[sentence]) {
        return this.translationCache[sentence];
      }
      
      // Create a simple translation prompt
      const translationPrompt = `Translate the input sentence from ${this.studyLanguage} to ${this.userLanguage}. Return only the translated sentence, with no comments or other output.

Input:
${sentence}`;
      
      // Call the OpenAI API directly for translation
      const result = await processSourceText(
        translationPrompt,
        'en', // Prompt is in English
	  );
      
      if (!result) {
        throw new Error("Translation API returned empty response");
      }
      
      // Clean up the response (remove any extra newlines or whitespace)
      const translation = result.trim();
      
      // Store in cache
      this.translationCache[sentence] = translation;
      
      return translation;
    } catch (error) {
      debugLog(`Translation error: ${error.message}`);
      return sentence; // Fallback to original sentence
    }
  }
  */
  
  // Update the display with the current sentence
  async updateDisplay() {
    try {
      if (this.simplifiedSentences.length === 0) {
        // Use the original sentence as fallback
        if (this.currentSentenceIndex < this.bookSentences.length) {
          const originalSentence = this.bookSentences[this.currentSentenceIndex];
          this.simpleArray = [originalSentence];
          this.translatedArray = [originalSentence];
        } else {
          this.simpleArray = ["No content available"];
          this.translatedArray = ["No content available"];
        }
      } else {
        // Use the current simplified sentence
        const currentSimplified = this.simplifiedSentences[this.currentSimplifiedIndex];
        this.simpleArray = [currentSimplified];
        
        // Get translation to user language
		/*
        const translatedSentence = await this.directTranslate(currentSimplified);
		*/
		
        const translatedSentence = await directTranslate(currentSimplified, this.studyLanguage, this.userLanguage);
		
        // Make sure we only have a single-line translation (fixes duplicate sentence issue)
        const cleanedTranslation = translatedSentence.split('\n')[0].trim();
        this.translatedArray = [cleanedTranslation];
      }
      
      // Call the callback to update the UI
      if (this.onSentenceProcessed) {
        this.onSentenceProcessed(
          this.simpleArray[0], 
          this.translatedArray[0]
        );
      }
      
      return true;
    } catch (error) {
      debugLog(`Error updating display: ${error.message}`);
      
      // Set fallback content
      this.simpleArray = [`Error: ${error.message}`];
      this.translatedArray = [`Error: ${error.message}`];
      
      // Call the callback
      if (this.onSentenceProcessed) {
        this.onSentenceProcessed(
          this.simpleArray[0], 
          this.translatedArray[0]
        );
      }
      
      return false;
    }
  }
  
  // Implementation of Step 7: Set up initial display
  setupInitialDisplay() {
    debugLog(`BookReader: Step 7 - Setting up initial display`);
    
    // Just call updateDisplay to show the current sentence
    return this.updateDisplay();
  }
  
  // Save the current position to AsyncStorage
  async savePosition() {
    try {
      if (!this.trackerExists) return false;
      
      if (this.reader && this.reader.bookId) {
        // Save the current character offset
        const trackerKey = `book_tracker_${this.reader.bookId}`;
        const tracker = {
          bookId: this.reader.bookId,
          offset: this.currentCharOffset
        };
        
        await AsyncStorage.setItem(trackerKey, JSON.stringify(tracker));
        return true;
      }
      return false;
    } catch (error) {
      debugLog(`Error saving position: ${error.message}`);
      return false;
    }
  }

  // Reset function for Aoede 3.0
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
    this.bookTextPlain = null;
    this.anchorPosition = 0;
    this.bookSentences = [];
    this.currentSentenceIndex = 0;
    this.currentCharOffset = 0;
    this.bookLanguage = 'en';
    this.studyLanguage = null;
    this.simplifiedSentences = [];
    this.currentSimplifiedIndex = 0;
    this.sentenceOffsets = [];
    this.translationCache = {};
    this.isProcessing = false;
  }

  // Legacy methods kept for backward compatibility
  
  async handleLoadBook(studyLanguage, bookId) {
    // Redirect to new implementation
    const readerInterface = this.readingManagement();
    return await readerInterface.loadBook(studyLanguage, bookId);
  }

  async handleNextSentence() {
    // Redirect to new implementation
    const readerInterface = this.readingManagement();
    return await readerInterface.advanceToNextSentence();
  }

  async handleRewind() {
    // Redirect to new implementation
    const readerInterface = this.readingManagement();
    return await readerInterface.rewindBook();
  }

  getProgress() {
    // Redirect to new implementation
    const readerInterface = this.readingManagement();
    return readerInterface.getProgress();
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