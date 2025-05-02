// bookReader.js - Manages reading state for books according to the specified pseudocode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { parseIntoSentences, detectLanguageCode, translateSentences } from './textProcessing';
import BookPipe from './bookPipeCore';
import { Platform } from 'react-native';
import { getUserLibrary, getBookById } from './userLibrary';

const BLOCK_SIZE = 10000;

class BookReader {
  constructor() {
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

  // New function that encapsulates the current reading management functionality
  previousReadingManagement() {
    return {
      // Interface for loading a book in Aoede 2.0 style
      loadBook: async (studyLanguage, bookId) => {
        return await this.handleLoadBook(studyLanguage, bookId);
      },
      
      // Interface for advancing to next sentence in Aoede 2.0 style
      advanceToNextSentence: async () => {
        return await this.handleNextSentence();
      },
      
      // Interface for rewinding a book in Aoede 2.0 style
      rewindBook: async () => {
        return await this.handleRewind();
      },
      
      // Interface for getting current progress information
      getProgress: () => {
        return this.getProgress();
      },
      
      // Interface for resetting the reader
      reset: () => {
        this.reset();
      },
      
      // Get the current reading level
      getReadingLevel: () => {
        return this.readingLevel;
      }
    };
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