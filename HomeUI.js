// HomeUI.js - Home UI with added gamepad support
import React, { useState, useEffect } from 'react';
import { 
  Text, View, TouchableOpacity, Image, 
  ActivityIndicator, Platform, Modal, FlatList, SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';
import ListeningSpeed from './listeningSpeed';
import Constants from 'expo-constants';
import { getUserLibrary } from './userLibrary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiTranslateSentenceFast, apiGetSupportedLanguages } from './apiServices';
import gamepadManager from './gamepadSupport';
import GamepadIndicator from './gamepadIndicator';

// Import iOS-specific components conditionally
let IosPickers = null;

// Only import iOS components if on iOS platform
if (Platform.OS === 'ios') {
  IosPickers = require('./IosPickers');
}

// Storage key for translated titles - must match the key in LibraryUI.js
const TRANSLATED_TITLES_KEY = 'aoede_translated_titles';

export function HomeUI({
  fontsLoaded,
  studyLanguage,
  setStudyLanguage,
  uiText,
  selectedBook,
  setSelectedBook,
  loadBook,
  loadingBook,
  readingLevel,
  setReadingLevel,
  handleClearContent,
  onLibraryButtonClick,
  libraryRefreshKey,
  // Add skipHeader prop
  skipHeader = false
}) {
  // State for displayed book title and modals
  const [displayBookTitle, setDisplayBookTitle] = useState("");
  const [showBookModal, setShowBookModal] = useState(false);
  
  // State for languages and language selection modal
  const [languages, setLanguages] = useState([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState(studyLanguage || uiText.enterLanguage || "Select language");
  
  // State for iOS modals
  const [showIosLanguageModal, setShowIosLanguageModal] = useState(false);
  const [showIosBookModal, setShowIosBookModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState(null);
  const [tempSelectedBook, setTempSelectedBook] = useState(null);
  
  // State for the user's book library
  const [books, setBooks] = useState([]);
  
  // Initialize gamepad support for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Initialize gamepad support
      gamepadManager.init();
    }
  }, []);
  
  // Enhanced Library button with 3D metallic burgundy style
  const enhancedLibraryButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.libraryButton,
        backgroundImage: 'linear-gradient(180deg, #a00030 0%, #800020 50%, #600010 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #600010',
      }
    : {
        ...styles.libraryButton,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#600010',
      };

  // Enhanced Load Book button with 3D metallic blue style
  const enhancedLoadButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.loadButton,
        backgroundImage: 'linear-gradient(180deg, #4a8ab5 0%, #3a7ca5 50%, #2a6c95 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #2a6c95',
      }
    : {
        ...styles.loadButton,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1, 
        borderColor: '#2a6c95',
      };

  // Enhanced button text style with subtle text shadow
  const enhancedButtonTextStyle = {
    ...styles.buttonText,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  };
  
  // Enhanced reading level button style - raised appearance
  const enhancedReadingLevelButtonStyle = Platform.OS === 'web'
    ? {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2), inset 0px 1px 2px rgba(255, 255, 255, 0.8)',
        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)',
        border: '1px solid #ccc',
        cursor: 'pointer',
      }
    : {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#ccc',
      };

  // Enhanced active reading level button - pressed appearance
  const enhancedReadingLevelButtonActiveStyle = Platform.OS === 'web'
    ? {
        backgroundColor: '#3a7ca5',
        backgroundImage: 'linear-gradient(180deg, #3a7ca5 0%, #2a6c95 100%)',
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2), inset 0px 1px 1px rgba(0, 0, 0, 0.3)',
        transform: 'translateY(1px)',
        border: '1px solid #1a5c85',
      }
    : {
        backgroundColor: '#3a7ca5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#1a5c85',
        // We can't translate in React Native styles, but we can modify the margin to create 
        // the impression that the button is pressed down
        marginTop: 1,
        marginBottom: -1,
      };

  // Enhanced text style for active button
  const enhancedReadingLevelButtonTextActiveStyle = {
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  };
  
  // Function to get a sort-friendly version of a title
  const getSortableTitle = (title) => {
    // Convert to lowercase for case-insensitive comparison
    let sortableTitle = title.toLowerCase();
    
    // Remove "The ", "A ", and "An " from the beginning of the title
    sortableTitle = sortableTitle.replace(/^(the |a |an )/i, '');
    
    return sortableTitle.trim();
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
  
  // Load the user's library when component mounts or when libraryRefreshKey changes
  useEffect(() => {
    const loadUserLibrary = async () => {
      try {
        // First load any saved translations
        await loadTranslatedTitles();
        
        const userLibrary = await getUserLibrary();
        
        // Sort books by their translated titles, ignoring initial articles
        const sortedBooks = [...userLibrary].sort((a, b) => {
          const titleA = getSortableTitle(getBookTitle(a));
          const titleB = getSortableTitle(getBookTitle(b));
          return titleA.localeCompare(titleB);
        });
        
        setBooks(sortedBooks);
        setFilteredBooks(sortedBooks);
        
        // If the currently selected book was deleted, clear the selection
        if (selectedBook && !sortedBooks.some(book => book.id === selectedBook)) {
          setSelectedBook("");
          setDisplayBookTitle(uiText.enterBook || "Select a book");
        } else if (selectedBook) {
          // Update display title for the selected book
          const book = sortedBooks.find(b => b.id === selectedBook);
          if (book) {
            setDisplayBookTitle(getBookTitle(book));
          }
        }
      } catch (error) {
        console.error("Failed to load user library:", error);
      }
    };
    
    loadUserLibrary();
  }, [libraryRefreshKey, uiText]);
  
  // Load languages from the API service using the centralized function
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        // Get user's system language for localized language names
        const userLang = typeof navigator !== 'undefined' && navigator.language
          ? navigator.language.split('-')[0]
          : 'en';
        
        // Use the centralized apiGetSupportedLanguages function
        const languagesList = await apiGetSupportedLanguages(userLang);
        
        if (languagesList && languagesList.length > 0) {
          // Sort languages alphabetically
          const sortedLanguages = [...languagesList].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          setLanguages(sortedLanguages);
          setFilteredLanguages(sortedLanguages);
        }
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };
    
    loadLanguages();
  }, []);
  
  // Update filtered books when search text changes
  useEffect(() => {
    if (searchText) {
      const filtered = books.filter(book => 
        getBookTitle(book).toLowerCase().includes(searchText.toLowerCase()) ||
        book.author.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredBooks(filtered);
    } else {
      setFilteredBooks(books);
    }
  }, [searchText, uiText, books]);
  
  // Update filtered languages when search text changes
  useEffect(() => {
    if (languages.length > 0 && searchText) {
      const filtered = languages.filter(lang => 
        lang.name.toLowerCase().includes(searchText.toLowerCase()) ||
        lang.language.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages(languages);
    }
  }, [searchText, languages]);
  
  // Update displayed language when studyLanguage changes
  useEffect(() => {
    if (studyLanguage) {
      // Find the language in our list if possible
      const lang = languages.find(l => 
        l.language === studyLanguage
      );
      
      if (lang) {
        setDisplayLanguage(lang.name);
      } else {
        // If we can't find the language in our list, use the code directly
        setDisplayLanguage(studyLanguage);
      }
    } else {
      setDisplayLanguage(uiText.enterLanguage || "Select language");
    }
  }, [studyLanguage, languages, uiText]);
  
  // Initialize listening speed from storage when component mounts
  useEffect(() => {
    ListeningSpeed.getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);
  
  // Update displayed book title when selection changes or when books are reloaded
  useEffect(() => {
    if (selectedBook) {
      const book = books.find(b => b.id === selectedBook);
      if (book) {
        setDisplayBookTitle(getBookTitle(book));
      }
    } else {
      setDisplayBookTitle(uiText.enterBook || "Select a book");
    }
  }, [selectedBook, uiText, books]);
  
  // Get translated book titles from uiText for dropdown
  const getBookTitle = (book) => {
    // Try to get translated title from uiText
    const translatedTitle = uiText[book.id] || uiText[`${book.id}Title`] || uiText[book.id + 'Title'];
    return translatedTitle || book.title;
  };

  // Handle Load Book button click
  const handleLoadButtonClick = () => {
    // Call the passed loadBook function from props
    loadBook();
  };
  
  // Handle Library button click - use the callback passed from parent
  const handleLibraryButtonClick = () => {
    if (onLibraryButtonClick) {
      onLibraryButtonClick();
    }
  };
  
  // Handle language selection
  const handleLanguageChange = async (language) => {
    if (language && language.language) {
      // Use the language code for API calls but display the friendly name
      await ListeningSpeed.saveStudyLanguage(language.language);
      setStudyLanguage(language.language);
      setDisplayLanguage(language.name);
      handleClearContent(); // Clear content when language changes
    }
  };
  
  // Handle iOS language selection
  const handleIosLanguageSelect = (language) => {
    setTempSelectedLanguage(language);
  };
  
  // Handle iOS book selection
  const handleIosBookSelect = (book) => {
    setTempSelectedBook(book);
  };
  
  // Apply iOS language selection
  const applyIosLanguageSelection = () => {
    if (tempSelectedLanguage) {
      handleLanguageChange(tempSelectedLanguage);
    }
    setShowIosLanguageModal(false);
    setSearchText('');
  };
  
  // Apply iOS book selection
  const applyIosBookSelection = () => {
    if (tempSelectedBook) {
      handleBookChange(tempSelectedBook.id);
    }
    setShowIosBookModal(false);
    setSearchText('');
  };
  
  // Handle book selection with more robustness for Android
  const handleBookChange = (itemValue) => {
    setSelectedBook(itemValue);
    handleClearContent(); // Clear content when book selection changes
    if (itemValue) {
      const book = books.find(b => b.id === itemValue);
      if (book) {
        setDisplayBookTitle(getBookTitle(book));
      }
    }
  };

  // Render language selection component
  const renderLanguagePicker = () => {
    // iOS needs special handling
    if (Platform.OS === 'ios') {
      return (
        <IosPickers.IosSelectorButton
          value={displayLanguage}
          placeholder={uiText.enterLanguage || "Select language"}
          onPress={() => {
            if (!loadingBook) {
              setShowIosLanguageModal(true);
              setSearchText('');
              setTempSelectedLanguage(null);
              
              // Find the current language in our list to pre-select
              if (studyLanguage) {
                const currentLang = languages.find(l => l.language === studyLanguage);
                if (currentLang) {
                  setTempSelectedLanguage(currentLang);
                }
              }
            }
          }}
          disabled={loadingBook}
        />
      );
    }
    
    // Android uses its own modal approach
    if (Platform.OS === 'android') {
      return (
        <TouchableOpacity
          style={styles.studyLangInput}
          onPress={() => {
            if (!loadingBook) {
              setShowLanguageModal(true);
            }
          }}
          disabled={loadingBook}
        >
          <Text style={studyLanguage ? { color: '#000' } : { color: '#999' }}>
            {displayLanguage}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // For Web, use the standard Picker styled like a text input with ID for gamepad
    return (
      <View style={[styles.studyLangInput, { paddingHorizontal: 0, overflow: 'hidden' }]}>
        <Picker
          id="study-language-picker"
          selectedValue={studyLanguage}
          style={{ width: '100%', height: 40, marginTop: Platform.OS === 'ios' ? -6 : 0 }}
          onValueChange={(itemValue, itemIndex) => {
            if (itemValue && itemIndex > 0) { // Skip the prompt item
              const language = languages.find(l => l.language === itemValue);
              if (language) {
                handleLanguageChange(language);
              }
            }
          }}
          enabled={!loadingBook}
        >
          <Picker.Item key="prompt" label={uiText.enterLanguage || "Select language"} value="" />
          {languages.map(lang => (
            <Picker.Item 
              key={lang.language} 
              label={lang.name} 
              value={lang.language} 
            />
          ))}
        </Picker>
      </View>
    );
  };

  // This function handles showing the Picker differently based on platform
  const renderBookPicker = () => {
    // iOS needs special handling
    if (Platform.OS === 'ios') {
      return (
        <IosPickers.IosSelectorButton
          value={displayBookTitle}
          placeholder={uiText.enterBook || "Select a book"}
          onPress={() => {
            if (!loadingBook) {
              setShowIosBookModal(true);
              setSearchText('');
              setTempSelectedBook(null);
              setFilteredBooks(books);
              
              // Find the current book to pre-select
              if (selectedBook) {
                const currentBook = books.find(b => b.id === selectedBook);
                if (currentBook) {
                  setTempSelectedBook(currentBook);
                }
              }
            }
          }}
          disabled={loadingBook}
        />
      );
    }
    
    // Android uses its own modal approach
    if (Platform.OS === 'android') {
      return (
        <TouchableOpacity
          style={styles.androidPickerButton}
          onPress={() => {
            if (!loadingBook) {
              setShowBookModal(true);
            }
          }}
          disabled={loadingBook}
        >
          <Text style={selectedBook ? styles.androidPickerButtonTextSelected : styles.androidPickerButtonText}>
            {displayBookTitle}
          </Text>
          <Text style={styles.androidPickerIcon}>▼</Text>
        </TouchableOpacity>
      );
    }
    
    // For Web, use the standard Picker with ID for gamepad
    return (
      <View style={styles.pickerContainer}>
        <Picker
          id="book-picker"
          selectedValue={selectedBook}
          style={styles.bookPicker}
          onValueChange={handleBookChange}
          enabled={!loadingBook}
        >
          <Picker.Item key="prompt" label={uiText.enterBook || "Select a book"} value="" />
          {books.map(book => (
            <Picker.Item 
              key={book.id} 
              label={getBookTitle(book)} 
              value={book.id} 
            />
          ))}
        </Picker>
      </View>
    );
  };

  // Define the header style based on platform and font loading
  const getHeaderTextStyle = () => {
    if (Platform.OS === 'android') {
      // Android needs explicit style parameters
      if (fontsLoaded) {
        return {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
          fontFamily: 'Cinzel-ExtraBold', // Try the ExtraBold version for Android
        };
      } else {
        return {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
        };
      }
    } else if (Platform.OS === 'ios') {
      // iOS may need different font handling
      return fontsLoaded ? 
        {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
          fontFamily: 'Cinzel',
        } : 
        styles.header;
    } else {
      // Web should work fine with the standard approach
      return fontsLoaded ? 
        [styles.header, {fontFamily: 'Cinzel'}] : 
        styles.header;
    }
  };

  return (
    <>
      {/* Skip the header if skipHeader is true (rendered by parent instead) */}
      {!skipHeader && (
        <View style={styles.headerContainer}>
          <Image 
            source={require('./assets/aoede_logo.png')} 
            style={styles.headerLogo} 
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={getHeaderTextStyle()}>
              Aoede
            </Text>
            <Text style={styles.headerPronunciation}>(ay-EE-dee)</Text>
          </View>
        </View>
      )}

      {/* Input container is always visible */}
      <View style={styles.inputContainer}>
        {/* Study Language Row with Dropdown - Full width */}
        <View style={styles.studyLangRow}>
          <Text style={styles.studyLangLabel}>{uiText.studyLanguage || "Study Language"}:</Text>
          {renderLanguagePicker()}
        </View>
        
        {/* Two-column table layout */}
        <View style={styles.twoColumnTable}>
          {/* Left column: Reading Level and Source Material */}
          <View style={styles.leftColumn}>
            <View style={styles.readingLevelRow}>
              <Text style={styles.readingLevelLabel}>{uiText.readingLevel || "Reading Level"}:</Text>
              <View style={styles.readingLevelControls}>
                {[6, 9, 12, 15, 18].map((level) => (
                  <TouchableOpacity
                    key={level}
                    id={`reading-level-${level}`}
                    style={[
                      enhancedReadingLevelButtonStyle,
                      readingLevel === level ? enhancedReadingLevelButtonActiveStyle : null
                    ]}
                    onPress={() => {
                      setReadingLevel(level);
                      handleClearContent(); // Clear content when reading level changes
                    }}
                  >
                    <Text 
                      style={[
                        styles.readingLevelButtonText,
                        readingLevel === level ? enhancedReadingLevelButtonTextActiveStyle : null
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Source Material */}
            <View style={styles.sourceRow}>
              <Text style={styles.studyLangLabel}>{uiText.sourceMaterial || "Source Material"}:</Text>
              {renderBookPicker()}
            </View>
          </View>
          
          {/* Right column: Library and Load Book buttons */}
          <View style={styles.rightColumn}>
            {/* Library Button - Enhanced with 3D effect */}
            <TouchableOpacity 
              id="library-button"
              style={[
                enhancedLibraryButtonStyle, 
                loadingBook ? styles.disabledButton : null
              ]} 
              onPress={handleLibraryButtonClick} 
              disabled={loadingBook}
            >
              <Text style={enhancedButtonTextStyle}>{uiText.library || "Library"}</Text>
            </TouchableOpacity>
            
            {/* Load Book Button - Enhanced with 3D effect */}
            <TouchableOpacity 
              id="load-book-button"
              style={[
                enhancedLoadButtonStyle, 
                loadingBook ? styles.disabledButton : null, 
                !selectedBook ? styles.disabledButton : null
              ]} 
              onPress={handleLoadButtonClick} 
              disabled={loadingBook || !selectedBook}
            >
              {loadingBook ? (
                <View style={styles.nextButtonContent}>
                  <ActivityIndicator size="small" color="#ffffff" style={styles.buttonSpinner} />
                  <Text style={[enhancedButtonTextStyle, styles.buttonTextWithSpinner]}>
                    {uiText.loadBook || "Load Book"}
                  </Text>
                </View>
              ) : (
                <Text style={enhancedButtonTextStyle}>{uiText.loadBook || "Load Book"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Language Selection Modal for Android */}
        {Platform.OS === 'android' && (
          <Modal
            visible={showLanguageModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowLanguageModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>{uiText.studyLanguage || "Study Language"}</Text>
                
                <FlatList
                  data={languages}
                  keyExtractor={item => item.language}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.bookItem}
                      onPress={() => {
                        handleLanguageChange(item);
                        setShowLanguageModal(false);
                      }}
                    >
                      <Text style={styles.bookItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowLanguageModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        )}
        
        {/* Book Selection Modal */}
        {Platform.OS === 'android' && (
          <Modal
            visible={showBookModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowBookModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>{uiText.bookSelection || "Book Selection"}</Text>
                
                <FlatList
                  data={[{id: 'prompt', title: uiText.enterBook || "Select a book"}, ...books]}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.bookItem}
                      onPress={() => {
                        handleBookChange(item.id === 'prompt' ? "" : item.id);
                        setShowBookModal(false);
                      }}
                    >
                      <Text style={styles.bookItemText}>
                        {item.id === 'prompt' ? item.title : getBookTitle(item)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowBookModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        )}
        
        {/* iOS Language Selection Modal */}
        {Platform.OS === 'ios' && (
          <IosPickers.IosLanguagePicker
            visible={showIosLanguageModal}
            onCancel={() => {
              setShowIosLanguageModal(false);
              setSearchText('');
            }}
            onDone={applyIosLanguageSelection}
            languages={filteredLanguages}
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedLanguage={tempSelectedLanguage}
            onSelectLanguage={handleIosLanguageSelect}
            uiText={uiText}
          />
        )}
        
        {/* iOS Book Selection Modal */}
        {Platform.OS === 'ios' && (
          <IosPickers.IosBookPicker
            visible={showIosBookModal}
            onCancel={() => {
              setShowIosBookModal(false);
              setSearchText('');
            }}
            onDone={applyIosBookSelection}
            books={filteredBooks}
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedBook={tempSelectedBook}
            onSelectBook={handleIosBookSelect}
            getBookTitle={getBookTitle}
            uiText={uiText}
          />
        )}
        
        {/* Smart gamepad indicator - only shows when gamepad is connected */}
        <GamepadIndicator />
      </View>
    </>
  );
}

export default HomeUI;