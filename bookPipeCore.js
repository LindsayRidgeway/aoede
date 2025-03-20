// bookPipeCore.js - Core functionality for the BookPipe system
import { getBookSourceById } from './bookSources';
import { bookPipeFetch } from './bookPipeFetch';
import { bookPipeStorage } from './bookPipeStorage';
import { bookPipeProcess } from './bookPipeProcess';

// BookPipe class - handles getting book content and processing it
class BookPipe {
  constructor() {
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;     // Stores the HTML content
    this.anchorPosition = 0;     // Position of the anchor in the HTML
    this.currentReadPosition = 0; // Current reading position relative to anchor
    this.chunkSize = 50000;      // Size of text chunks to process at once
    this.sentences = [];         // Processed sentences
    this.nextSentenceIndex = 0;  // Current position in sentences array
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;  // Flag to indicate if there's more content to process
    this.shouldSavePosition = false; // Flag to prevent auto-saving position when just loading
    this.debugMode = true;       // Enable debug logging
    this.isRewindRequested = false; // Flag to indicate if rewind was requested
    this.lastInitializedBookId = null; // Track which book was last initialized
    
    // Additional debugging info
    this.lastOperation = null;
    this.rewindAttempts = 0;
  }

  // Debug logging helper
  log(message) {
    if (this.debugMode) {
      console.log(`[BookPipe] ${message}`);
    }
  }

  // ENHANCED DEBUGGING: Track what happens during the rewind process
  logRewindState(stage) {
    console.log(`===== REWIND STATE (${stage}) =====`);
    console.log(`bookId: ${this.bookId}`);
    console.log(`currentReadPosition: ${this.currentReadPosition}`);
    console.log(`isRewindRequested: ${this.isRewindRequested}`);
    console.log(`shouldSavePosition: ${this.shouldSavePosition}`);
    console.log(`lastInitializedBookId: ${this.lastInitializedBookId}`);
    console.log(`nextSentenceIndex: ${this.nextSentenceIndex}`);
    console.log(`sentences.length: ${this.sentences.length}`);
    console.log(`lastOperation: ${this.lastOperation}`);
    console.log(`rewindAttempts: ${this.rewindAttempts}`);
    console.log(`===== END REWIND STATE =====`);
  }

