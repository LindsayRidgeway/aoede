// batchProcessor.js - Handles batch processing of sentences from the BookPipe

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
    
    try {
      // Initialize the book pipe
      await BookPipe.initialize(bookId);
      console.log(`BatchProcessor initialized for book: ${BookPipe.bookTitle}`);
      
      // Process first batch immediately
      return this.processNextBatch();
    } catch (error) {
      console.error("Error initializing batch processor:", error);
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
  async processNextBatch() {
    if (this.isProcessing) {
      console.log("Already processing a batch, skipping request");
      return null;
    }
    
    this.isProcessing = true;
    console.log("Processing next batch of sentences");
    
    try {
      // Get the next batch of raw sentences from the book pipe
      const rawSentences = await BookPipe.getNextBatch(BATCH_SIZE);
      
      if (!rawSentences || rawSentences.length === 0) {
        console.log('No more sentences available from the book pipe');
        this.isProcessing = false;
        return null;
      }
      
      console.log(`Processing ${rawSentences.length} sentences in next batch`);
      
      // Join sentences for processing with Claude API
      const sourceText = rawSentences.join(' ');
      
      // Process the text using Claude API for simplification
      const processedText = await processSourceText(sourceText, this.studyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
        console.error("Failed to process batch");
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
      
      console.log(`Extracted ${simplifiedSentences.length} simplified sentences`);
      
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
      
      console.log(`Translated ${translatedSentences.length} sentences`);
      
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
      
      console.log(`Added ${pairedSentences.length} unique sentences to batch`);
      
      // Store the processed batch
      if (pairedSentences.length > 0) {
        this.processedBatches.push(pairedSentences);
      }
      
      // If a callback was provided, notify that new sentences are ready
      // Only notify if we have paired sentences to avoid empty batches
      if (this.onNewBatchReady && pairedSentences.length > 0) {
        this.onNewBatchReady(pairedSentences);
      }
      
      return pairedSentences;
    } catch (error) {
      console.error("Error processing batch:", error);
      return null;
    } finally {
      this.isProcessing = false;
    }
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
      totalProcessedSentences: this.getTotalProcessedSentences()
    };
  }
  
  // Reset the processor
  reset() {
    this.processedBatches = [];
    this.isProcessing = false;
    this.processedSentenceHashes = new Set();
    // Reset the book pipe as well
    BookPipe.reset();
  }
}

// Export a singleton instance
export default new BatchProcessor();