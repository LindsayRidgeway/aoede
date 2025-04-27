// LibraryUI.js - Component for the library screen with search and management
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, SafeAreaView, Alert, Linking,
  FlatList, ActivityIndicator, Platform
} from 'react-native';
import { styles } from './styles';
import { getUserLibrary, removeBookFromLibrary, addBookToLibrary } from './userLibrary';

export function LibraryUI({
  visible,
  onClose,
  uiText,
  onLibraryChange // New prop to notify parent of library changes
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

  // Load user's library when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadLibrary();
    }
  }, [visible, refreshKey]);
  
  // Notify parent when modal is closing if library changed
  useEffect(() => {
    return () => {
      if (libraryChanged && onLibraryChange) {
        onLibraryChange();
      }
    };
  }, [libraryChanged, onLibraryChange]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load the user's library
  const loadLibrary = async () => {
    setLoading(true);
    try {
      const userLibrary = await getUserLibrary();
      
      // Sort books by their translated title
      const sortedBooks = [...userLibrary].sort((a, b) => {
        const titleA = getBookTitle(a).toLowerCase();
        const titleB = getBookTitle(b).toLowerCase();
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
  
  // Function to add a book from search results to library
  const handleAddBook = async (book) => {
    try {
      setLoading(true);
      
      // Format the book for storage
      const newBook = {
        id: book.bookId || `custom_${Date.now()}`,
        title: book.title,
        author: book.author || "Unknown",
        url: book.url,
        language: book.language || "en",
        format: "text"
      };
      
      const success = await addBookToLibrary(newBook);
      
      if (success) {
        // Mark library as changed
        setLibraryChanged(true);
        
        // Remove the added book from search results
        setSearchResults(prevResults => 
          prevResults.filter(item => item.url !== book.url)
        );
        
        // Update library
        await loadLibrary();
        
        // Show success message
        const message = `${uiText.bookAdded || "Book added to library"}: ${book.title}`;
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
  
  // Process a single book
  const processBook = async (bookPath, title, author, subject) => {
    if (abortControllerRef.current?.signal.aborted) {
      return { success: false };
    }
    
    const bookUrl = `https://www.gutenberg.org${bookPath}`;
      
    try {
      const hubText = await fetchWithProxies(bookUrl);
      
      // Create a parser to process the HTML
      const parser = new DOMParser();
      const hubDoc = parser.parseFromString(hubText, 'text/html');
      
      // Get language info
      let bookLanguage = 'en';
      const bibrec = hubDoc.querySelector('table.bibrec');
      
      if (bibrec) {
        const rows = bibrec.querySelectorAll('tr');
        
        for (const row of rows) {
          const thElement = row.querySelector('th');
          const tdElement = row.querySelector('td');
          
          if (thElement && tdElement) {
            const label = thElement.innerText.trim();
            const value = tdElement.innerText.trim();
            
            if (label.toLowerCase().includes('language')) {
              bookLanguage = value.split(',')[0].trim().toLowerCase();
            }
          }
        }
      }
      
      // Simplify language code
      if (bookLanguage.includes('english')) bookLanguage = 'en';
      else if (bookLanguage.includes('french')) bookLanguage = 'fr';
      else if (bookLanguage.includes('german')) bookLanguage = 'de';
      else if (bookLanguage.includes('spanish')) bookLanguage = 'es';
      else if (bookLanguage.includes('italian')) bookLanguage = 'it';
      else if (bookLanguage.includes('russian')) bookLanguage = 'ru';
      else if (bookLanguage.includes('chinese')) bookLanguage = 'zh';
      else if (bookLanguage.includes('japanese')) bookLanguage = 'ja';
      
      // Get HTML version URL
      const bookId = bookPath.replace(/\/ebooks\//, '').replace(/\D/g, '');
      const htmlBase = `https://www.gutenberg.org/files/${bookId}/${bookId}-h`;
      const htmlUrl = `${htmlBase}/${bookId}-h.htm`;
      
      try {
        // Read only first part of HTML file for anchor
        const htmlFragment = await fetchWithProxies(htmlUrl, 50000);
        
        // Try to find a good anchor - prioritize likely chapter beginnings
        const priorityAnchors = htmlFragment.match(/<a\s+[^>]*?(?:id|name)=["'](chapter|book|part|preface|introduction|toc|contents|title|heading).*?["'][^>]*>/i);
        
        // If no priority anchor, look for any anchor
        const anyAnchor = priorityAnchors || 
                        htmlFragment.match(/<a\s+[^>]*?(?:id|name)=["']([^"']+)["'][^>]*>/i);
                        
        // Fallback to link to anchor
        const anchorLink = anyAnchor || 
                          htmlFragment.match(/<a\s+[^>]*?href=["']#([^"']+)["'][^>]*>/i);
        
        if (!anchorLink) {
          return { success: false };
        }
        
        // Extract anchor name (group 1)
        const anchor = anchorLink[1];
        const fullUrl = `${htmlUrl}#${anchor}`;
        
        // Return book info
        return {
          success: true,
          bookInfo: {
            title,
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
  const getAllPages = async (searchUrl, doc) => {
    // Find first page links
    const firstPageLinks = Array.from(doc.querySelectorAll('li.booklink a.link'));
    
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
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Get all pages of results
      const allLinks = await getAllPages(searchUrl, doc);
      
      // Handle no results
      if (allLinks.length === 0) {
        setIsSearching(false);
        return;
      }
      
      // Process each book
      for (const a of allLinks) {
        // Check if search was stopped
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Search stopped');
        }
        
        const bookPath = a.getAttribute('href');
        const title = a.querySelector('span.title')?.innerText.trim() || 'Untitled';
        const author = a.querySelector('span.subtitle')?.innerText.trim() || 'Unknown';
        
        // Process book
        const result = await processBook(bookPath, title, author, searchQuery);
        
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