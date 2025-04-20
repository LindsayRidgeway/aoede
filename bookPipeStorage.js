// bookPipeStorage.js - Manages persistent storage of reading positions
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage operations for BookPipe
export const bookPipeStorage = {
  // Get the tracker key for a specific book
  getTrackerKey(bookId) {
  if (__DEV__) console.log("MODULE 0061: bookPipeStorage.getTrackerKey");
    return `book_tracker_${bookId}`;
  },

  // Clear the saved position from AsyncStorage
  async clearSavedPosition(pipe) {
    if (__DEV__) console.log("MODULE 0062: bookPipeStorage.clearSavedPosition");
    try {
      if (pipe.bookId) {
        const trackerKey = this.getTrackerKey(pipe.bookId);
        await AsyncStorage.removeItem(trackerKey);
        
        // Also clear the legacy keys for completeness
        const legacyKey = `book_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyKey);
        
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyReadingKey);
      }
    } catch (error) {
      if (__DEV__) console.log(`Error clearing position: ${error.message}`);
    }
  },

  // Clear all storage related to a book
  async clearAllStorage(pipe) {
    if (__DEV__) console.log("MODULE 0063: bookPipeStorage.clearAllStorage");
    await this.clearSavedPosition(pipe);
  },

  // Get the current tracker from storage
  async getTracker(pipe) {
    if (__DEV__) console.log("MODULE 0064: bookPipeStorage.getTracker");
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);      
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const tracker = JSON.parse(savedTracker);
          return tracker;
        } catch (parseError) {
          // Return a new tracker if parsing fails
          return { bookId: pipe.bookId, offset: 0 };
        }
      } else {        
        // Check for legacy storage format
        const legacyKey = `book_position_${pipe.bookId}`;
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        
        const legacyPosition = await AsyncStorage.getItem(legacyKey);
        const legacyReadingPosition = await AsyncStorage.getItem(legacyReadingKey);
        
        let offset = 0;
        
        if (legacyPosition) {
          offset = parseInt(legacyPosition, 10);
          if (isNaN(offset)) {
            offset = 0;
          }
        } else if (legacyReadingPosition) {
          offset = parseInt(legacyReadingPosition, 10);
          if (isNaN(offset)) {
            offset = 0;
          }
        }
        
        // Create a new tracker with the offset from legacy storage
        const newTracker = { bookId: pipe.bookId, offset };
        
        // Save the new tracker to replace legacy storage
        await this.saveTracker(pipe, newTracker);
        
        // Remove legacy storage
        if (legacyPosition) {
          await AsyncStorage.removeItem(legacyKey);
        }
        
        if (legacyReadingPosition) {
          await AsyncStorage.removeItem(legacyReadingKey);
        }
        
        return newTracker;
      }
    } catch (error) {
      return { bookId: pipe.bookId, offset: 0 };
    }
  },

  // Load reading position from the tracker
  async loadReadingPosition(pipe) {
    if (__DEV__) console.log("MODULE 0065: bookPipeStorage.loadReadingPosition");
    try {
      const tracker = await this.getTracker(pipe);
      pipe.currentReadPosition = tracker.offset || 0;
    } catch (error) {
      if (__DEV__) console.log(`Error loading position: ${error.message}`);
      pipe.currentReadPosition = 0;
    }
  },

  // Save tracker to AsyncStorage
  async saveTracker(pipe, tracker) {
    if (__DEV__) console.log("MODULE 0066: bookPipeStorage.saveTracker");
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);      
      await AsyncStorage.setItem(trackerKey, JSON.stringify(tracker));
      
      // Verify what we saved
      const verification = await AsyncStorage.getItem(trackerKey);
      const parsedVerification = JSON.parse(verification);
      
      return true;
    } catch (error) {
      if (__DEV__) console.log(`Error saving tracker: ${error.message}`);
      return false;
    }
  },

  // Save current reading position to AsyncStorage
  async saveReadingPosition(pipe) {
    if (__DEV__) console.log("MODULE 0067: bookPipeStorage.saveReadingPosition");
    if (!pipe.bookId) {
      if (__DEV__) console.log(`Cannot save position: bookId is null`);
      return false;
    }
    
    if (!pipe.shouldSavePosition) {
      if (__DEV__) console.log(`Not saving position because shouldSavePosition=${pipe.shouldSavePosition}`);
      return false;
    }
    
    try {
      const tracker = await this.getTracker(pipe);
      tracker.offset = pipe.currentReadPosition;
      
      const saved = await this.saveTracker(pipe, tracker);      
      return saved;
    } catch (error) {
      if (__DEV__) console.log(`Error saving position: ${error.message}`);
      return false;
    }
  }
};