// bookReaderNavigation.js - Navigation-related methods for BookReader
import { 
  loadEntireBook, 
  findAnchor, 
  extractSentences, 
  calculateSentenceOffsets,
  processCurrentSentence,
  updateDisplay
} from './bookReaderProcessing';
import { 
  identifyUserPosition, 
  savePosition,
  setupInitialDisplay
} from './bookReaderStorage';

export function bookReaderNavigation(reader) {
  return {
    // Interface for loading a book in Aoede 3.0 style
    loadBook: async (studyLanguage, bookId) => {
      // Set processing flag
      reader.isProcessing = true;
      
      // Implement the simplified algorithm
      try {
        // Step 1: Load the entire book into memory
        await loadEntireBook(reader, bookId);
        
        // Step 2: Find the anchor in the URL
        await findAnchor(reader, bookId);
        
        // Step 3: Separate book into sentences AFTER the anchor position
        await extractSentences(reader);
        
        // Step 4: Calculate character offsets for each sentence
        calculateSentenceOffsets(reader);
        
        // Step 5: Identify the user's previous position using the tracker
        await identifyUserPosition(reader, studyLanguage, bookId);
        
        // Step 6: Load the first sentence and simplify it
        await processCurrentSentence(reader);
        
        // Step 7: Set up the initial display
        setupInitialDisplay(reader);
        
        // Clear processing flag
        reader.isProcessing = false;
        
        return true;
      } catch (error) {
        // Display error to the user
        reader.simpleArray = [`Error loading book: ${error.message}`];
        reader.translatedArray = [`Error loading book: ${error.message}`];
        reader.simpleIndex = 0;
        
        if (reader.onSentenceProcessed) {
          reader.onSentenceProcessed(reader.simpleArray[0], reader.translatedArray[0]);
        }
        
        // Clear processing flag
        reader.isProcessing = false;
        
        return false;
      }
    },
    
    advanceToNextSentence: async () => {
      // If already processing, don't allow another operation
      if (reader.isProcessing) {
        return false;
      }
      
      // Set processing flag
      reader.isProcessing = true;
      
      try {
        // If we have more simplified sentences for the current original sentence
        if (reader.currentSimplifiedIndex < reader.simplifiedSentences.length - 1) {
          // Just move to the next simplified sentence
          reader.currentSimplifiedIndex++;
          await updateDisplay(reader);
          
          // Clear processing flag
          reader.isProcessing = false;
          return true;
        }
        
        // If we're at the end of simplified sentences, move to the next original sentence
        if (reader.currentSentenceIndex < reader.bookSentences.length - 1) {
          reader.currentSentenceIndex++;
          // Update the character offset
          reader.currentCharOffset = reader.sentenceOffsets[reader.currentSentenceIndex];
          // Reset simplified index
          reader.currentSimplifiedIndex = 0;
          // Process the new sentence
          await processCurrentSentence(reader);
          // Update the display
          await updateDisplay(reader);
          // Save the updated position
          await savePosition(reader);
          
          // Clear processing flag
          reader.isProcessing = false;
          return true;
        }
        
        // If we're at the end of the book
        // Clear processing flag
        reader.isProcessing = false;
        return false;
      } catch (error) {
        // Clear processing flag on error
        reader.isProcessing = false;
        throw error;
      }
    },
    
    goToPreviousSentence: async () => {
      // If already processing, don't allow another operation
      if (reader.isProcessing) {
        return false;
      }
      
      // Set processing flag
      reader.isProcessing = true;
      
      try {
        // If we have previous simplified sentences for the current original sentence
        if (reader.currentSimplifiedIndex > 0) {
          // Just move to the previous simplified sentence
          reader.currentSimplifiedIndex--;
          await updateDisplay(reader);
          
          // Clear processing flag
          reader.isProcessing = false;
          return true;
        }
        
        // If we're at the beginning of simplified sentences but not at the first original sentence
        if (reader.currentSentenceIndex > 0) {
          reader.currentSentenceIndex--;
          // Update the character offset
          reader.currentCharOffset = reader.sentenceOffsets[reader.currentSentenceIndex];
          // Process the new sentence
          await processCurrentSentence(reader);
          // Set index to the last simplified sentence
          reader.currentSimplifiedIndex = reader.simplifiedSentences.length - 1;
          // Update the display
          await updateDisplay(reader);
          // Save the updated position
          await savePosition(reader);
          
          // Clear processing flag
          reader.isProcessing = false;
          return true;
        }
        
        // If we're at the beginning of the book
        // Clear processing flag
        reader.isProcessing = false;
        return false;
      } catch (error) {
        // Clear processing flag on error
        reader.isProcessing = false;
        throw error;
      }
    },
    
    goToEndOfBook: async () => {
      // If already processing, don't allow another operation
      if (reader.isProcessing) {
        return false;
      }
      
      // Set processing flag
      reader.isProcessing = true;
      
      try {
        // Check if we have sentences to navigate to
        if (!reader.bookSentences || reader.bookSentences.length === 0) {
          throw new Error("No sentences available in the book");
        }
        
        // Direct navigation to the last sentence
        reader.currentSentenceIndex = reader.bookSentences.length - 1;
        
        // Set the character offset to the last sentence's offset
        reader.currentCharOffset = reader.sentenceOffsets[reader.currentSentenceIndex];
        
        // Process the current (last) sentence
        await processCurrentSentence(reader);
        
        // Reset simplified index to the first simplified sentence
        reader.currentSimplifiedIndex = 0;
        
        // Update the display
        await updateDisplay(reader);
        
        // Save the updated position
        await savePosition(reader);
        
        // Clear processing flag
        reader.isProcessing = false;
        return true;
      } catch (error) {
        reader.isProcessing = false;
        throw error;
      }
    },
    
    goToPosition: async (targetPosition) => {
      // If already processing, don't allow another operation
      if (reader.isProcessing) {
        return false;
      }
      
      // Set processing flag
      reader.isProcessing = true;
      
      try {
        // Convert from 1-indexed to 0-indexed
        const targetIndex = targetPosition - 1;
        
        // Validate the target index
        if (targetIndex < 0 || targetIndex >= reader.bookSentences.length) {
          throw new Error("Invalid position");
        }
        
        // Set the new position
        reader.currentSentenceIndex = targetIndex;
        
        // Calculate the character offset for this sentence
        reader.currentCharOffset = reader.sentenceOffsets[targetIndex];
        
        // Reset simplified index to start at the beginning of the new sentence
        reader.currentSimplifiedIndex = 0;
        
        // Process the sentence at the new position
        await processCurrentSentence(reader);
        
        // Update the display
        await updateDisplay(reader);
        
        // Save the new position
        await savePosition(reader);
        
        // Clear processing flag
        reader.isProcessing = false;
        return true;
      } catch (error) {
        // Clear processing flag on error
        reader.isProcessing = false;
        throw error;
      }
    },
    
    rewindBook: async () => {
      // If already processing, don't allow another operation
      if (reader.isProcessing) {
        return false;
      }
      
      // Set processing flag
      reader.isProcessing = true;
      
      try {
        // Go back to the beginning of the book
        reader.currentSentenceIndex = 0;
        reader.currentCharOffset = 0;
        reader.currentSimplifiedIndex = 0;
        
        // Process the first sentence
        await processCurrentSentence(reader);
        
        // Update the display
        await updateDisplay(reader);
        
        // Save the position
        await savePosition(reader);
        
        // Clear processing flag
        reader.isProcessing = false;
        return true;
      } catch (error) {
        // Clear processing flag on error
        reader.isProcessing = false;
        throw error;
      }
    },
    
    getProgress: () => {
      // Return a simple progress object
      return {
        currentSentenceIndex: reader.currentSentenceIndex,
        totalSentencesInBook: reader.bookSentences.length,
        currentSimplifiedIndex: reader.currentSimplifiedIndex,
        totalSimplifiedSentences: reader.simplifiedSentences.length,
        hasMoreContent: reader.currentSentenceIndex < reader.bookSentences.length - 1 || 
                        reader.currentSimplifiedIndex < reader.simplifiedSentences.length - 1,
        totalSentencesInMemory: reader.bookSentences.length,
        isProcessing: reader.isProcessing
      };
    },
    
    reset: () => {
      reader.reset();
    },
    
    getReadingLevel: () => {
      return reader.readingLevel;
    }
  };
}