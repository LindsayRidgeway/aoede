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
    this.hasMoreContent = true;  // Flag to indicate if there's more content to process
    this.shouldSavePosition = false; // Flag to prevent auto-saving position when just loading
    this.isRewindRequested = false; // Flag to indicate if rewind was requested
    this.lastInitializedBookId = null; // Track which book was last initialized
  }

  // Initialize the pipe with a book ID
  async initialize(bookId) {
    if (__DEV__) console.log("MODULE 0044: bookPipeCore.initialize");
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    // Check if rewind was explicitly requested
    const shouldRewind = this.isRewindRequested;
    
    // Always reset before initializing to ensure a clean state
    this.reset();
    
    // Preserve the rewind request flag through the reset
    this.isRewindRequested = shouldRewind;
    
    this.bookId = bookId;
    this.lastInitializedBookId = bookId; // Remember which book we initialized
    this.isLoading = true;
    this.shouldSavePosition = false; // Don't save position on initial load

    try {
      const bookSource = getBookSourceById(bookId);
      if (!bookSource) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      this.bookTitle = bookSource.title || 'Unknown Title';
      this.bookLanguage = bookSource.language || 'en';
      this.bookUrl = bookSource.url;
      
      // Fetch the book content
      await bookPipeFetch.fetchBookContent(this);
      
      // Find the anchor position in the HTML
      await bookPipeProcess.findAnchorPosition(this);
      
      // Check if this is a rewind operation
      if (this.isRewindRequested) {
        // If rewind was requested, force position to 0
        this.currentReadPosition = 0;
        
        // Clear the rewind flag after handling it
        this.isRewindRequested = false;
        
        // Clear the stored position to ensure it stays at 0 for future loads
        await bookPipeStorage.clearSavedPosition(this);
      } else {
        // If NOT a rewind, load the saved position
        await bookPipeStorage.loadReadingPosition(this);
      }
      
      // Process the first chunk of text starting from the anchor position plus saved read position
      await bookPipeProcess.processNextChunk(this, false); // Do not save position when loading
      
      // If we got sentences, we're ready to go
      this.isInitialized = this.sentences.length > 0;
      
      // Always start from the first sentence in the current chunk
      this.nextSentenceIndex = 0;
      
      if (this.isInitialized) {
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
      if (__DEV__) console.log(`Initialization error: ${error.message}`);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Reset book position to the beginning - explicit command to the singleton
  async resetBookPosition() {
    if (__DEV__) console.log("MODULE 0045: bookPipeCore.resetBookPosition");
    if (!this.bookId) return false;
    
    try {
      // Set the rewind flag - this will be checked during initialize
      this.isRewindRequested = true;
      
      // Remember current book ID
      const currentBookId = this.bookId;
      
      // Delete ALL storage for this book
      await bookPipeStorage.clearAllStorage(this);
      
      // Full reset - return the singleton to its initial state
      this.thorough_reset();
      
      // Make sure rewind flag is still set after thorough reset
      this.isRewindRequested = true;
      
      // The rewind will be completed when initialize is called
      return true;
    } catch (error) {
      if (__DEV__) console.log(`Error during reset: ${error.message}`);
      return false;
    }
  }

  // Full reset that mimics creating a new object instance
  thorough_reset() {
    if (__DEV__) console.log("MODULE 0046: bookPipeCore.thorough_reset");
    // Save what we need to keep
    const bookId = this.bookId;
    const isRewindRequested = this.isRewindRequested;
    const lastInitializedBookId = this.lastInitializedBookId;
    
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
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
    
    // Preserve the rewind request flag
    this.isRewindRequested = isRewindRequested;
    
    // Preserve knowledge of the last initialized book
    this.lastInitializedBookId = lastInitializedBookId;
    
    return bookId;
  }

  // Get the next batch of sentences, loading more if needed
  async getNextBatch(batchSize = 10) {
    if (__DEV__) console.log("MODULE 0047: bookPipeCore.getNextBatch");
    if (!this.isInitialized) {
      throw new Error('Book pipe is not initialized');
    }

    const startIdx = this.nextSentenceIndex;
    let endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    if (__DEV__) console.log("[GET_NEXT_BATCH.1] startIdx=", startIdx, "endIdx=", endIdx, " sentences.length=", this.sentences.length, " sentences[0]=", this.sentences[0]);
    
    
    // If we don't have enough sentences and there's more content, process another chunk
    if (endIdx - startIdx < batchSize && this.hasMoreContent) {
      // Process another chunk - only save position if this isn't the initial load
      const newSentences = await bookPipeProcess.processNextChunk(this, this.shouldSavePosition);
      
      // Recalculate the end index
      endIdx = Math.min(startIdx + batchSize, this.sentences.length);
    }
    
    if (startIdx >= this.sentences.length) {
      return [];
    }
    
    // Get the batch of sentences
    const batch = this.sentences.slice(startIdx, endIdx);
    if (__DEV__) console.log("[GET_NEXT_BATCH.2] startIdx=", startIdx, "endIdx=", endIdx, "batch.length=", batch.length, " batch[0]=", batch[0]);
    
    // Update our position
    this.nextSentenceIndex = endIdx;
    
    return batch;
  }

  // User actively advanced to next sentence - enable position saving
  enablePositionSaving() {
  if (__DEV__) console.log("MODULE 0048: bookPipeCore.enablePositionSaving");
    const oldValue = this.shouldSavePosition;
    this.shouldSavePosition = true;
  }

  // Check if there are more sentences available
  hasMoreSentences() {
  if (__DEV__) console.log("MODULE 0049: bookPipeCore.hasMoreSentences");
    const hasMore = this.isInitialized && (this.nextSentenceIndex < this.sentences.length || this.hasMoreContent);
    return hasMore;
  }

  // Get current progress information
  getProgress() {
  if (__DEV__) console.log("MODULE 0050: bookPipeCore.getProgress");
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
  if (__DEV__) console.log("MODULE 0051: bookPipeCore.reset");
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
    this.hasMoreContent = true;
    this.shouldSavePosition = false;
    // Don't reset isRewindRequested here - it's preserved through reset
  }
}

// Export a singleton instance
export default new BookPipe();