// bookReaderCore.js - Core state management and initialization for BookReader
import { bookReaderNavigation } from './bookReaderNavigation';

class BookReaderCore {
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

  // New function that will implement our new algorithm for Aoede 3.0
  readingManagement() {
    return bookReaderNavigation(this);
  }

  // We need to keep previousReadingManagement active but make it call the new function
  previousReadingManagement() {
    // Just redirect to the new implementation
    return this.readingManagement();
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

// Export as singleton
export default new BookReaderCore();