  // Initialize the pipe with a book ID
  async initialize(bookId) {
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    this.log(`Initializing book ID: ${bookId}`);
    this.lastOperation = "initialize";
    
    // Check if rewind was explicitly requested
    const shouldRewind = this.isRewindRequested;
    this.log(`Rewind requested: ${shouldRewind}`);
    
    if (shouldRewind) {
      this.rewindAttempts++;
      this.logRewindState("before-reset");
    }
    
    // Always reset before initializing to ensure a clean state
    this.reset();
    
    // Preserve the rewind request flag through the reset
    this.isRewindRequested = shouldRewind;
    
    this.bookId = bookId;
    this.lastInitializedBookId = bookId; // Remember which book we initialized
    this.isLoading = true;
    this.shouldSavePosition = false; // Don't save position on initial load
    this.log(`After reset: currentReadPosition=${this.currentReadPosition}, shouldSavePosition=${this.shouldSavePosition}, isRewindRequested=${this.isRewindRequested}`);

    try {
      const bookSource = getBookSourceById(bookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      this.log(`Book info: title="${this.bookTitle}", language=${this.bookLanguage}, url=${this.bookUrl}`);
      
      // Fetch the book content
      await bookPipeFetch.fetchBookContent(this);
      
      // Find the anchor position in the HTML
      await bookPipeProcess.findAnchorPosition(this);
      this.log(`Found anchor at position: ${this.anchorPosition}`);
      
      // Check if this is a rewind operation
      if (this.isRewindRequested) {
        // If rewind was requested, force position to 0
        this.currentReadPosition = 0;
        this.log(`Rewind requested - forcing position to 0`);
        this.logRewindState("during-rewind");
        
        // Clear the rewind flag after handling it
        this.isRewindRequested = false;
        
        // Clear the stored position to ensure it stays at 0 for future loads
        await bookPipeStorage.clearSavedPosition(this);
      } else {
        // If NOT a rewind, load the saved position
        await bookPipeStorage.loadReadingPosition(this);
        this.log(`Normal load - loaded position: ${this.currentReadPosition}`);
      }
      
      // Process the first chunk of text starting from the anchor position plus saved read position
      await bookPipeProcess.processNextChunk(this, false); // Do not save position when loading
      this.log(`After processing first chunk: ${this.sentences.length} sentences, currentReadPosition=${this.currentReadPosition}`);
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
      // Always start from the first sentence in the current chunk
      this.nextSentenceIndex = 0;
      
      if (this.isInitialized) {
        // If this was a rewind operation, log the final state
        if (shouldRewind) {
          this.logRewindState("after-rewind");
        }
        
        return {
          title: this.bookTitle,
          language: this.bookLanguage,
          totalSentences: this.sentences.length,
          resumedFromPosition: this.currentReadPosition > 0
        };
      } else {
        throw new Error('Failed to extract any sentences from the book');
      }
    } catch (error) {
      this.error = error.message;
      this.log(`Initialization error: ${error.message}`);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Reset book position to the beginning - explicit command to the singleton
  async resetBookPosition() {
    if (!this.bookId) return false;
    
    try {
      // Set the rewind flag - this will be checked during initialize
      this.isRewindRequested = true;
      this.lastOperation = "resetBookPosition";
      
      // Remember current book ID
      const currentBookId = this.bookId;
      this.log(`Resetting book position for: ${currentBookId}, setting isRewindRequested=true`);
      
      console.log(`===== REWIND STATE (BEFORE STORAGE CLEAR) =====`);
      console.log(`Storage keys to be cleared: book_tracker_${this.bookId}`);
      console.log(`Storage state will be cleared completely for book ${this.bookId}`);
      
      // Delete ALL storage for this book
      await bookPipeStorage.clearAllStorage(this);
      
      console.log(`===== STORAGE CLEAR COMPLETED =====`);
      
      // Full reset - return the singleton to its initial state
      this.thorough_reset();
      
      // Make sure rewind flag is still set after thorough reset
      this.isRewindRequested = true;
      this.logRewindState("after-reset-position");
      
      // The rewind will be completed when initialize is called
      return true;
    } catch (error) {
      this.log(`Error during reset: ${error.message}`);
      console.log(`===== REWIND ERROR =====`);
      console.log(error);
      return false;
    }
  }

  // Full reset that mimics creating a new object instance
  thorough_reset() {
    // Save what we need to keep
    const bookId = this.bookId;
    const isRewindRequested = this.isRewindRequested;
    const lastInitializedBookId = this.lastInitializedBookId;
    const lastOperation = this.lastOperation;
    const rewindAttempts = this.rewindAttempts;
    
    this.log(`Performing thorough reset, current bookId: ${bookId}, isRewindRequested: ${isRewindRequested}`);
    
    // Reset EVERYTHING to initial values
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;
    this.anchorPosition = 0;
    this.currentReadPosition = 0;
    this.chunkSize = 50000;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
    
    // Preserve the rewind request flag
    this.isRewindRequested = isRewindRequested;
    
    // Preserve knowledge of the last initialized book
    this.lastInitializedBookId = lastInitializedBookId;
    
    // Preserve debug info
    this.lastOperation = `thorough_reset (after ${lastOperation})`;
    this.rewindAttempts = rewindAttempts;
    
    // Don't reset debug mode
    
    this.log(`After thorough reset: currentReadPosition=${this.currentReadPosition}, shouldSavePosition=${this.shouldSavePosition}, isRewindRequested=${this.isRewindRequested}`);
    
    return bookId;
  }

  // Get the next batch of sentences, loading more if needed
  async getNextBatch(batchSize = 10) {
    if (!this.isInitialized) {
      throw new Error('Book pipe is not initialized');
    }

    const startIdx = this.nextSentenceIndex;
    let endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    
    this.log(`Getting next batch: startIdx=${startIdx}, endIdx=${endIdx}, totalSentences=${this.sentences.length}`);
    this.lastOperation = "getNextBatch";
    
    // If we don't have enough sentences and there's more content, process another chunk
    if (endIdx - startIdx < batchSize && this.hasMoreContent) {
      this.log(`Need more sentences, processing another chunk (have ${endIdx - startIdx}, need ${batchSize})`);
      // Process another chunk - only save position if this isn't the initial load
      const newSentences = await bookPipeProcess.processNextChunk(this, this.shouldSavePosition);
      
      // Recalculate the end index
      endIdx = Math.min(startIdx + batchSize, this.sentences.length);
      this.log(`After processing chunk: endIdx=${endIdx}, totalSentences=${this.sentences.length}`);
    }
    
    if (startIdx >= this.sentences.length) {
      this.log(`No more sentences available (startIdx=${startIdx} >= totalSentences=${this.sentences.length})`);
      return [];
    }
    
    // Get the batch of sentences
    const batch = this.sentences.slice(startIdx, endIdx);
    
    // Update our position
    this.nextSentenceIndex = endIdx;
    this.log(`Updated nextSentenceIndex to ${this.nextSentenceIndex}`);
    
    return batch;
  }

  // User actively advanced to next sentence - enable position saving
  enablePositionSaving() {
    const oldValue = this.shouldSavePosition;
    this.shouldSavePosition = true;
    this.log(`enablePositionSaving called: shouldSavePosition changed from ${oldValue} to ${this.shouldSavePosition}`);
    this.lastOperation = "enablePositionSaving";
  }

  // Check if there are more sentences available
  hasMoreSentences() {
    const hasMore = this.isInitialized && (this.nextSentenceIndex < this.sentences.length || this.hasMoreContent);
    this.log(`hasMoreSentences called: ${hasMore} (nextSentenceIndex=${this.nextSentenceIndex}, totalSentences=${this.sentences.length}, hasMoreContent=${this.hasMoreContent})`);
    return hasMore;
  }

  // Get current progress information
  getProgress() {
    return {
      totalSentences: this.sentences.length,
      processedSentences: this.nextSentenceIndex,
      remainingSentences: Math.max(0, this.sentences.length - this.nextSentenceIndex),
      hasMoreContent: this.hasMoreContent,
      percentage: this.sentences.length > 0 
        ? Math.round((this.nextSentenceIndex / this.sentences.length) * 100) 
        : 0,
      bytePosition: this.currentReadPosition,
      anchorPosition: this.anchorPosition
    };
  }

  // Reset the pipe for a new book - basic version, not thorough
  reset() {
    this.log(`Basic reset called`);
    this.lastOperation = "reset";
    // Note: This is not a thorough reset - see thorough_reset for that
    this.bookId = null;
    this.bookTitle = '';
    this.bookLanguage = '';
    this.bookUrl = '';
    this.htmlContent = null;
    this.anchorPosition = 0;
    this.currentReadPosition = 0;
    this.sentences = [];
    this.nextSentenceIndex = 0;
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
    // Don't reset isRewindRequested here - it's preserved through reset
  }
}

// Export a singleton instance
export default new BookPipe();