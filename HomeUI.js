// HomeUI.js - Web Only version
import React, { useState, useEffect } from 'react';
import { 
  Text, View, TouchableOpacity, Image, 
  ActivityIndicator
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
  // State for displayed book title
  const [displayBookTitle, setDisplayBookTitle] = useState("");
  
  // State for languages
  const [languages, setLanguages] = useState([]);
  const [displayLanguage, setDisplayLanguage] = useState(studyLanguage || uiText.enterLanguage || "Select language");
  
  // State for the user's book library
  const [books, setBooks] = useState([]);
  
  // Initialize gamepad support for web
  useEffect(() => {
    // Initialize gamepad support
    gamepadManager.init();
  }, []);
  
  // Enhanced Library button with 3D metallic burgundy style
  const enhancedLibraryButtonStyle = {
    ...styles.libraryButton,
    backgroundImage: 'linear-gradient(180deg, #a00030 0%, #800020 50%, #600010 100%)',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
    border: '1px solid #600010',
  };

  // Enhanced Load Book button with 3D metallic blue style
  const enhancedLoadButtonStyle = {
    ...styles.loadButton,
    backgroundImage: 'linear-gradient(180deg, #4a8ab5 0%, #3a7ca5 50%, #2a6c95 100%)',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
    border: '1px solid #2a6c95',
  };

  // Enhanced button text style with subtle text shadow
  const enhancedButtonTextStyle = {
    ...styles.buttonText,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  };
  
  // Enhanced reading level button style - raised appearance
  const enhancedReadingLevelButtonStyle = {
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
  };

  // Enhanced active reading level button - pressed appearance
  const enhancedReadingLevelButtonActiveStyle = {
    backgroundColor: '#3a7ca5',
    backgroundImage: 'linear-gradient(180deg, #3a7ca5 0%, #2a6c95 100%)',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2), inset 0px 1px 1px rgba(0, 0, 0, 0.3)',
    transform: 'translateY(1px)',
    border: '1px solid #1a5c85',
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
        }
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };
    
    loadLanguages();
  }, []);
  
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
  
  // Handle book selection
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

  // Render language selection component for web
  const renderLanguagePicker = () => {
    return (
      <View style={[styles.studyLangInput, { paddingHorizontal: 0, overflow: 'hidden' }]}>
        <Picker
          id="study-language-picker"
          selectedValue={studyLanguage}
          style={{ width: '100%', height: 40 }}
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

  // Render book picker for web
  const renderBookPicker = () => {
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

  // Define the header style based on font loading
  const getHeaderTextStyle = () => {
    // Web should work fine with the standard approach
    return fontsLoaded ? 
      [styles.header, {fontFamily: 'Cinzel'}] : 
      styles.header;
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
        
        {/* Contact Developer Section */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactText}>
            To contact developer:{' '}
            <Text 
              style={styles.contactLink}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.open('mailto:aoede.pro@gmail.com', '_self');
                }
              }}
            >
              aoede.pro@gmail.com
            </Text>
          </Text>
        </View>
        
        {/* Smart gamepad indicator - only shows when gamepad is connected */}
        <GamepadIndicator />
      </View>
    </>
  );
}

export default HomeUI;