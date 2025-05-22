// bookReaderStorage.js - Position tracking and storage methods
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookById } from './userLibrary';
import { updateDisplay } from './bookReaderProcessing';

// Implementation of Step 5: Identify the user's previous position
export async function identifyUserPosition(reader, studyLanguage, bookId) {
  try {
    // Store the study language
    reader.studyLanguage = studyLanguage;
    
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
        reader.tracker = {
          studyLanguage,
          bookTitle,
          offset: parsedTracker.offset || 0
        };
        reader.trackerExists = true;
        
        // Get the offset from the tracker - this is the character offset in the book
        const offset = parsedTracker.offset || 0;
        reader.currentCharOffset = offset;
        
        // Find the sentence index corresponding to this offset
        let foundIndex = false;
        for (let i = 0; i < reader.sentenceOffsets.length; i++) {
          if (i + 1 < reader.sentenceOffsets.length) {
            if (offset >= reader.sentenceOffsets[i] && offset < reader.sentenceOffsets[i + 1]) {
              reader.currentSentenceIndex = i;
              foundIndex = true;
              break;
            }
          }
        }
        
        // If we didn't find a matching sentence, use the last sentence
        if (!foundIndex && reader.sentenceOffsets.length > 0) {
          reader.currentSentenceIndex = reader.sentenceOffsets.length - 1;
        } else if (!foundIndex) {
          // Or the first if there are no sentences
          reader.currentSentenceIndex = 0;
        }
        
      } catch (error) {
        // If there's an error parsing, create a new tracker
        reader.tracker = {
          studyLanguage,
          bookTitle,
          offset: 0
        };
        reader.trackerExists = true;
        reader.currentSentenceIndex = 0;
        reader.currentCharOffset = 0;
        await savePosition(reader);
      }
    } else {
      // If no tracker exists, create a new one
      reader.tracker = {
        studyLanguage,
        bookTitle,
        offset: 0
      };
      reader.trackerExists = true;
      reader.currentSentenceIndex = 0;
      reader.currentCharOffset = 0;
      await savePosition(reader);
    }
    
    return true;
  } catch (error) {
    // Default to starting from the beginning
    reader.currentSentenceIndex = 0;
    reader.currentCharOffset = 0;
    
    // Create a default tracker
    reader.tracker = {
      studyLanguage,
      bookTitle: reader.readerBookTitle || bookId,
      offset: 0
    };
    reader.trackerExists = true;
    await savePosition(reader);
    
    throw error;
  }
}

// Save the current position to AsyncStorage
export async function savePosition(reader) {
  try {
    if (!reader.trackerExists) return false;
    
    if (reader.reader && reader.reader.bookId) {
      // Save the current character offset
      const trackerKey = `book_tracker_${reader.reader.bookId}`;
      const tracker = {
        bookId: reader.reader.bookId,
        offset: reader.currentCharOffset
      };
      
      await AsyncStorage.setItem(trackerKey, JSON.stringify(tracker));
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Implementation of Step 7: Set up initial display
export function setupInitialDisplay(reader) {
  // Just call updateDisplay to show the current sentence
  return updateDisplay(reader);
}