// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode, translateSentences } from './textProcessing';
import BookPipe from './bookPipeCore';
import { bookPipeProcess } from './bookPipeProcess';
import { Platform } from 'react-native';
import { getUserLibrary, getBookById } from './userLibrary';
import { debugLog } from './DebugPanel';

const CHUNK_SIZE = 1000;  // Size of chunks for processing

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
    this.currentSentenceOffset = 0; // Step 4: Current sentence offset in book
    this.sentenceChunks = [];      // Step 5: Array of chunks of sentences
    this.currentChunkIndex = 0;    // Current chunk being processed
    this.chunkSentenceArray = [];  // Array of processed sentences for current chunk
    this.simplifiedSentenceArray = []; // Array of simplified sentences with yes/no flags
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
        
        // FOR TESTING ONLY: Wipe out the tracking block for this book
        try {
          const trackerKey = `book_tracker_${bookId}`;
          await AsyncStorage.removeItem(trackerKey);
          debugLog(`TEST MODE: Removed tracking for book ${bookId}`);
        } catch (error) {
          debugLog(`Error removing tracker: ${error.message}`);
        }
        
        // Implement steps 1-8 of our algorithm
        try {
          // Step 1: Load the entire book into memory
          await this.loadEntireBook(bookId);
          
          // Step 2: Find the anchor in the URL
          await this.findAnchor(bookId);
          
          // Step 3: Separate book into sentences AFTER the anchor position
          await this.extractSentences();
          
          // Step 4: Identify the user's previous position using the tracker
          await this.identifyUserPosition(studyLanguage, bookId);
          
          // Step 5: Divide sentences into chunks
          this.divideSentencesIntoChunks();
          
          // Step 6-7: Determine which chunk contains the user's position and process it
          await this.processChunk(studyLanguage);
          
          // Step 8: Set up the initial display
          this.setupInitialDisplay();
          
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
        // To be implemented later
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
        // To be implemented later
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
          hasMoreContent: this.currentChunkIndex < this.sentenceChunks.length - 1
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
      
      // TEST: Log ALL sentences
      for (let i = 0; i < this.bookSentences.length; i++) {
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
  
  // Implementation of Step 4: Identify the user's previous position
  async identifyUserPosition(studyLanguage, bookId) {
    debugLog(`BookReader: Step 4 - Identifying user position from tracker`);
    
    try {
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
          
          // For now, we'll set the currentSentenceOffset to 0
          // In a future implementation, we would determine the sentence 
          // corresponding to the character offset
          this.currentSentenceOffset = 0;
          
          debugLog(`Found tracker with offset ${offset}. Starting at sentence index ${this.currentSentenceOffset}`);
        } catch (error) {
          // If there's an error parsing, create a new tracker
          debugLog(`Error parsing tracker, creating new one: ${error.message}`);
          this.tracker = {
            studyLanguage,
            bookTitle,
            offset: 0
          };
          this.trackerExists = true;
          this.currentSentenceOffset = 0;
          await this.saveTrackerState();
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
        this.currentSentenceOffset = 0;
        await this.saveTrackerState();
      }
      
      return true;
    } catch (error) {
      debugLog(`Error identifying user position: ${error.message}`);
      
      // Default to starting from the beginning
      this.currentSentenceOffset = 0;
      
      // Create a default tracker
      this.tracker = {
        studyLanguage,
        bookTitle: this.readerBookTitle || bookId,
        offset: 0
      };
      this.trackerExists = true;
      await this.saveTrackerState();
      
      throw error;
    }
  }
  
  // Implementation of Step 5: Divide sentences into chunks
  divideSentencesIntoChunks() {
    debugLog(`BookReader: Step 5 - Dividing sentences into chunks`);
    
    try {
      if (!this.bookSentences || this.bookSentences.length === 0) {
        throw new Error("No sentences available to divide into chunks");
      }
      
      const chunks = [];
      let currentChunk = [];
      let currentChunkSize = 0;
      let chunkStartIndex = 0;
      
      // Process all sentences into chunks of appropriate size
      for (let i = 0; i < this.bookSentences.length; i++) {
        const sentence = this.bookSentences[i];
        
        // If adding this sentence would exceed the chunk size and we already have sentences
        // in the current chunk, then start a new chunk
        if (currentChunkSize + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
          chunks.push({
            startIndex: chunkStartIndex,
            endIndex: i - 1,
            sentences: currentChunk
          });
          
          chunkStartIndex = i;
          currentChunk = [sentence];
          currentChunkSize = sentence.length;
        } else {
          // Otherwise, add the sentence to the current chunk
          currentChunk.push(sentence);
          currentChunkSize += sentence.length;
        }
      }
      
      // Add the last chunk if it has any sentences
      if (currentChunk.length > 0) {
        chunks.push({
          startIndex: chunkStartIndex,
          endIndex: this.bookSentences.length - 1,
          sentences: currentChunk
        });
      }
      
      this.sentenceChunks = chunks;
      
      debugLog(`Divided sentences into ${chunks.length} chunks`);
      
      // Log stats about the first chunk
      if (chunks.length > 0) {
        const firstChunk = chunks[0];
        debugLog(`First chunk: ${firstChunk.sentences.length} sentences, indices ${firstChunk.startIndex}-${firstChunk.endIndex}`);
      }
      
      return true;
    } catch (error) {
      debugLog(`Error dividing sentences into chunks: ${error.message}`);
      this.sentenceChunks = [];
      throw error;
    }
  }
  
  // Implementation of Steps 6-7: Process the chunk
  async processChunk(studyLanguage) {
    debugLog(`BookReader: Steps 6-7 - Processing chunk`);
    
    try {
      if (!this.sentenceChunks || this.sentenceChunks.length === 0) {
        throw new Error("No chunks available to process");
      }
      
      // Determine which chunk contains the current sentence offset
      let chunkIndex = 0;
      for (let i = 0; i < this.sentenceChunks.length; i++) {
        const chunk = this.sentenceChunks[i];
        if (this.currentSentenceOffset >= chunk.startIndex && 
            this.currentSentenceOffset <= chunk.endIndex) {
          chunkIndex = i;
          break;
        }
      }
      
      this.currentChunkIndex = chunkIndex;
      
      // Get the current chunk
      const currentChunk = this.sentenceChunks[this.currentChunkIndex];
      
      debugLog(`Processing chunk ${this.currentChunkIndex} with ${currentChunk.sentences.length} sentences`);
      
      // Get the book language
      let bookLanguage = 'en';
      if (this.reader?.bookId) {
        const book = await getBookById(this.reader.bookId);
        if (book) {
          bookLanguage = book.language || 'en';
        }
      }
      
      // Store the sentences
      this.chunkSentenceArray = currentChunk.sentences;
      
      // TEST: Log all sentences in the chunk
      debugLog(`All sentences in current chunk:`);
      for (let i = 0; i < this.chunkSentenceArray.length; i++) {
        debugLog(`Chunk sentence ${i + 1}: "${this.chunkSentenceArray[i]}"`);
      }
      
      // Process with the OpenAI API (Steps 9-10)
      await this.processChunkWithOpenAI(studyLanguage, bookLanguage);
      
      return true;
    } catch (error) {
      debugLog(`Error processing chunk: ${error.message}`);
      
      // Create a basic sentence array as fallback
      const currentChunk = this.sentenceChunks[this.currentChunkIndex];
      this.simplifiedSentenceArray = currentChunk.sentences.map(sentence => ({
        text: sentence,
        isFirstOfGroup: true
      }));
      
      // Update display arrays
      this.simpleArray = currentChunk.sentences;
      this.translatedArray = currentChunk.sentences;
      
      return false;
    }
  }
  
  // Implementation of Steps 9-10: Process the chunk with OpenAI API
  async processChunkWithOpenAI(studyLanguage, bookLanguage) {
    debugLog(`BookReader: Steps 9-10 - Processing chunk with OpenAI API for translation/simplification`);
    
    try {
      if (!this.chunkSentenceArray || this.chunkSentenceArray.length === 0) {
        throw new Error("No chunk sentences available to process");
      }
      
      const originalSentences = this.chunkSentenceArray;
      
      debugLog(`Submitting ${originalSentences.length} sentences to OpenAI API`);
      
      // Combine all sentences for the API call
      const sourceText = originalSentences.join(' ');
      
      // Log the exact text being sent to the API
      debugLog(`Exact text sent to API: "${sourceText}"`);
      
      // Call OpenAI API to process the text
      try {
        debugLog(`Calling OpenAI API with reading level ${this.readingLevel}`);
        
        // Import the simplification prompt using dynamic import
        let simplificationPrompt;
        try {
          const simplifierModule = await import('./simplifiers/simplify6.js');
          simplificationPrompt = simplifierModule.default;
        } catch (importError) {
          debugLog(`Error importing simplifier: ${importError.message}`);
          throw new Error("Could not load simplification prompt");
        }
        
        // Generate the prompt
        const prompt = simplificationPrompt(sourceText, bookLanguage, studyLanguage);
        
        // Call the API using processSourceText from apiServices
        const processedText = await processSourceText(
          sourceText, 
          bookLanguage, 
          studyLanguage, 
          this.userLanguage, 
          this.readingLevel
        );
        
        if (!processedText) {
          throw new Error("API returned empty response");
        }
        
        // Log the exact text returned from the API
        debugLog(`Exact text returned from API: "${processedText}"`);
        
        debugLog(`API call successful, processing results`);
        
        // Parse the response into the simplifiedSentenceArray
        this.simplifiedSentenceArray = this.parseApiResponse(processedText);
        
        // Count 'yes' flags for verification
        const yesCount = this.simplifiedSentenceArray.filter(item => item.isFirstOfGroup).length;
        
        // Log the verification results
        debugLog(`Original sentences: ${originalSentences.length}, Sentences with 'yes' flag: ${yesCount}`);
        
        if (originalSentences.length !== yesCount) {
          debugLog(`INCORRECT SIMPLIFICATION: The number of 'yes' flags (${yesCount}) does not match the number of original sentences (${originalSentences.length})`);
        } else {
          debugLog(`Correct simplification: The number of 'yes' flags matches the number of original sentences`);
        }
        
        // TEST: Log ALL simplified sentences with their flags
        debugLog(`All simplified sentences:`);
        for (let i = 0; i < this.simplifiedSentenceArray.length; i++) {
          const sample = this.simplifiedSentenceArray[i];
          debugLog(`[${sample.isFirstOfGroup ? 'YES' : 'NO'}] "${sample.text}"`);
        }
        
        // Update the simpleArray for display
        this.simpleArray = this.simplifiedSentenceArray.map(item => item.text);
        
        // For now, translation is the same as simplification 
        // (we'll implement UL translation separately later)
        this.translatedArray = this.simplifiedSentenceArray.map(item => item.text);
        
        debugLog(`Successfully created simplifiedSentenceArray with ${this.simplifiedSentenceArray.length} sentences`);
        return true;
        
      } catch (apiError) {
        debugLog(`API error: ${apiError.message}`);
        
        // Fallback: use original sentences if API fails
        this.simplifiedSentenceArray = originalSentences.map((sentence, index) => ({
          text: sentence,
          isFirstOfGroup: true // All are marked as first since we're not simplifying
        }));
        
        // Update display arrays
        this.simpleArray = originalSentences;
        this.translatedArray = originalSentences;
        
        debugLog(`Using fallback: Created simplifiedSentenceArray with ${this.simplifiedSentenceArray.length} original sentences`);
        return false;
      }
      
    } catch (error) {
      debugLog(`Error processing chunk with OpenAI API: ${error.message}`);
      return false;
    }
  }
  
  // Parse the API response, identifying sentences that start with /+++/ marker
  parseApiResponse(responseText) {
    if (!responseText) {
      return [];
    }
    
    // Split the response by the marker string "/+++/"
    const parts = responseText.split("/+++/");
    
    // First part will be empty if the response starts with marker as expected
    // Remove it if it's empty
    if (parts[0] === '') {
      parts.shift();
    }
    
    const simplifiedSentences = [];
    
    // Process each part (group of sentences from one original sentence)
    for (let part of parts) {
      // Split into individual sentences (by newline)
      const sentences = part.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Add each sentence to the array
      for (let i = 0; i < sentences.length; i++) {
        simplifiedSentences.push({
          text: sentences[i],
          isFirstOfGroup: i === 0 // Only the first sentence of each part gets 'yes'
        });
      }
    }
    
    return simplifiedSentences;
  }
  
  // Implementation of Step 8: Set up initial display
  setupInitialDisplay() {
    debugLog(`BookReader: Step 8 - Setting up initial display`);
    
    try {
      // No sentences to display
      if (!this.simplifiedSentenceArray || this.simplifiedSentenceArray.length === 0) {
        this.simpleArray = ["No content available"];
        this.translatedArray = ["No content available"];
        this.simpleIndex = 0;
        
        if (this.onSentenceProcessed) {
          this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
        }
        
        return false;
      }
      
      // Figure out which sentence to display first
      // For now, always start with the first sentence in the chunk
      const sentenceIndexInChunk = this.currentSentenceOffset - 
        this.sentenceChunks[this.currentChunkIndex].startIndex;
      
      // Update current index within simpleArray
      this.simpleIndex = Math.max(0, sentenceIndexInChunk);
      
      debugLog(`Initial display set up with sentence index ${this.simpleIndex} in chunk ${this.currentChunkIndex}`);
      
      // Call the callback to display the sentence
      if (this.onSentenceProcessed) {
        this.onSentenceProcessed(
          this.simpleArray[this.simpleIndex], 
          this.translatedArray[this.simpleIndex]
        );
      }
      
      return true;
    } catch (error) {
      debugLog(`Error setting up initial display: ${error.message}`);
      
      // Provide fallback content
      this.simpleArray = [`Error displaying content: ${error.message}`];
      this.translatedArray = [`Error displaying content: ${error.message}`];
      this.simpleIndex = 0;
      
      if (this.onSentenceProcessed) {
        this.onSentenceProcessed(this.simpleArray[0], this.translatedArray[0]);
      }
      
      return false;
    }
  }
  
  // Helper function to save the current tracker state
  async saveTrackerState() {
    if (__DEV__) console.log("MODULE 0075: bookReader.saveTrackerState");
    if (!this.trackerExists) return;

    try {
      if (this.reader && this.reader.bookId) {
        const bookPipeTrackerKey = `book_tracker_${this.reader.bookId}`;
        const bookPipeTracker = {
          bookId: this.reader.bookId,
          offset: this.tracker.offset
        };
        await AsyncStorage.setItem(bookPipeTrackerKey, JSON.stringify(bookPipeTracker));
      }
    } catch (error) {
      debugLog(`Error saving tracker state: ${error.message}`);
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
    this.currentSentenceOffset = 0;
    this.sentenceChunks = [];
    this.currentChunkIndex = 0;
    this.chunkSentenceArray = [];
    this.simplifiedSentenceArray = [];
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