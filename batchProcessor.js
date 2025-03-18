// batchProcessor.js - Handles batch processing of sentences from the BookPipe
// Simplified version that avoids setImmediate

import { processSourceText } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BookPipe from './bookPipe';
import { Alert } from 'react-native';

// Configuration for sentence batching
const BATCH_SIZE = 10; // Number of sentences to process at once
const MIN_SENTENCES_THRESHOLD = 5; // When to trigger loading more sentences

class BatchProcessor {
  constructor() {
    this.studyLanguage = null;
    this.userLanguage = null;
    this.readingLevel = 6;
    this.processedBatches = []; // Processed and translated sentences
    this.isProcessing = false;
    this.onNewBatchReady = null; // Callback function
    this.processedSentenceHashes = new Set(); // Track processed sentences to avoid duplicates
    this.resumedFromSavedPosition = false; // Flag to indicate if we resumed from a saved position
  }

  // Generate a simple hash for a sentence to track duplicates
  generateSentenceHash(sentence) {
    // Use first 20 chars + last 20 chars + length as a simple hash
    const start = sentence.substring(0, 20);
    const end = sentence.substring(Math.max(0, sentence.length - 20));
    return `${start}|${end}|${sentence.length}`;
  }

  // Check if a sentence has already been processed
  isDuplicateSentence(sentence) {
    const hash = this.generateSentenceHash(sentence);
    return this.processedSentenceHashes.has(hash);
  }

  // Initialize with book content and settings
  async initialize(bookId, studyLanguage, userLanguage, readingLevel, onNewBatchReady) {
    this.studyLanguage = studyLanguage;
    this.userLanguage = userLanguage;
    this.readingLevel = readingLevel;
    this.processedBatches = [];
    this.isProcessing = false;
    this.onNewBatchReady = onNewBatchReady;
    this.processedSentenceHashes = new Set(); // Reset the hash set
    this.resumedFromSavedPosition = false;
    
    try {
      // Initialize the book pipe
      const bookInfo = await BookPipe.initialize(bookId);
      
      // Set flag if we resumed from a saved position
      if (bookInfo && bookInfo.resumedFromPosition) {
        this.resumedFromSavedPosition = true;
      }
      
      // Process first batch immediately
      return await this.processNextBatch();
    } catch (error) {
      console.error(`[BatchProcessor] Error during initialization: ${error.message}`);
      throw error;
    }
  }
  
  // Check if we need to process more sentences
  shouldProcessNextBatch(currentSentenceIndex) {
    const totalProcessedSentences = this.getTotalProcessedSentences();
    const remainingSentences = totalProcessedSentences - currentSentenceIndex;
    
    return (
      !this.isProcessing && 
      BookPipe.hasMoreSentences() && 
      remainingSentences <= MIN_SENTENCES_THRESHOLD
    );
  }
  
  // Get the total number of processed sentences across all batches
  getTotalProcessedSentences() {
    return this.processedBatches.reduce((total, batch) => total + batch.length, 0);
  }
  
  // Process the next batch of sentences
  // Android-friendly version that avoids setImmediate
  async processNextBatch() {
    if (this.isProcessing) {
      return null;
    }
    
    this.isProcessing = true;
    
    try {
      // Get the next batch of raw sentences from the book pipe
      const rawSentences = await BookPipe.getNextBatch(BATCH_SIZE);
      
      if (!rawSentences || rawSentences.length === 0) {
        this.isProcessing = false;
        return null;
      }
      
      // Join sentences for processing with Claude API
      const sourceText = rawSentences.join(' ');
      
      // Process the text using Claude API for simplification
      const processedText = await processSourceText(sourceText, this.studyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
        this.isProcessing = false;
        return null;
      }
      
      // Split processed text into sentences
      let simplifiedSentences = processedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // If that didn't work well, try to split by sentence endings
      if (simplifiedSentences.length < 3) {
        const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
        const sentenceMatches = processedText.match(sentenceRegex) || [];
        
        if (sentenceMatches.length > simplifiedSentences.length) {
          simplifiedSentences = sentenceMatches
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
      }
      
      // Clean up simplified sentences - remove "Simplified:" prefix if present
      simplifiedSentences = simplifiedSentences.map(sentence => {
        return sentence.replace(/^Simplified:\s*/i, '');
      });
      
      // Translate each sentence to native language
      const translatedSentences = await translateSentences(
        simplifiedSentences, 
        this.studyLanguage, 
        this.userLanguage
      );
      
      // Create paired sentences, filtering out duplicates
      const pairedSentences = [];
      const maxLength = Math.min(simplifiedSentences.length, translatedSentences.length);
      
      for (let i = 0; i < maxLength; i++) {
        const original = simplifiedSentences[i];
        const hash = this.generateSentenceHash(original);
        
        // Only add if it's not a duplicate
        if (!this.processedSentenceHashes.has(hash)) {
          pairedSentences.push({
            original: original,
            translation: translatedSentences[i]
          });
          
          // Add to processed set
          this.processedSentenceHashes.add(hash);
        }
      }
      
      // Store the processed batch
      if (pairedSentences.length > 0) {
        this.processedBatches.push(pairedSentences);
      }
      
      // Handle callback directly instead of using setImmediate
      if (this.onNewBatchReady && pairedSentences.length > 0) {
        try {
          this.onNewBatchReady(pairedSentences);
        } catch (callbackError) {
          // Silent error handling
          console.error(`[BatchProcessor] Error in callback: ${callbackError.message}`);
        }
      }
      
      return pairedSentences;
    } catch (error) {
      console.error(`[BatchProcessor] Error processing batch: ${error.message}`);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }
  
  // Check if we resumed from a saved position
  didResumeFromSavedPosition() {
    return this.resumedFromSavedPosition;
  }
  
  // Get all processed sentences as a flat array
  getAllProcessedSentences() {
    return this.processedBatches.flat();
  }
  
  // Get the total progress of the book
  getProgress() {
    return {
      ...BookPipe.getProgress(),
      processedBatches: this.processedBatches.length,
      totalProcessedSentences: this.getTotalProcessedSentences(),
      resumedFromSavedPosition: this.resumedFromSavedPosition
    };
  }
  
  // Reset the processor
  reset() {
    this.processedBatches = [];
    this.isProcessing = false;
    this.processedSentenceHashes = new Set();
    this.resumedFromSavedPosition = false;
    // Reset the book pipe as well
    BookPipe.reset();
  }
}

// Export a singleton instance
export default new BatchProcessor();
