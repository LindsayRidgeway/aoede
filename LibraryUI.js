// LibraryUI.js - Component for the library screen with search and management
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, SafeAreaView, Alert, Linking,
  FlatList, ActivityIndicator, Platform, StyleSheet
} from 'react-native';
import { styles } from './styles';
import { getUserLibrary, removeBookFromLibrary, addBookToLibrary } from './userLibrary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiTranslateSentenceFast } from './apiServices';
import Constants from 'expo-constants';

// Storage key for translated titles
const TRANSLATED_TITLES_KEY = 'aoede_translated_titles';

export function LibraryUI({
  visible,
  onClose,
  uiText
}) {
  // State for user's book library
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh
  const [libraryChanged, setLibraryChanged] = useState(false); // Track if library changed
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [debugMessages, setDebugMessages] = useState([]);
  const abortControllerRef = useRef(null);
  
  // Current mode: 'library' or 'search'
  const [activeMode, setActiveMode] = useState('library');
  
  // Enhanced Exit button with 3D metallic burgundy style
  const enhancedExitButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.exitButton,
        backgroundImage: 'linear-gradient(180deg, #a00030 0%, #800020 50%, #600010 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #600010',
      }
    : {
        ...styles.exitButton,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#600010',
      };
  
  // Enhanced Search button with 3D metallic blue style
  const enhancedSearchButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.searchButton,
        backgroundImage: 'linear-gradient(180deg, #4a8ab5 0%, #3a7ca5 50%, #2a6c95 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #2a6c95',
      }
    : {
        ...styles.searchButton,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#2a6c95',
      };
  
  // Enhanced red Stop button style (when searching)
  const enhancedStopButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.searchButton,
        backgroundImage: 'linear-gradient(180deg, #ff5555 0%, #d9534f 50%, #c9302c 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #c9302c',
      }
    : {
        ...styles.searchButton,
        backgroundColor: '#d9534f',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#c9302c',
      };
  
  // Enhanced button text style with subtle text shadow
  const enhancedButtonTextStyle = {
    ...styles.buttonText,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  };
  
  // Utility function to add debug messages
  const addDebugMessage = (message) => {
    setDebugMessages(prev => [...prev, message]);
  };
  
  // Utility function to clear debug messages
  const clearDebugMessages = () => {
    setDebugMessages([]);
  };
  
  // Load saved translated titles
  const loadTranslatedTitles = async () => {
    try {
      const savedTranslations = await AsyncStorage.getItem(TRANSLATED_TITLES_KEY);
      if (savedTranslations) {
        const translationsObject = JSON.parse(savedTranslations);
        
        // Update uiText with saved translations
        Object.keys(translationsObject).forEach(key => {
          uiText[key] = translationsObject[key];
        });
      }
    } catch (error) {
      console.error("Error loading translated titles:", error);
    }
  };

  // Save a translated title
  const saveTranslatedTitle = async (bookId, translatedTitle) => {
    try {
      // Get existing translations
      let translations = {};
      const savedTranslations = await AsyncStorage.getItem(TRANSLATED_TITLES_KEY);
      
      if (savedTranslations) {
        translations = JSON.parse(savedTranslations);
      }
      
      // Add the new translation
      translations[bookId] = translatedTitle;
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(TRANSLATED_TITLES_KEY, JSON.stringify(translations));
      
      // Also update uiText
      uiText[bookId] = translatedTitle;
      
      return true;
    } catch (error) {
      console.error("Failed to save translation:", error);
      return false;
    }
  };

  // Load user's library when modal becomes visible
  useEffect(() => {
    if (visible) {
      const initialize = async () => {
        // Load translations first
        await loadTranslatedTitles();
        // Then load library
        await loadLibrary();
      };
      
      initialize();
    }
  }, [visible, refreshKey]);
  
  // Notify parent when modal is closing if library changed
  useEffect(() => {
    return () => {
      if (libraryChanged && onClose) {
        if (onClose) {
          onClose(libraryChanged);
        }
      }
    };
  }, [libraryChanged, onClose]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to get a sort-friendly version of a title
  const getSortableTitle = (title) => {
    // Convert to lowercase for case-insensitive comparison
    let sortableTitle = title.toLowerCase();
    
    // Remove "The ", "A ", and "An " from the beginning of the title
    sortableTitle = sortableTitle.replace(/^(the |a |an )/i, '');
    
    return sortableTitle.trim();
  };

  // Load the user's library
  const loadLibrary = async () => {
    setLoading(true);
    try {
      const userLibrary = await getUserLibrary();
      
      // Sort books by their translated title, ignoring initial articles
      const sortedBooks = [...userLibrary].sort((a, b) => {
        const titleA = getSortableTitle(getBookTitle(a));
        const titleB = getSortableTitle(getBookTitle(b));
        return titleA.localeCompare(titleB);
      });
      
      setBooks(sortedBooks);
    } catch (error) {
      console.error("Error loading library:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get translated book title if available
  const getBookTitle = (book) => {
    // Try to get translated title from uiText
    const translatedTitle = uiText[book.id] || uiText[`${book.id}Title`] || uiText[book.id + 'Title'];
    return translatedTitle || book.title;
  };

  // Handle book deletion with proper confirmation
  const handleDeleteBook = (book) => {
    const confirmMessage = `${uiText.confirmDelete || "Are you sure you want to delete"} "${getBookTitle(book)}" ${uiText.fromLibrary || "from your library"}?`;
    
    // Use platform-specific confirmation
    if (Platform.OS === 'web') {
      if (confirm(confirmMessage)) {
        deleteBookFromLibrary(book.id);
      }
    } else {
      Alert.alert(
        uiText.deleteBook || "Delete Book",
        confirmMessage,
        [
          {
            text: uiText.cancel || "Cancel",
            style: "cancel"
          },
          {
            text: uiText.yes || "Yes",
            onPress: () => deleteBookFromLibrary(book.id)
          }
        ]
      );
    }
  };
  
  // Function to actually delete the book
  const deleteBookFromLibrary = async (bookId) => {
    try {
      // Show loading while deleting
      setLoading(true);
      
      const result = await removeBookFromLibrary(bookId);
      
      if (result) {
        // Mark library as changed
        setLibraryChanged(true);
        
        // Success - reload the library
        await loadLibrary();
      } else {
        // Failed to delete
        const errorMessage = uiText.errorDeletingBook || "Error deleting book";
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert(uiText.error || "Error", errorMessage);
        }
      }
    } catch (error) {
      console.error("Error in deleteBookFromLibrary:", error);
      const errorMessage = `${uiText.errorDeletingBook || "Error deleting book"}: ${error.message}`;
      
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(uiText.error || "Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to translate title to user's language if needed
  const translateBookTitle = async (title, originalLanguage = "en") => {
    try {
      // Get the user's device language
      const userLang = typeof navigator !== 'undefined' && navigator.language
        ? navigator.language.split('-')[0]
        : 'en';
      
      // Don't translate if already in user's language
      if (userLang === originalLanguage) {
        return title;
      }
      
      // Use the apiTranslateSentenceFast function for translation
      return await apiTranslateSentenceFast(title, originalLanguage, userLang);
    } catch (error) {
      console.error("Error translating title:", error);
      return title; // Return original title on error
    }
  };
  
  // Function to add a book from search results to library
  const handleAddBook = async (book) => {
    try {
      setLoading(true);
      
      // Format title to include the author
      const titleParts = book.title.split(' by ');
      let originalTitle = titleParts[0];
      let author = titleParts.length > 1 ? titleParts[1] : book.author;
      
      // Create a properly formatted title with "by [author]"
      const formattedTitle = `${originalTitle} by ${author}`;
      
      // Generate a consistent ID
      const bookId = book.bookId || `custom_${Date.now()}`;
      
      // Format the book for storage
      const newBook = {
        id: bookId,
        title: formattedTitle,  // Store the formatted title with author
        author: author,
        url: book.url,
        language: book.language || "en",
        format: "text"
      };
      
      // Translate the title
      const translatedTitle = await translateBookTitle(formattedTitle, book.language || "en");
      
      const success = await addBookToLibrary(newBook);
      
      if (success) {
        // Save the translation to persistent storage if different from original
        if (translatedTitle !== formattedTitle) {
          await saveTranslatedTitle(bookId, translatedTitle);
        }
        
        // Mark library as changed
        setLibraryChanged(true);
        
        // Remove the added book from search results
        setSearchResults(prevResults => 
          prevResults.filter(item => item.url !== book.url)
        );
        
        // Update library
        await loadLibrary();
        
        // Show success message with translated title if available
        const displayTitle = translatedTitle || formattedTitle;
        const message = `${uiText.bookAdded || "Book added to library"}: ${displayTitle}`;
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert(uiText.success || "Success", message);
        }
      } else {
        throw new Error("Failed to add book");
      }
    } catch (error) {
      const errorMessage = `${uiText.errorAddingBook || "Error adding book"}: ${error.message}`;
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(uiText.error || "Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // ---- Search Functionality ----
  
  // Simple fetch with robust error handling and platform awareness
  const safeFetch = async (url, options = {}) => {
    try {
      addDebugMessage(`Fetching: ${url.substring(0, 50)}...`);
      
      // Set a reasonable timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout
      
      let finalOptions = {
        ...options,
        signal: controller.signal
      };
      
      let response;
      
      // Only apply proxy in web environment
      if (Platform.OS === 'web') {
        // Use a reliable CORS proxy specifically for the search functionality
        const corsProxy = 'https://api.codetabs.com/v1/proxy?quest=';
        const encodedUrl = encodeURIComponent(url);
        const proxyUrl = `${corsProxy}${encodedUrl}`;
        
        addDebugMessage(`Using proxy: ${corsProxy}`);
        response = await fetch(proxyUrl, finalOptions);
      } else {
        // Native platforms don't need proxy
        response = await fetch(url, finalOptions);
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      addDebugMessage(`Fetch successful: ${text.length} bytes`);
      return text;
    } catch (error) {
      if (error.name === 'AbortError') {
        addDebugMessage('Fetch timed out after 30 seconds');
        throw new Error('Fetch timed out');
      }
      addDebugMessage(`Fetch error: ${error.message}`);
      throw error;
    }
  };
  
  // Function to find the best anchor in HTML content
  const findBestAnchor = (htmlContent) => {
    // Skip if no content
    if (!htmlContent || htmlContent.length === 0) {
      return null;
    }
    
    // Priority tags to look for (in order of preference)
    const priorityTags = [
      'chapter01', 'chapter1', 'chapter-1', 'chap01', 'chap1', 'chap-1',
      'book01', 'book1', 'book-1',
      'part01', 'part1', 'part-1',
      'preface', 'introduction', 'intro',
      'toc', 'contents', 'table-of-contents',
      'title', 'heading', 'header'
    ];
    
    // First, try to find priority anchors (best for reading)
    for (const tag of priorityTags) {
      // Look for id attribute
      const idPattern = `id="${tag}"`;
      const idIndex = htmlContent.indexOf(idPattern);
      if (idIndex !== -1) {
        return tag;
      }
      
      // Look for name attribute
      const namePattern = `name="${tag}"`;
      const nameIndex = htmlContent.indexOf(namePattern);
      if (nameIndex !== -1) {
        return tag;
      }
    }
    
    // Second, try to find any anchor that looks like a chapter or part
    const chapterRegex = /<a[^>]*?(?:id|name)=["'](chapter|book|part).*?["'][^>]*>/i;
    const chapterMatch = htmlContent.match(chapterRegex);
    if (chapterMatch && chapterMatch[1]) {
      // Extract the full id/name value
      const fullAnchorRegex = /<a[^>]*?(?:id|name)=["']([^"']+)["'][^>]*>/i;
      const fullMatch = htmlContent.substring(chapterMatch.index).match(fullAnchorRegex);
      if (fullMatch && fullMatch[1]) {
        return fullMatch[1];
      }
    }
    
    // Third, try to find any id or name attribute in an anchor tag
    const anyAnchorRegex = /<a[^>]*?(?:id|name)=["']([^"']+)["'][^>]*>/i;
    const anyMatch = htmlContent.match(anyAnchorRegex);
    if (anyMatch && anyMatch[1]) {
      return anyMatch[1];
    }
    
    // Finally, try to find any link to an internal anchor
    const linkPattern = 'href="#';
    const linkIndex = htmlContent.indexOf(linkPattern);
    if (linkIndex !== -1) {
      // Extract the anchor part
      const startIndex = linkIndex + linkPattern.length;
      const endIndex = htmlContent.indexOf('"', startIndex);
      
      if (endIndex !== -1) {
        return htmlContent.substring(startIndex, endIndex);
      }
    }
    
    // No suitable anchor found
    return null;
  };
  
  // Extract booklinks from search page using string methods
  const extractBookLinksFromHtml = (html) => {
    const bookLinks = [];
    
    // Look for book entries manually with simple string searches
    let currentIndex = 0;
    while (true) {
      // Find the next book entry
      const bookEntryStart = html.indexOf('<li class="booklink">', currentIndex);
      if (bookEntryStart === -1) {
        break; // No more book entries
      }
      
      // Find the end of the book entry
      const bookEntryEnd = html.indexOf('</li>', bookEntryStart);
      if (bookEntryEnd === -1) {
        break; // Malformed HTML
      }
      
      // Extract the book entry HTML
      const bookEntryHtml = html.substring(bookEntryStart, bookEntryEnd + 5);
      
      // Find href link
      const hrefStart = bookEntryHtml.indexOf('href="');
      if (hrefStart !== -1) {
        const hrefValueStart = hrefStart + 6; // length of 'href="'
        const hrefValueEnd = bookEntryHtml.indexOf('"', hrefValueStart);
        if (hrefValueEnd !== -1) {
          const bookPath = bookEntryHtml.substring(hrefValueStart, hrefValueEnd);
          
          // Skip .txt files
          if (bookPath.toLowerCase().endsWith('.txt')) {
            currentIndex = bookEntryEnd + 5;
            continue;
          }
          
          // Find title
          let title = 'Unknown';
          const titleStart = bookEntryHtml.indexOf('<span class="title">');
          if (titleStart !== -1) {
            const titleValueStart = titleStart + 20; // length of '<span class="title">'
            const titleValueEnd = bookEntryHtml.indexOf('</span>', titleValueStart);
            if (titleValueEnd !== -1) {
              title = bookEntryHtml.substring(titleValueStart, titleValueEnd).trim();
            }
          }
          
          // Find author (subtitle)
          let author = 'Unknown';
          const authorStart = bookEntryHtml.indexOf('<span class="subtitle">');
          if (authorStart !== -1) {
            const authorValueStart = authorStart + 23; // length of '<span class="subtitle">'
            const authorValueEnd = bookEntryHtml.indexOf('</span>', authorValueStart);
            if (authorValueEnd !== -1) {
              author = bookEntryHtml.substring(authorValueStart, authorValueEnd).trim();
            }
          }
          
          bookLinks.push({
            bookPath,
            title,
            author
          });
        }
      }
      
      // Move to the next entry
      currentIndex = bookEntryEnd + 5;
    }
    
    return bookLinks;
  };
  
  // Process a single book
  const processBook = async (bookPath, title, author, subject) => {
    if (abortControllerRef.current?.signal.aborted) {
      return { success: false };
    }
    
    // Skip .txt files as they can't have anchors
    if (bookPath.toLowerCase().endsWith('.txt')) {
      return { success: false };
    }
    
    const bookUrl = `https://www.gutenberg.org${bookPath}`;
    addDebugMessage(`Processing book: ${title}`);
      
    try {
      // Use simple fetch for the hub page
      let hubText;
      try {
        hubText = await safeFetch(bookUrl);
      } catch (hubError) {
        addDebugMessage(`Failed to fetch book hub page: ${hubError.message}`);
        return { success: false };
      }
      
      // Extract book language and other metadata using string methods
      let bookLanguage = 'en';
      
      // Find the bibrec table
      const bibrecStart = hubText.indexOf('<table class="bibrec">');
      if (bibrecStart !== -1) {
        const bibrecEnd = hubText.indexOf('</table>', bibrecStart);
        if (bibrecEnd !== -1) {
          const bibrecTable = hubText.substring(bibrecStart, bibrecEnd);
          
          // Look for language information
          const langRowStart = bibrecTable.indexOf('Language</th>');
          if (langRowStart !== -1) {
            const langValueStart = bibrecTable.indexOf('<td>', langRowStart);
            if (langValueStart !== -1) {
              const langValueEnd = bibrecTable.indexOf('</td>', langValueStart);
              if (langValueEnd !== -1) {
                const langValue = bibrecTable.substring(langValueStart + 4, langValueEnd).trim();
                // Extract first language if multiple are listed
                const firstLang = langValue.split(',')[0].trim().toLowerCase();
                
                // Map common language names to codes
                if (firstLang.includes('english')) bookLanguage = 'en';
                else if (firstLang.includes('french')) bookLanguage = 'fr';
                else if (firstLang.includes('german')) bookLanguage = 'de';
                else if (firstLang.includes('spanish')) bookLanguage = 'es';
                else if (firstLang.includes('italian')) bookLanguage = 'it';
                else if (firstLang.includes('russian')) bookLanguage = 'ru';
                else if (firstLang.includes('chinese')) bookLanguage = 'zh';
                else if (firstLang.includes('japanese')) bookLanguage = 'ja';
              }
            }
          }
        }
      }
      
      // Get HTML version URL by extracting the book ID
      let bookId = '';
      
      // Try to extract book ID from the path using regex
      const idMatch = bookPath.match(/\/ebooks\/(\d+)/);
      if (idMatch && idMatch[1]) {
        bookId = idMatch[1];
      } else {
        // Alternative: extract from URL
        const pathParts = bookPath.split('/');
        for (const part of pathParts) {
          if (/^\d+$/.test(part)) {
            bookId = part;
            break;
          }
        }
      }
      
      if (!bookId) {
        addDebugMessage('Could not extract book ID');
        return { success: false };
      }
      
      addDebugMessage(`Found book ID: ${bookId}`);
      
      const htmlUrl = `https://www.gutenberg.org/files/${bookId}/${bookId}-h/${bookId}-h.htm`;
      
      // Try to fetch the HTML file
      let htmlContent;
      try {
        // Just get a small part for finding anchors
        const options = {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        };
        htmlContent = await safeFetch(htmlUrl, options);
      } catch (htmlErr) {
        addDebugMessage(`Failed to fetch HTML file: ${htmlErr.message}`);
        return { success: false };
      }
      
      // Find an appropriate anchor using string manipulation
      const anchor = findBestAnchor(htmlContent);
      
      if (!anchor) {
        addDebugMessage('No suitable anchor found');
        return { success: false };
      }
      
      addDebugMessage(`Found anchor: ${anchor}`);
      
      // Format title with author: "Title by Author"
      const formattedTitle = `${title} by ${author}`;
      const fullUrl = `${htmlUrl}#${anchor}`;
      
      // Return book info
      return {
        success: true,
        bookInfo: {
          title: formattedTitle,
          author,
          bookId,
          url: fullUrl,
          language: bookLanguage
        }
      };
    } catch (error) {
      addDebugMessage(`Error processing book: ${error.message}`);
      return { success: false };
    }
  };
  
  // Get search results
  const getSearchResults = async (query) => {
    const searchUrl = `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(query)}`;
    
    try {
      addDebugMessage('Starting search...');
      
      // Fetch search results
      const html = await safeFetch(searchUrl);
      
      // Extract book links
      const bookLinks = extractBookLinksFromHtml(html);
      
      if (bookLinks.length === 0) {
        addDebugMessage('No books found in search results');
        return [];
      }
      
      // Just return the links without processing for now
      return bookLinks;
    } catch (error) {
      addDebugMessage(`Search error: ${error.message}`);
      throw error;
    }
  };
  
  // Stop search
  const stopSearch = () => {
    if (isSearching && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSearching(false);
      addDebugMessage('Search stopped by user');
    }
  };
  
  // Start search
  const handleSearch = async () => {
    if (isSearching) {
      stopSearch();
      return;
    }
    
    if (!searchQuery.trim()) {
      const message = uiText.enterSearchQuery || "Please enter a search query";
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(uiText.error || "Error", message);
      }
      return;
    }
    
    // Clear previous results and debug messages
    setSearchResults([]);
    clearDebugMessages();
    setIsSearching(true);
    
    // Setup abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      // Get search results
      const bookLinks = await getSearchResults(searchQuery);
      
      // Process all books instead of a limited number
      let processedCount = 0;
      
      // Process each book, no arbitrary limit
      for (let i = 0; i < bookLinks.length; i++) {
        // Check if search was stopped
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Search stopped');
        }
        
        const link = bookLinks[i];
        addDebugMessage(`Processing book ${i+1}/${bookLinks.length}: ${link.title}`);
        
        // Skip .txt URLs
        if (link.bookPath.toLowerCase().endsWith('.txt')) {
          continue;
        }
        
        // Process book
        const result = await processBook(link.bookPath, link.title, link.author, searchQuery);
        
        // Add to results if successful
        if (result.success) {
          setSearchResults(prev => [...prev, result.bookInfo]);
          processedCount++;
        }
        
        // Add a small delay between processing books to prevent UI freezing
        // and allow the user to start seeing results sooner
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      addDebugMessage(`Search completed: ${processedCount} books processed successfully`);
    } catch (err) {
      if (err.message !== 'Search stopped') {
        addDebugMessage(`Error: ${err.message}`);
        const errorMessage = `${uiText.searchError || "Search error"}: ${err.message}`;
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert(uiText.error || "Error", errorMessage);
        }
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle closing the library modal with improved approach
  const handleClose = () => {
    // Store current value before resetting
    const wasChanged = libraryChanged;
    
    // Reset the flag immediately to prevent future triggers
    setLibraryChanged(false);
    
    // Call onClose with the stored value
    if (onClose) {
      onClose(wasChanged);
    }
  };
  
  // Handle opening URL
  const handleOpenURL = (url) => {
    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
      const message = uiText.cannotOpenURL || "Cannot open URL";
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(uiText.error || "Error", message);
      }
    });
  };

  // Render a library book item
  const renderLibraryBookItem = ({ item }) => (
    <View style={styles.bookListItem}>
      <View style={styles.bookInfoContainer}>
        <Text style={styles.bookTitle}>{getBookTitle(item)}</Text>
        <Text style={styles.bookLanguage}>{item.language}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBook(item)}
      >
        <Text style={styles.deleteButtonText}>{uiText.deleteBook || "Delete"}</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render a search result item
  const renderSearchResultItem = ({ item }) => (
    <View style={styles.bookListItem}>
      <View style={styles.bookInfoContainer}>
        <TouchableOpacity onPress={() => handleOpenURL(item.url)}>
          <Text style={styles.bookTitleLink}>{item.title}</Text>
        </TouchableOpacity>
        <Text style={styles.bookLanguage}>{item.language}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddBook(item)}
      >
        <Text style={styles.addButtonText}>{uiText.addBook || "Add"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.libraryModal}>
        <View style={styles.libraryContentWrapper}>
          {/* Header with Exit button */}
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>
              {uiText.library || "Library"}
            </Text>
            <TouchableOpacity 
              style={enhancedExitButtonStyle} 
              onPress={handleClose}
            >
              <Text style={enhancedButtonTextStyle}>
                {uiText.exit || "Exit"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Tab buttons for Library/Search */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeMode === 'library' ? styles.activeTabButton : null
              ]}
              onPress={() => setActiveMode('library')}
            >
              <Text style={[
                styles.tabButtonText,
                activeMode === 'library' ? styles.activeTabButtonText : null
              ]}>
                {uiText.myLibrary || "My Library"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeMode === 'search' ? styles.activeTabButton : null
              ]}
              onPress={() => setActiveMode('search')}
            >
              <Text style={[
                styles.tabButtonText,
                activeMode === 'search' ? styles.activeTabButtonText : null
              ]}>
                {uiText.searchBooks || "Search Books"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Section */}
          {activeMode === 'search' && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={uiText.searchPlaceholder || "Search Project Gutenberg by title, author, or subject"}
                  placeholderTextColor="#bbbbbb"
                  fontStyle="italic"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  editable={!isSearching}
                />
                <TouchableOpacity
                  style={isSearching ? enhancedStopButtonStyle : enhancedSearchButtonStyle}
                  onPress={handleSearch}
                >
                  <Text style={enhancedButtonTextStyle}>
                    {isSearching 
                      ? (uiText.stopSearch || "Stop") 
                      : (uiText.search || "Search")}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Search Results */}
              <View style={styles.resultsContainer}>
                {isSearching && searchResults.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#800020" />
                    <Text style={styles.loadingText}>
                      {uiText.searching || "Searching..."}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResultItem}
                    keyExtractor={(item, index) => `search_${index}`}
                    contentContainerStyle={styles.bookList}
                    ListEmptyComponent={null} // No empty state prompt
                  />
                )}
              </View>
            </View>
          )}
          
          {/* Library Section */}
          {activeMode === 'library' && (
            <View style={styles.libraryContent}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#800020" />
                  <Text style={styles.loadingText}>
                    {uiText.loading || "Loading..."}
                  </Text>
                </View>
              ) : books.length === 0 ? (
                <View style={styles.emptyLibraryContainer}>
                  <Text style={styles.emptyLibraryText}>
                    {uiText.emptyLibrary || "Your library is empty."}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={books}
                  renderItem={renderLibraryBookItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.bookList}
                />
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}