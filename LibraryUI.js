// LibraryUI.js - Component for the library screen with search and management
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, SafeAreaView, Alert, Linking,
  FlatList, ActivityIndicator, Platform
} from 'react-native';
import { styles } from './styles';
import { getUserLibrary, removeBookFromLibrary, addBookToLibrary } from './userLibrary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Key for storing translated titles
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
  const abortControllerRef = useRef(null);
  
  // Current mode: 'library' or 'search'
  const [activeMode, setActiveMode] = useState('library');
  
  // Proxies for CORS handling
  const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://proxy.cors.sh/',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  const [lastSuccessfulProxy, setLastSuccessfulProxy] = useState(null);

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
        onClose(libraryChanged);
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
      
      // Get Google API key if available
      const GOOGLE_API_KEY = getGoogleApiKey();
      if (!GOOGLE_API_KEY) {
        return title; // Can't translate without API key
      }
      
      // Translate the title
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: title,
            source: originalLanguage,
            target: userLang,
            format: "text"
          })
        }
      );
      
      if (!response.ok) {
        return title; // Return original title if translation fails
      }
      
      const data = await response.json();
      
      if (data.data?.translations?.length > 0) {
        return data.data.translations[0].translatedText;
      }
      
      return title; // Return original title if no translation
    } catch (error) {
      console.error("Error translating title:", error);
      return title; // Return original title on error
    }
  };
  
  // Get Google API key from Expo Constants
  const getGoogleApiKey = () => {
    if (Constants?.expoConfig?.extra?.GOOGLE_API_KEY) {
      return Constants.expoConfig.extra.GOOGLE_API_KEY;
    }
    
    if (Constants?.manifest?.extra?.GOOGLE_API_KEY) {
      return Constants.manifest.extra.GOOGLE_API_KEY;
    }
    
    if (Constants?.extra?.GOOGLE_API_KEY) {
      return Constants.extra.GOOGLE_API_KEY;
    }
    
    return null;
  };
  
  // Function to add a book from search results to library
  const handleAddBook = async (book) => {
    try {
      setLoading(true);
      
      // Extract original title without author
      const titleParts = book.title.split(' by ');
      const originalTitle = titleParts[0];
      const author = titleParts.length > 1 ? titleParts[1] : book.author;
      
      // Generate a consistent ID
      const bookId = book.bookId || `custom_${Date.now()}`;
      
      // Format the book for storage - use original title for storage
      const newBook = {
        id: bookId,
        title: originalTitle,  // Store original title in the book object
        author: author,
        url: book.url,
        language: book.language || "en",
        format: "text"
      };
      
      // Translate the title
      const translatedTitle = await translateBookTitle(originalTitle, book.language || "en");
      
      const success = await addBookToLibrary(newBook);
      
      if (success) {
        // Save the translation to persistent storage if different from original
        if (translatedTitle !== originalTitle) {
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
        const displayTitle = translatedTitle || originalTitle;
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
  
  // Fetch with proxy
  const fetchWithProxies = async (url, readFirstNBytes = null) => {
    // Start with the last successful proxy if available
    let orderedProxies = [...CORS_PROXIES];
    
    if (lastSuccessfulProxy) {
      // Move the last successful proxy to the front
      orderedProxies = orderedProxies.filter(p => p !== lastSuccessfulProxy);
      orderedProxies.unshift(lastSuccessfulProxy);
    }
    
    for (let i = 0; i < orderedProxies.length; i++) {
      const proxy = orderedProxies[i];
      let proxyUrl;
      
      // Format the URL
      if (proxy.includes('?url=')) {
        proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      } else {
        proxyUrl = `${proxy}${url}`;
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          continue;
        }
        
        // If we only need to read part of the response
        if (readFirstNBytes) {
          try {
            const reader = response.body.getReader();
            const { value, done } = await reader.read();
            
            if (done) {
              return '';
            }
            
            const decoder = new TextDecoder();
            const text = decoder.decode(value.slice(0, readFirstNBytes));
            
            setLastSuccessfulProxy(proxy);
            return text;
          } catch (err) {
            continue;
          }
        } else {
          const text = await response.text();
          setLastSuccessfulProxy(proxy);
          return text;
        }
      } catch (error) {
        // Continue to next proxy
      }
    }
    
    throw new Error(uiText.allProxiesFailed || 'All proxies failed');
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
      
    try {
      const hubText = await fetchWithProxies(bookUrl);
      
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
        return { success: false };
      }
      
      const htmlBase = `https://www.gutenberg.org/files/${bookId}/${bookId}-h`;
      const htmlUrl = `${htmlBase}/${bookId}-h.htm`;
      
      // For now, fetch just the first 50kb of the HTML file to look for anchors
      try {
        const htmlFragment = await fetchWithProxies(htmlUrl, 50000);
        
        // Find an appropriate anchor using string manipulation
        const anchor = findBestAnchor(htmlFragment);
        
        if (!anchor) {
          return { success: false };
        }
        
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
      } catch (htmlErr) {
        return { success: false };
      }
    } catch (hubErr) {
      return { success: false };
    }
  };
  
  // Get all pages of search results
  const getAllPages = async (searchUrl, htmlContent) => {
    // Extract book links from first page using string methods
    const firstPageLinks = extractBookLinksFromHtml(htmlContent);
    
    if (!firstPageLinks || firstPageLinks.length === 0) {
      return [];
    }
    
    // Only process first page for faster results
    return firstPageLinks;
  };
  
  // Stop search
  const stopSearch = () => {
    if (isSearching && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSearching(false);
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
    
    // Clear previous results
    setSearchResults([]);
    setIsSearching(true);
    
    // Setup abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const query = encodeURIComponent(searchQuery);
      const searchUrl = `https://www.gutenberg.org/ebooks/search/?query=${query}`;
      
      // Get search results page
      const html = await fetchWithProxies(searchUrl);
      
      // Get all pages of results
      const allLinks = await getAllPages(searchUrl, html);
      
      // Handle no results
      if (allLinks.length === 0) {
        setIsSearching(false);
        return;
      }
      
      // Process each book
      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];
        
        // Check if search was stopped
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Search stopped');
        }
        
        // Skip .txt URLs since they can't have anchors
        if (link.bookPath.toLowerCase().endsWith('.txt')) {
          continue;
        }
        
        // Process book
        const result = await processBook(link.bookPath, link.title, link.author, searchQuery);
        
        // Add to results if successful
        if (result.success) {
          setSearchResults(prev => [...prev, result.bookInfo]);
        }
      }
    } catch (err) {
      if (err.message !== 'Search stopped') {
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
  
  // Handle closing the library modal with proper notification
  const handleClose = () => {
    if (onClose) {
      onClose(libraryChanged);
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
              style={styles.exitButton} 
              onPress={handleClose}
            >
              <Text style={styles.exitButtonText}>
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
                  style={[
                    styles.searchButton,
                    isSearching ? styles.stopButton : null
                  ]}
                  onPress={handleSearch}
                >
                  <Text style={styles.searchButtonText}>
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