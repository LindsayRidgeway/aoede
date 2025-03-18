// bookCache.js - Caching system for book content
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for cache management
const CACHE_PREFIX = 'book_cache_';
const CACHE_INDEX_KEY = 'book_cache_index';
const CACHE_VERSION = '1.0';
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const MAX_CACHE_ENTRIES = 20; // Maximum number of books to cache

// Cache index structure to keep track of cached books and their metadata
class BookCacheManager {
  constructor() {
    this.cacheIndex = null;
    this.initialized = false;
  }

  // Initialize the cache manager
  async initialize() {
    if (this.initialized) return;
    
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      
      if (indexData) {
        this.cacheIndex = JSON.parse(indexData);
        
        // Check cache version and reset if outdated
        if (this.cacheIndex.version !== CACHE_VERSION) {
          await this.resetCache();
        }
      } else {
        // Initialize a new cache index
        this.cacheIndex = {
          version: CACHE_VERSION,
          entries: {},
          lastCleanup: Date.now()
        };
        await this.saveIndex();
      }
      
      this.initialized = true;
      
      // Perform cache maintenance if needed (every ~7 days)
      const daysSinceLastCleanup = (Date.now() - this.cacheIndex.lastCleanup) / (24 * 60 * 60 * 1000);
      if (daysSinceLastCleanup > 7) {
        this.performMaintenance();
      }
      
    } catch (error) {
      console.error('Error initializing book cache:', error);
      // Reset cache on error
      await this.resetCache();
    }
  }

  // Save the cache index to AsyncStorage
  async saveIndex() {
    try {
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
    } catch (error) {
      console.error('Error saving cache index:', error);
    }
  }

  // Check if a book is in the cache
  async isBookCached(bookId) {
    await this.initialize();
    return !!this.cacheIndex.entries[bookId];
  }

  // Get book data from cache
  async getBookFromCache(bookId) {
    await this.initialize();
    
    try {
      if (!this.cacheIndex.entries[bookId]) {
        return null;
      }
      
      const cacheKey = `${CACHE_PREFIX}${bookId}`;
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedDataStr) {
        // Cache inconsistency, remove from index
        delete this.cacheIndex.entries[bookId];
        await this.saveIndex();
        return null;
      }
      
      // Update last accessed timestamp
      this.cacheIndex.entries[bookId].lastAccessed = Date.now();
      await this.saveIndex();
      
      // Parse and return the cached data
      return JSON.parse(cachedDataStr);
    } catch (error) {
      console.error(`Error retrieving book ${bookId} from cache:`, error);
      return null;
    }
  }

  // Add a book to the cache
  async addBookToCache(bookId, bookData) {
    await this.initialize();
    
    try {
      // Check if we need to make room for new entries
      await this.ensureCacheSpace();
      
      // Add entry to the index
      this.cacheIndex.entries[bookId] = {
        added: Date.now(),
        lastAccessed: Date.now(),
        title: bookData.title || 'Unknown',
        sentenceCount: bookData.sentences ? bookData.sentences.length : 0
      };
      
      // Save the actual book data
      const cacheKey = `${CACHE_PREFIX}${bookId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(bookData));
      
      // Update the index
      await this.saveIndex();
      
      return true;
    } catch (error) {
      console.error(`Error adding book ${bookId} to cache:`, error);
      return false;
    }
  }

  // Ensure we have space in the cache by removing oldest entries if needed
  async ensureCacheSpace() {
    const entries = Object.entries(this.cacheIndex.entries);
    
    // If we're below the limit, no need to remove anything
    if (entries.length < MAX_CACHE_ENTRIES) {
      return;
    }
    
    // Sort entries by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries until we're below the limit
    const entriesToRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES + 1);
    
    for (const [bookId, metadata] of entriesToRemove) {
      await this.removeBookFromCache(bookId);
    }
  }

  // Remove a book from the cache
  async removeBookFromCache(bookId) {
    await this.initialize();
    
    try {
      // Remove from index
      if (this.cacheIndex.entries[bookId]) {
        delete this.cacheIndex.entries[bookId];
      }
      
      // Remove actual data
      const cacheKey = `${CACHE_PREFIX}${bookId}`;
      await AsyncStorage.removeItem(cacheKey);
      
      // Update index
      await this.saveIndex();
      
      return true;
    } catch (error) {
      console.error(`Error removing book ${bookId} from cache:`, error);
      return false;
    }
  }

  // Perform maintenance on the cache
  async performMaintenance() {
    await this.initialize();
    
    try {
      const now = Date.now();
      const expiredEntries = [];
      
      // Find expired entries (older than MAX_CACHE_AGE_MS)
      for (const [bookId, metadata] of Object.entries(this.cacheIndex.entries)) {
        if (now - metadata.lastAccessed > MAX_CACHE_AGE_MS) {
          expiredEntries.push(bookId);
        }
      }
      
      // Remove expired entries
      for (const bookId of expiredEntries) {
        await this.removeBookFromCache(bookId);
      }
      
      // Update last cleanup timestamp
      this.cacheIndex.lastCleanup = now;
      await this.saveIndex();
    } catch (error) {
      console.error('Error during cache maintenance:', error);
    }
  }

  // Reset the entire cache
  async resetCache() {
    try {
      // Create a fresh cache index
      this.cacheIndex = {
        version: CACHE_VERSION,
        entries: {},
        lastCleanup: Date.now()
      };
      
      // Save the new index
      await this.saveIndex();
      
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Find and remove all book cache entries
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error resetting cache:', error);
      return false;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    await this.initialize();
    
    const stats = {
      version: this.cacheIndex.version,
      totalEntries: Object.keys(this.cacheIndex.entries).length,
      totalSentences: 0,
      oldestEntry: null,
      newestEntry: null,
      books: []
    };
    
    // Calculate statistics
    const entries = Object.entries(this.cacheIndex.entries);
    if (entries.length > 0) {
      // Get oldest and newest entries
      entries.sort((a, b) => a[1].added - b[1].added);
      stats.oldestEntry = {
        id: entries[0][0],
        title: entries[0][1].title,
        added: new Date(entries[0][1].added).toISOString()
      };
      stats.newestEntry = {
        id: entries[entries.length - 1][0],
        title: entries[entries.length - 1][1].title,
        added: new Date(entries[entries.length - 1][1].added).toISOString()
      };
      
      // Collect book info and count total sentences
      for (const [bookId, metadata] of entries) {
        stats.totalSentences += metadata.sentenceCount || 0;
        stats.books.push({
          id: bookId,
          title: metadata.title,
          sentenceCount: metadata.sentenceCount || 0,
          added: new Date(metadata.added).toISOString(),
          lastAccessed: new Date(metadata.lastAccessed).toISOString()
        });
      }
      
      // Sort books by last accessed (most recent first)
      stats.books.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    }
    
    return stats;
  }
}

// Export a singleton instance
export default new BookCacheManager();
