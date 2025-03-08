// batchProcessor.js - Handles batch fetching and processing of sentences

import { processSourceText } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import { Alert } from 'react-native';

// Configuration for sentence batching
const BATCH_SIZE = 10; // Number of sentences to process at once
const MIN_SENTENCES_THRESHOLD = 5; // When to trigger loading more sentences
const MAX_BATCHES = 10; // Maximum number of batches to load (prevent excessive API usage)

class BatchProcessor {
  constructor() {
    this.bookId = null;
    this.isSearchQuery = false;
    this.studyLanguage = null;
    this.userLanguage = null;
    this.readingLevel = 6;
    this.rawSentences = []; // All sentences fetched from GPT-4o
    this.processedBatches = []; // Processed and translated sentences
    this.currentBatchIndex = 0;
    this.isProcessing = false;
    this.allSentencesProcessed = false;
    this.onNewBatchReady = null; // Callback function
  }

  // Initialize with book content and settings
  initialize(bookData, studyLanguage, userLanguage, readingLevel, onNewBatchReady) {
    this.rawSentences = bookData.sentences || [];
    this.studyLanguage = studyLanguage;
    this.userLanguage = userLanguage;
    this.readingLevel = readingLevel;
    this.processedBatches = [];
    this.currentBatchIndex = 0;
    this.isProcessing = false;
    this.allSentencesProcessed = false;
    this.onNewBatchReady = onNewBatchReady;
    
    console.log(`BatchProcessor initialized with ${this.rawSentences.length} raw sentences`);
    
    // Process first batch immediately
    return this.processNextBatch();
  }
  
  // Check if we need to process more sentences
  shouldProcessNextBatch(currentSentenceIndex) {
    const totalProcessedSentences = this.getTotalProcessedSentences();
    const remainingSentences = totalProcessedSentences - currentSentenceIndex;
    
    return (
      !this.isProcessing && 
      !this.allSentencesProcessed && 
      remainingSentences <= MIN_SENTENCES_THRESHOLD &&
      this.currentBatchIndex < MAX_BATCHES &&
      this.currentBatchIndex * BATCH_SIZE < this.rawSentences.length
    );
  }
  
  // Get the total number of processed sentences across all batches
  getTotalProcessedSentences() {
    return this.processedBatches.reduce((total, batch) => total + batch.length, 0);
  }
  
  // Process the next batch of sentences
  async processNextBatch() {
    if (this.isProcessing || this.allSentencesProcessed) {
      return null;
    }
    
    this.isProcessing = true;
    console.log(`Processing batch ${this.currentBatchIndex + 1}`);
    
    try {
      // Calculate the start and end indices for this batch
      const startIdx = this.currentBatchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, this.rawSentences.length);
      
      // Check if we've processed all sentences
      if (startIdx >= this.rawSentences.length) {
        console.log('All sentences have been processed');
        this.allSentencesProcessed = true;
        this.isProcessing = false;
        return null;
      }
      
      // Get the next batch of raw sentences
      const batchSentences = this.rawSentences.slice(startIdx, endIdx);
      console.log(`Processing ${batchSentences.length} sentences in batch ${this.currentBatchIndex + 1}`);
      
      // Join sentences for processing
      const sourceText = batchSentences.join(' ');
      
      // Process the text using Claude API
      const processedText = await processSourceText(sourceText, this.studyLanguage, this.readingLevel);
      
      if (!processedText || processedText.length === 0) {
        console.error(`Failed to process batch ${this.currentBatchIndex + 1}`);
        this.isProcessing = false;
        return null;
      }
      
      // Split processed text into sentences
      let simplifiedSentences = processedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // If that didn't work well, try to split by sentence endings
      if (simplifiedSentences.length < 3) {
        const sentenceRegex = /[^.!?]*[.!?](?:\s|$)/g;
        const sentenceMatches = processedText.match(sentenceRegex) || [];
        
        if (sentenceMatches.length > simplifiedSentences.length) {
          simplifiedSentences = sentenceMatches
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
      }
      
      console.log(`Extracted ${simplifiedSentences.length} simplified sentences from batch ${this.currentBatchIndex + 1}`);
      
      // Translate each sentence to native language
      const translatedSentences = await translateSentences(
        simplifiedSentences, 
        this.studyLanguage, 
        this.userLanguage
      );
      
      console.log(`Translated ${translatedSentences.length} sentences`);
      
      // Create paired sentences
      const pairedSentences = [];
      const maxLength = Math.min(simplifiedSentences.length, translatedSentences.length);
      
      for (let i = 0; i < maxLength; i++) {
        pairedSentences.push({
          original: simplifiedSentences[i],
          translation: translatedSentences[i]
        });
      }
      
      // Store the processed batch
      this.processedBatches.push(pairedSentences);
      
      // Increment batch index for next time
      this.currentBatchIndex++;
      
      // Check if we've processed all available sentences
      if (endIdx >= this.rawSentences.length) {
        console.log('All available sentences have been processed');
        this.allSentencesProcessed = true;
      }
      
      // If a callback was provided, notify that new sentences are ready
      if (this.onNewBatchReady) {
        this.onNewBatchReady(pairedSentences);
      }
      
      return pairedSentences;
    } catch (error) {
      console.error(`Error processing batch ${this.currentBatchIndex + 1}:`, error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }
  
  // Get all processed sentences as a flat array
  getAllProcessedSentences() {
    return this.processedBatches.flat();
  }
  
  // Reset the processor
  reset() {
    this.rawSentences = [];
    this.processedBatches = [];
    this.currentBatchIndex = 0;
    this.isProcessing = false;
    this.allSentencesProcessed = false;
  }
}

// Export a singleton instance
export default new BatchProcessor();