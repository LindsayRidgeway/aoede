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
const CHUNK_SIZE = 10000; // Size of chunks for processing

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
    this.bookSentences = [];       // Step 3: Array of all sentences in the book
    this.currentSentenceOffset = 0; // Step 4: Current sentence offset in book
    this.sentenceChunks = [];      // Step 5: Array of chunks of sentences
    this.currentChunkIndex = 0;    // Current chunk being processed
    this.chunkSentenceArray = [];  // Array of processed sentences for current chunk
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
        // Implement steps 1-7 of our algorithm
        try {
          // Step 1: Load the entire book into memory
          await this.loadEntireBook(bookId);
          
          // Step 2: Find the anchor in the URL
          await this.findAnchor(bookId);
          
          // Step 3: Separate book into sentences at the anchor position
          await this.extractSentences();
          
          // Step 4: Identify the user's previous position using the tracker
          await this.identifyUserPosition(studyLanguage, bookId);
          
          // Step 5: Divide sentences into chunks
          this.divideSentencesIntoChunks();
          
          // Step 6-7: Process the initial chunk and create the sentence array
          await this.processInitialChunk(studyLanguage);
          
          // Display a success message
          this.simpleArray = ["Aoede 3.0 is under development. Steps 1-7 have been completed successfully."];
          this.translatedArray = ["Aoede 3.0 is under development. Steps 1-7 have been completed successfully."];
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
  
  // Implementation of Step 3: Separate book into sentences at the anchor position
  // Improved implementation with better sentence extraction
  async extractSentences() {
    debugLog(`BookReader: Step 3 - Extracting sentences from the book`);
    
    try {
      if (!this.bookTextPlain) {
        throw new Error("Book text not available");
      }
      
      // Get text from the starting point in plain text
      const textFromAnchor = this.bookTextPlain;
      
      // Use our improved sentence parsing algorithm
      this.bookSentences = this.improvedSentenceExtraction(textFromAnchor);
      
      debugLog(`Extracted ${this.bookSentences.length} sentences from the book`);
      
      // Log the first few sentences
      if (this.bookSentences.length > 0) {
        const firstThreeSentences = this.bookSentences.slice(0, 3);
        for (let i = 0; i < firstThreeSentences.length; i++) {
          const sentence = firstThreeSentences[i];
          debugLog(`Original sentence ${i + 1}: "${sentence.substring(0, 100)}${sentence.length > 100 ? '...' : ''}"`);
        }
      }
      
      return true;
    } catch (error) {
      debugLog(`Error extracting sentences: ${error.message}`);
      this.bookSentences = [];
      throw error;
    }
  }
  
  // Improved sentence extraction with sliding window algorithm
  improvedSentenceExtraction(text) {
    // This function extracts proper sentences from text using a sliding window approach
    
    // Prepare the text by normalizing whitespace and removing excessive newlines
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    
    // Split text into paragraphs first (for better context awareness)
    const paragraphs = normalizedText.split(/\n\n+/);
    
    const allSentences = [];
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      // Potential sentence end points
      const sentenceEndPoints = [];
      
      // Find all potential sentence endings (., !, ?, etc.)
      let match;
      const sentenceEndRegex = /[.!?]['"]?\s+/g;
      while ((match = sentenceEndRegex.exec(paragraph)) !== null) {
        sentenceEndPoints.push(match.index + match[0].length - 1);
      }
      
      // Handle case where paragraph doesn't end with punctuation
      if (sentenceEndPoints.length === 0 || sentenceEndPoints[sentenceEndPoints.length - 1] !== paragraph.length - 1) {
        sentenceEndPoints.push(paragraph.length);
      }
      
      // Extract sentences based on end points
      let startIndex = 0;
      for (const endIndex of sentenceEndPoints) {
        const sentenceCandidate = paragraph.substring(startIndex, endIndex).trim();
        
        // Apply additional checks to filter out false sentence breaks
        if (this.isValidSentence(sentenceCandidate)) {
          allSentences.push(sentenceCandidate);
        }
        
        startIndex = endIndex;
      }
      
      // If we couldn't extract any sentences from this paragraph, add it as one sentence
      if (startIndex === 0 && paragraph.trim().length > 0) {
        allSentences.push(paragraph.trim());
      }
    }
    
    return allSentences;
  }
  
  // Helper method to validate if a string is a proper sentence
  isValidSentence(text) {
    // Minimum criteria for a valid sentence
    if (!text) return false;
    
    // Remove whitespace
    const trimmedText = text.trim();
    
    // Check minimum length (at least 2 characters)
    if (trimmedText.length < 2) return false;
    
    // Check for at least one letter (not just punctuation or numbers)
    if (!/[a-zA-Z]/.test(trimmedText)) return false;
    
    // Check for special cases - avoid breaking at abbreviations or initials
    // Common abbreviations: Mr., Mrs., Dr., St., etc.
    const commonAbbreviations = [
      'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'st.', 'jr.', 'sr.', 'e.g.', 'i.e.', 'vs.',
      'etc.', 'a.m.', 'p.m.', 'u.s.', 'u.k.'
    ];
    
    for (const abbr of commonAbbreviations) {
      if (trimmedText.toLowerCase().endsWith(abbr + ' ')) {
        return false; // This is an abbreviation, not a sentence end
      }
    }
    
    // Check for quoted sentences within a larger sentence
    // This avoids splitting "He said, "Hello." Then he left." into two sentences
    if (trimmedText.match(/^['"][^'"]*[.!?]['"]$/) !== null) {
      return false;
    }
    
    return true;
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
      const trackerKey = `book_tracker_${studyLanguage}_${bookTitle}`;
      
      // Try to get the existing tracker
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const parsedTracker = JSON.parse(savedTracker);
          
          // Store tracker information
          this.tracker = parsedTracker;
          this.trackerExists = true;
          
          // Get the offset from the tracker
          const offset = parsedTracker.offset || 0;
          
          // Find the sentence index based on the character offset
          // For now, we'll set the index to 0 and implement a more accurate method later
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
        bookTitle: book ? book.title : bookId,
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
      
      // Start from the current sentence offset
      for (let i = this.currentSentenceOffset; i < this.bookSentences.length; i++) {
        const sentence = this.bookSentences[i];
        
        // If adding this sentence would exceed the chunk size and we already have sentences
        // in the current chunk, then start a new chunk
        if (currentChunkSize + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
          chunks.push({
            startIndex: i - currentChunk.length,
            endIndex: i - 1,
            sentences: currentChunk
          });
          
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
        const startIndex = this.bookSentences.length - currentChunk.length;
        chunks.push({
          startIndex,
          endIndex: this.bookSentences.length - 1,
          sentences: currentChunk
        });
      }
      
      this.sentenceChunks = chunks;
      this.currentChunkIndex = 0;
      
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
  
  // Implementation of Step 6 & 7: Process chunks and create sentence arrays
  async processInitialChunk(studyLanguage) {
    debugLog(`BookReader: Steps 6-7 - Processing initial chunk`);
    
    try {
      if (!this.sentenceChunks || this.sentenceChunks.length === 0) {
        throw new Error("No chunks available to process");
      }
      
      // Get the current chunk
      const currentChunk = this.sentenceChunks[this.currentChunkIndex];
      
      // Get the sentences for processing
      const sentencesToProcess = currentChunk.sentences;
      
      if (sentencesToProcess.length === 0) {
        throw new Error("No sentences in the current chunk");
      }
      
      // Get book language
      const book = await getBookById(this.reader.bookId);
      const bookLanguage = book ? book.language : 'en';
      
      // Process the chunk
      debugLog(`Processing chunk ${this.currentChunkIndex} with ${sentencesToProcess.length} sentences`);
      
      // Create a chunkSentenceArray for this chunk
      this.chunkSentenceArray = [];
      
      // Process all sentences in the chunk
      for (let i = 0; i < sentencesToProcess.length; i++) {
        const sentence = sentencesToProcess[i];
        
        // Get simplified and translated versions using the API
        try {
          const processedText = await processSourceText(
            sentence, 
            bookLanguage, 
            studyLanguage, 
            this.userLanguage, 
            this.readingLevel
          );
          
          // Extract simplified and translated sentences
          const lines = processedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const simplified = lines[0] || sentence;
          const translation = lines[1] || sentence;
          
          // Add to the chunk sentence array
          this.chunkSentenceArray.push({
            original: sentence,
            simplified,
            translation
          });
        } catch (error) {
          // If there's an error, use the original sentence
          this.chunkSentenceArray.push({
            original: sentence,
            simplified: sentence,
            translation: sentence
          });
        }
      }
      
      // Log the first 3 sentences of the chunkSentenceArray
      if (this.chunkSentenceArray.length > 0) {
        const numToLog = Math.min(3, this.chunkSentenceArray.length);
        
        debugLog(`First ${numToLog} sentences in the chunkSentenceArray:`);
        
        for (let i = 0; i < numToLog; i++) {
          const sentenceObj = this.chunkSentenceArray[i];
          debugLog(`Sentence ${i + 1} (First 100 chars): "${sentenceObj.original.substring(0, 100)}${sentenceObj.original.length > 100 ? '...' : ''}"`);
        }
      }
      
      return true;
    } catch (error) {
      debugLog(`Error processing initial chunk: ${error.message}`);
      return false;
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
    this.bookTextPlain = null;
    this.anchorPosition = 0;
    this.bookSentences = [];
    this.currentSentenceOffset = 0;
    this.sentenceChunks = [];
    this.currentChunkIndex = 0;
    this.chunkSentenceArray = [];
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