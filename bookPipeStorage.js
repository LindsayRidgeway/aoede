// bookPipeStorage.js - Manages persistent storage of reading positions
import AsyncStorage from '@react-native-async-storage/async-storage';

// Debug flag - set to true to enable detailed storage logging
const DEBUG = true;

// Storage operations for BookPipe
export const bookPipeStorage = {
  // Get the tracker key for a specific book
  getTrackerKey(bookId) {
    return `book_tracker_${bookId}`;
  },

  // Debug helper to log all async storage keys
  async logAllStorageKeys() {
    if (!DEBUG) return;
    
    try {
      console.log("===== STORAGE DEBUG: ALL KEYS =====");
      const allKeys = await AsyncStorage.getAllKeys();
      console.log(`Total keys in storage: ${allKeys.length}`);
      
      // Filter and group book tracker keys
      const trackerKeys = allKeys.filter(key => key.startsWith('book_tracker_'));
      console.log(`Book tracker keys (${trackerKeys.length}):`);
      trackerKeys.forEach(key => console.log(` - ${key}`));
      
      // Log values for tracker keys
      console.log("===== TRACKER VALUES =====");
      for (const key of trackerKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          console.log(`${key}: ${value}`);
        } catch (e) {
          console.log(`${key}: ERROR reading value`);
        }
      }
      
      console.log("===== END STORAGE DEBUG =====");
    } catch (error) {
      console.log(`Error logging storage: ${error.message}`);
    }
  },

  // Log a single tracker's state
  async logTrackerState(bookId) {
    if (!DEBUG) return;
    
    try {
      const trackerKey = this.getTrackerKey(bookId);
      console.log(`===== TRACKER STATE: ${trackerKey} =====`);
      
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      if (savedTracker) {
        console.log(`Found tracker: ${savedTracker}`);
        try {
          const parsed = JSON.parse(savedTracker);
          console.log(`  Parsed offset: ${parsed.offset}`);
          console.log(`  Parsed bookId: ${parsed.bookId}`);
        } catch (e) {
          console.log(`  Error parsing tracker: ${e.message}`);
        }
      } else {
        console.log(`No tracker found for key: ${trackerKey}`);
      }
      
      // Also check legacy keys
      const legacyKey = `book_position_${bookId}`;
      const legacyValue = await AsyncStorage.getItem(legacyKey);
      console.log(`Legacy key ${legacyKey}: ${legacyValue || 'not found'}`);
      
      const legacyReadingKey = `book_reading_position_${bookId}`;
      const legacyReadingValue = await AsyncStorage.getItem(legacyReadingKey);
      console.log(`Legacy reading key ${legacyReadingKey}: ${legacyReadingValue || 'not found'}`);
      
      console.log("===== END TRACKER STATE =====");
    } catch (error) {
      console.log(`Error logging tracker state: ${error.message}`);
    }
  },

  // Clear the saved position from AsyncStorage
  async clearSavedPosition(pipe) {
    try {
      if (pipe.bookId) {
        const trackerKey = this.getTrackerKey(pipe.bookId);
        
        // Log before clearing
        if (DEBUG) {
          console.log(`===== CLEARING POSITION =====`);
          console.log(`Attempting to clear position for key: ${trackerKey}`);
          await this.logTrackerState(pipe.bookId);
        }
        
        // Clear the tracking info
        await AsyncStorage.removeItem(trackerKey);
        
        // Also clear the legacy keys for completeness
        const legacyKey = `book_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyKey);
        
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        await AsyncStorage.removeItem(legacyReadingKey);
        
        // Verify clear worked
        if (DEBUG) {
          console.log(`Position clear operations completed`);
          await this.logTrackerState(pipe.bookId);
          console.log(`===== POSITION CLEARED =====`);
        }
        
        pipe.log(`Position cleared successfully`);
      } else {
        if (DEBUG) {
          console.log(`===== CLEAR POSITION ERROR =====`);
          console.log(`Cannot clear position: bookId is null`);
          console.log(`===== END CLEAR POSITION ERROR =====`);
        }
      }
    } catch (error) {
      pipe.log(`Error clearing position: ${error.message}`);
      if (DEBUG) {
        console.log(`===== CLEAR POSITION ERROR =====`);
        console.log(`Error details: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
        console.log(`===== END CLEAR POSITION ERROR =====`);
      }
    }
  },

  // Clear all storage related to a book
  async clearAllStorage(pipe) {
    if (DEBUG) {
      console.log(`===== CLEAR ALL STORAGE =====`);
      console.log(`Clearing all storage for book ID: ${pipe.bookId}`);
      await this.logAllStorageKeys();
    }
    
    await this.clearSavedPosition(pipe);
    
    if (DEBUG) {
      console.log(`Clear all storage operations completed`);
      await this.logAllStorageKeys();
      console.log(`===== END CLEAR ALL STORAGE =====`);
    }
  },

  // Get the current tracker from storage
  async getTracker(pipe) {
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);
      pipe.log(`Getting tracker for key: ${trackerKey}`);
      
      if (DEBUG) {
        console.log(`===== GET TRACKER =====`);
        console.log(`Looking for tracker with key: ${trackerKey}`);
      }
      
      const savedTracker = await AsyncStorage.getItem(trackerKey);
      
      if (savedTracker) {
        try {
          const tracker = JSON.parse(savedTracker);
          pipe.log(`Found saved tracker with offset: ${tracker.offset}`);
          
          if (DEBUG) {
            console.log(`Found tracker: ${savedTracker}`);
            console.log(`Parsed offset: ${tracker.offset}`);
            console.log(`===== END GET TRACKER =====`);
          }
          
          return tracker;
        } catch (parseError) {
          pipe.log(`Error parsing tracker: ${parseError.message}, creating new tracker`);
          
          if (DEBUG) {
            console.log(`Error parsing tracker: ${parseError.message}`);
            console.log(`Creating new tracker with offset 0`);
            console.log(`===== END GET TRACKER (ERROR) =====`);
          }
          
          // Return a new tracker if parsing fails
          return { bookId: pipe.bookId, offset: 0 };
        }
      } else {
        pipe.log(`No tracker found for key: ${trackerKey}, checking legacy keys`);
        
        if (DEBUG) {
          console.log(`No tracker found for key: ${trackerKey}`);
          console.log(`Checking legacy keys...`);
        }
        
        // Check for legacy storage format
        const legacyKey = `book_position_${pipe.bookId}`;
        const legacyReadingKey = `book_reading_position_${pipe.bookId}`;
        
        pipe.log(`Checking legacy keys: ${legacyKey}, ${legacyReadingKey}`);
        const legacyPosition = await AsyncStorage.getItem(legacyKey);
        const legacyReadingPosition = await AsyncStorage.getItem(legacyReadingKey);
        
        let offset = 0;
        
        if (legacyPosition) {
          pipe.log(`Found legacy position: ${legacyPosition}`);
          if (DEBUG) console.log(`Found legacy position: ${legacyPosition}`);
          
          offset = parseInt(legacyPosition, 10);
          if (isNaN(offset)) {
            offset = 0;
          }
        } else if (legacyReadingPosition) {
          pipe.log(`Found legacy reading position: ${legacyReadingPosition}`);
          if (DEBUG) console.log(`Found legacy reading position: ${legacyReadingPosition}`);
          
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
        
        if (DEBUG) {
          console.log(`Created new tracker with offset: ${offset}`);
          console.log(`Migrated from legacy storage if available`);
          console.log(`===== END GET TRACKER (NEW) =====`);
        }
        
        return newTracker;
      }
    } catch (error) {
      pipe.log(`Error getting tracker: ${error.message}`);
      
      if (DEBUG) {
        console.log(`Error getting tracker: ${error.message}`);
        console.log(`Creating default tracker with offset 0`);
        console.log(`===== END GET TRACKER (ERROR) =====`);
      }
      
      return { bookId: pipe.bookId, offset: 0 };
    }
  },

  // Load reading position from the tracker
  async loadReadingPosition(pipe) {
    try {
      if (DEBUG) {
        console.log(`===== LOAD READING POSITION =====`);
        console.log(`Loading position for book ID: ${pipe.bookId}`);
      }
      
      const tracker = await this.getTracker(pipe);
      pipe.currentReadPosition = tracker.offset || 0;
      pipe.log(`Loaded reading position from tracker: ${pipe.currentReadPosition}`);
      
      if (DEBUG) {
        console.log(`Loaded position: ${pipe.currentReadPosition}`);
        console.log(`===== END LOAD READING POSITION =====`);
      }
    } catch (error) {
      pipe.log(`Error loading position: ${error.message}`);
      pipe.currentReadPosition = 0;
      
      if (DEBUG) {
        console.log(`Error loading position: ${error.message}`);
        console.log(`Defaulting to position 0`);
        console.log(`===== END LOAD READING POSITION (ERROR) =====`);
      }
    }
  },

  // Save tracker to AsyncStorage
  async saveTracker(pipe, tracker) {
    try {
      const trackerKey = this.getTrackerKey(pipe.bookId);
      pipe.log(`Saving tracker with offset ${tracker.offset} to key: ${trackerKey}`);
      
      if (DEBUG) {
        console.log(`===== SAVE TRACKER =====`);
        console.log(`Saving tracker to key: ${trackerKey}`);
        console.log(`Tracker data: ${JSON.stringify(tracker)}`);
      }
      
      await AsyncStorage.setItem(trackerKey, JSON.stringify(tracker));
      pipe.log(`Successfully saved tracker`);
      
      // Verify what we saved
      if (DEBUG) {
        const verification = await AsyncStorage.getItem(trackerKey);
        console.log(`Verification - saved tracker: ${verification}`);
        
        try {
          const parsedVerification = JSON.parse(verification);
          console.log(`Verification - parsed offset: ${parsedVerification.offset}`);
        } catch (e) {
          console.log(`Verification - parse error: ${e.message}`);
        }
        
        console.log(`===== END SAVE TRACKER =====`);
      }
      
      return true;
    } catch (error) {
      pipe.log(`Error saving tracker: ${error.message}`);
      
      if (DEBUG) {
        console.log(`Error saving tracker: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
        console.log(`===== END SAVE TRACKER (ERROR) =====`);
      }
      
      return false;
    }
  },

  // Save current reading position to AsyncStorage
  async saveReadingPosition(pipe) {
    if (!pipe.bookId) {
      pipe.log(`Cannot save position: bookId is null`);
      
      if (DEBUG) {
        console.log(`===== SAVE READING POSITION ERROR =====`);
        console.log(`Cannot save position: bookId is null`);
        console.log(`===== END SAVE READING POSITION ERROR =====`);
      }
      
      return false;
    }
    
    if (!pipe.shouldSavePosition) {
      pipe.log(`Not saving position because shouldSavePosition=${pipe.shouldSavePosition}`);
      
      if (DEBUG) {
        console.log(`===== SAVE READING POSITION SKIPPED =====`);
        console.log(`Not saving position because shouldSavePosition=${pipe.shouldSavePosition}`);
        console.log(`===== END SAVE READING POSITION SKIPPED =====`);
      }
      
      return false;
    }
    
    try {
      if (DEBUG) {
        console.log(`===== SAVE READING POSITION =====`);
        console.log(`Saving position ${pipe.currentReadPosition} for book ID: ${pipe.bookId}`);
      }
      
      const tracker = await this.getTracker(pipe);
      tracker.offset = pipe.currentReadPosition;
      
      const saved = await this.saveTracker(pipe, tracker);
      pipe.log(`Saved position ${pipe.currentReadPosition} to tracker: ${saved ? 'success' : 'failed'}`);
      
      if (DEBUG) {
        console.log(`Save result: ${saved ? 'success' : 'failed'}`);
        console.log(`===== END SAVE READING POSITION =====`);
      }
      
      return saved;
    } catch (error) {
      pipe.log(`Error saving position: ${error.message}`);
      
      if (DEBUG) {
        console.log(`Error saving position: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
        console.log(`===== END SAVE READING POSITION (ERROR) =====`);
      }
      
      return false;
    }
  }
};