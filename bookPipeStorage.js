// bookPipeStorage.js - Manages persistent storage of reading positions
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage operations for BookPipe
export const bookPipeStorage = {
  // Get the tracker key for a specific book
  getTrackerKey(bookId) {
    return `book_tracker_${bookId}`;
  },

  // Clear the saved position from AsyncStorage
  async clearSavedPosition(pipe) {
    try {
      if (pipe.bookId) {
        const trackerKey = this.getTrackerKey(pipe.bookId);
        pipe.log(`Clearing saved position for key: ${trackerKey}`);
        await AsyncStorage.removeItem(trackerKey);
        
        // Also clear the legacy keys for completeness
        const legacyKey = `book_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyKey);
        
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyReadingKey);
        
        pipe.log(`Position cleared successfully`);
      }
    } catch (error) {
      pipe.log(`Error clearing position: ${error.message}`);
    }
  },

  // Clear all storage related to a book
  async clearAllStorage(pipe) {
    await this.clearSavedPosition(pipe);
  },

  // Get the current tracker from storage
  async getTracker(pipe) {
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);
      pipe.log(`Getting tracker for key: ${trackerKey}`);
      
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const tracker = JSON.parse(savedTracker);
          pipe.log(`Found saved tracker with offset: ${tracker.offset}`);
          return tracker;
        } catch (parseError) {
          pipe.log(`Error parsing tracker: ${parseError.message}, creating new tracker`);
          // Return a new tracker if parsing fails
          return { bookId: pipe.bookId, offset: 0 };
        }
      } else {
        pipe.log(`No tracker found for key: ${trackerKey}, checking legacy keys`);
        
        // Check for legacy storage format
        const legacyKey = `book_position_${pipe.bookId}`;
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        
        pipe.log(`Checking legacy keys: ${legacyKey}, ${legacyReadingKey}`);
        const legacyPosition = await AsyncStorage.getItem(legacyKey);
        const legacyReadingPosition = await AsyncStorage.getItem(legacyReadingKey);
        
        let offset = 0;
        
        if (legacyPosition) {
          pipe.log(`Found legacy position: ${legacyPosition}`);
          offset = parseInt(legacyPosition, 10);
          if (isNaN(offset)) {
            offset = 0;
          }
        } else if (legacyReadingPosition) {
          pipe.log(`Found legacy reading position: ${legacyReadingPosition}`);
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
          pipe.log(`Removed legacy key: ${legacyKey}`);
        }
        
        if (legacyReadingPosition) {
          await AsyncStorage.removeItem(legacyReadingKey);
          pipe.log(`Removed legacy key: ${legacyReadingKey}`);
        }
        
        return newTracker;
      }
    } catch (error) {
      pipe.log(`Error getting tracker: ${error.message}`);
      return { bookId: pipe.bookId, offset: 0 };
    }
  },

  // Load reading position from the tracker
  async loadReadingPosition(pipe) {
    try {
      const tracker = await this.getTracker(pipe);
      pipe.currentReadPosition = tracker.offset || 0;
      pipe.log(`Loaded reading position from tracker: ${pipe.currentReadPosition}`);
    } catch (error) {
      pipe.log(`Error loading position: ${error.message}`);
      pipe.currentReadPosition = 0;
    }
  },

  // Save tracker to AsyncStorage
  async saveTracker(pipe, tracker) {
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);
      pipe.log(`Saving tracker with offset ${tracker.offset} to key: ${trackerKey}`);
      
      await AsyncStorage.setItem(trackerKey, JSON.stringify(tracker));
      pipe.log(`Successfully saved tracker`);
      
      // Verify what we saved
      const verification = await AsyncStorage.getItem(trackerKey);
      const parsedVerification = JSON.parse(verification);
      pipe.log(`Verification - read back tracker offset: ${parsedVerification.offset}`);
      
      return true;
    } catch (error) {
      pipe.log(`Error saving tracker: ${error.message}`);
      return false;
    }
  },

  // Save current reading position to AsyncStorage
  async saveReadingPosition(pipe) {
    if (!pipe.bookId) {
      pipe.log(`Cannot save position: bookId is null`);
      return false;
    }
    
    if (!pipe.shouldSavePosition) {
      pipe.log(`Not saving position because shouldSavePosition=${pipe.shouldSavePosition}`);
      return false;
    }
    
    try {
      const tracker = await this.getTracker(pipe);
      tracker.offset = pipe.currentReadPosition;
      
      const saved = await this.saveTracker(pipe, tracker);
      pipe.log(`Saved position ${pipe.currentReadPosition} to tracker: ${saved ? 'success' : 'failed'}`);
      
      return saved;
    } catch (error) {
      pipe.log(`Error saving position: ${error.message}`);
      return false;
    }
  }
};