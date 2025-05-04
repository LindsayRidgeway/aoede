// App.js - Main application component that manages global state and UI rendering for Aoede language learning app
import React, { useState, useEffect } from 'react';
import { Alert, Platform, NativeModules } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BookReader from './bookReader';
import { bookSources } from './bookSources';
import Constants from 'expo-constants';
import { initializeUserLibrary, getUserLibrary, getBookById } from './userLibrary';
import DebugPanel from './DebugPanel';

// Get API key using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
  if (__DEV__) console.log("MODULE 0002: App.js.getConstantValue");
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants?.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

/*
// Direct translation method using Google Translate
export const directTranslate = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');
  
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text"
        })
      }
    );
    
    const data = await response.json();
    
    if (data.data?.translations?.length > 0) {
      return data.data.translations[0].translatedText;
    }
    
    return text;
  } catch (error) {
    return text;
  }
};
*/

// Direct translation method using GPT-4o
export const directTranslate = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  const OPENAI_API_KEY = getConstantValue('OPENAI_API_KEY');
  const API_URL = 'https://api.openai.com/v1/chat/completions';
  const TRANSLATION_PROMPT = `Translate the input sentence from ${sourceLang} to ${targetLang}. Return only the translated sentence, with no comments or other output. Input: ${text}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: TRANSLATION_PROMPT
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return text;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return text;
    }

    return data.choices[0].message.content;
  } catch (error) {
    return text;
  }
}

// Get the user's preferred locale/language using multiple methods for better reliability
const getDeviceLanguage = async () => {
  try {
    // Try to get device language from React Native's NativeModules
    if (Platform.OS !== 'web') {
      // iOS
      if (Platform.OS === 'ios' && NativeModules.SettingsManager?.settings?.AppleLocale) {
        const deviceLocale = NativeModules.SettingsManager.settings.AppleLocale;
        const langCode = deviceLocale.split('_')[0];
        return langCode;
      }
      
      // Android
      if (Platform.OS === 'android' && NativeModules.I18nManager) {
        const isRTL = NativeModules.I18nManager.isRTL;
        const localeIdentifier = NativeModules.I18nManager.localeIdentifier;
        
        if (localeIdentifier) {
          const langCode = localeIdentifier.split('_')[0];
          return langCode;
        }
      }
    }
    
    // For Web, use navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const navLang = navigator.language.split('-')[0];
      return navLang;
    }
  } catch (error) {
  }
  
  // Default fallback
  return 'en';
};

export default function App() {
  if (__DEV__) console.log("MODULE 0003: App.js.App");

  // Get the reader manager interface
//  const readingManager = BookReader.previousReadingManagement();
  const readingManager = BookReader.readingManagement();

  // Basic UI text in English
  const defaultUiText = {
    addBook: "Add Book",
    articulation: "Articulation",
    autoplay: "Next Sentence Auto-play",
    bookAdded: "Book added to library",
    bookDetails: "Book Details",
    bookSelection: "Book Selection",
    cancel: "Cancel",
    cannotOpenURL: "Cannot open URL",
    confirmDelete: "Are you sure you want to delete",
    continue: "Continue",
    deleteBook: "Delete",
    editBook: "Edit Book",
    emptyLibrary: "Your library is empty.",
    endOfBook: "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.",
    enterBook: "Select a book",
    enterLanguage: "Select language",
    enterSearchQuery: "Please enter a search query",
    error: "Error",
    errorAddingBook: "Error adding book",
    errorDeletingBook: "Error deleting book",
    exit: "Exit",
    fromLibrary: "from your library",
    library: "Library",
    libraryComingSoon: "Library management features are coming soon.",
    listen: "Listen",
    loadBook: "Load Book",
    loading: "Loading...",
    myLibrary: "My Library",
    next: "Next Sentence",
    readingLevel: "Reading Level",
    readingSpeed: "Reading Speed",
    rewindConfirmMessage: "Are you sure you want to rewind the book to the beginning?",
    rewindConfirmTitle: "Rewind Book",
    rewindFailed: "Failed to rewind the book.",
    search: "Search",
    searchBooks: "Search Books",
    searchError: "Search error",
    searchPlaceholder: "Search Project Gutenberg by title, author, or subject",
    searching: "Searching...",
    showText: "Show Foreign Sentence",
    showTranslation: "Show Translation",
    sourceMaterial: "Source Material",
    stop: "Stop",
    stopSearch: "Stop",
    studyLanguage: "Study Language",
    success: "Success",
    yes: "Yes"
  };
  
  const [uiText, setUiText] = useState(defaultUiText);
  const [selectedBook, setSelectedBook] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); 
  const [nativeLangSentence, setNativeLangSentence] = useState(""); 
  const [showText, setShowText] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [articulation, setArticulation] = useState(false); // Articulation feature
  const [autoplay, setAutoplay] = useState(false); // Auto-play feature
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(3); // Default to middle speed (3)
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState(6);
  const [isAtEndOfBook, setIsAtEndOfBook] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0); // For library refresh
  const [showLibrary, setShowLibrary] = useState(false); // For library modal
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize the user's library first
        await initializeUserLibrary();
        
        // Get device language
        const deviceLang = await getDeviceLanguage();
        if (deviceLang && deviceLang !== 'en') {
          await translateUiToLanguage(deviceLang);
        }
        
        // Load stored settings
        try {
          const storedSelectedBook = await AsyncStorage.getItem("selectedBook");
          const storedSpeechRate = await AsyncStorage.getItem("speechRate");
          const storedReadingLevel = await AsyncStorage.getItem("readingLevel");
          const storedShowText = await AsyncStorage.getItem("showText");
          const storedShowTranslation = await AsyncStorage.getItem("showTranslation");
          const storedArticulation = await AsyncStorage.getItem("articulation");
          const storedAutoplay = await AsyncStorage.getItem("autoplay");
          const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
          
          if (storedSelectedBook !== null) {
            setSelectedBook(storedSelectedBook);
          }
          
          if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
          }
          
          if (storedReadingLevel !== null) {
            setReadingLevel(parseInt(storedReadingLevel, 10));
          }
          
          if (storedShowText !== null) {
            setShowText(storedShowText === 'true');
          }
          
          if (storedShowTranslation !== null) {
            setShowTranslation(storedShowTranslation === 'true');
          }
          
          if (storedArticulation !== null) {
            setArticulation(storedArticulation === 'true');
          }
          
          if (storedAutoplay !== null) {
            setAutoplay(storedAutoplay === 'true');
          }
          
          if (storedListeningSpeed !== null) {
            const speed = parseInt(storedListeningSpeed, 10);
            // Ensure it's a valid value (1-5)
            if (speed >= 1 && speed <= 5) {
              setListeningSpeed(speed);
              
              // Also update ListeningSpeed module's internal state
              await ListeningSpeed.saveListeningSpeed(speed);
            }
          } else {
            // Initialize with default value of 3 (medium speed)
            await ListeningSpeed.saveListeningSpeed(3);
          }
        } catch (error) {
          // Silent error handling
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        
        // Initialize BookReader
        BookReader.initialize(handleSentenceProcessed, deviceLang || 'en');
      } catch (error) {
        // Silent error handling
      }
    };
    
    initialize();
  }, []);
  
  // Translate UI to specified language
  const translateUiToLanguage = async (targetLang) => {
    if (!targetLang || targetLang === 'en') return;
    
    try {
      // Translate basic UI elements
      const translatedElements = {};
      for (const [key, value] of Object.entries(defaultUiText)) {
        try {
          const translated = await directTranslate(value, 'en', targetLang);
          translatedElements[key] = translated;
        } catch (error) {
          translatedElements[key] = value;
        }
      }
      
      // Translate book titles
      const translatedBooks = {};
      
      // Get books from user library instead of bookSources
      const userLibrary = await getUserLibrary();
      
      for (const book of userLibrary) {
        try {
          const translatedTitle = await directTranslate(book.title, 'en', targetLang);
          translatedBooks[book.id] = translatedTitle;
        } catch (error) {
          translatedBooks[book.id] = book.title;
        }
      }
      
      // Set translated text
      setUiText({...translatedElements, ...translatedBooks});
    } catch (error) {
    }
  };
  
  // Function to refresh the library
  const refreshLibrary = () => {
    setLibraryRefreshKey(prev => prev + 1);
  };
  
  // Callback for when BookReader processes a sentence
  const handleSentenceProcessed = (sentence, translation) => {
    if (__DEV__) console.log("MODULE 0004: App.js.handleSentenceProcessed");
    if (!sentence) {
      setStudyLangSentence("");
      setNativeLangSentence("");
      return;
    }
    
    // Set the study language sentence (simplified in the study language)
    setStudyLangSentence(sentence);
    
    // Set the translated sentence (translation to user's language)
    setNativeLangSentence(translation || sentence);
    
    // Update progress indicators
    const progress = readingManager.getProgress();
    setCurrentSentenceIndex(progress.currentSentenceIndex);
    setTotalSentences(progress.totalSentencesInMemory);
    setIsAtEndOfBook(!progress.hasMoreContent && progress.currentSentenceIndex === progress.totalSentencesInMemory - 1);
  };
  
  // Handle speak button click
  const handleToggleSpeak = () => {
    if (__DEV__) console.log("MODULE 0005: App.js.handleToggleSpeak");
    if (isSpeaking) {
      ListeningSpeed.stopSpeaking();
      setIsSpeaking(false);
    } else {
      ListeningSpeed.speakSentenceWithPauses(
        studyLangSentence, 
        listeningSpeed, 
        () => {
          setIsSpeaking(false);
        }, 
        articulation
      );
      setIsSpeaking(true);
    }
  };
  
  // Clear content area
  const clearContent = () => {
    if (__DEV__) console.log("MODULE 0006: App.js.clearContent");
    setStudyLangSentence("");
    setNativeLangSentence("");
    setCurrentSentenceIndex(0);
    setTotalSentences(0);
    setIsAtEndOfBook(false);
    readingManager.reset();
  };
  
  // Handle next sentence button click
  const handleNextSentence = async () => {
    try {
//      setLoadingBook(true);
      // Use the new encapsulated function
      await readingManager.advanceToNextSentence();
    } catch (error) {
      setStudyLangSentence("Error: " + error.message);
    } finally {
      // Loading is complete
//      setLoadingBook(false);

      // Check if autoplay should be triggered
      if (autoplay && !isSpeaking) {
        // Speak the current sentence
        ListeningSpeed.speakSentenceWithPauses(
          studyLangSentence, 
          listeningSpeed, 
          () => {
            setIsSpeaking(false);
          }, 
          articulation
        );
        setIsSpeaking(true);
      }
    }
  };
  
  // Handle book selection change
  const handleBookChange = async (bookId) => {
    setSelectedBook(bookId);
    try {
      await AsyncStorage.setItem("selectedBook", bookId);
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle reading level change
  const handleReadingLevelChange = async (level) => {
    setReadingLevel(level);
    BookReader.setReadingLevel(level);
    try {
      await AsyncStorage.setItem("readingLevel", level.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle show text toggle change
  const handleShowTextChange = async (value) => {
    setShowText(value);
    try {
      await AsyncStorage.setItem("showText", value.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle show translation toggle change
  const handleShowTranslationChange = async (value) => {
    setShowTranslation(value);
    try {
      await AsyncStorage.setItem("showTranslation", value.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle articulation toggle change
  const handleArticulationChange = async (value) => {
    setArticulation(value);
    try {
      await AsyncStorage.setItem("articulation", value.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle autoplay toggle change
  const handleAutoplayChange = async (value) => {
    setAutoplay(value);
    try {
      await AsyncStorage.setItem("autoplay", value.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle listening speed change
  const handleListeningSpeedChange = async (speed) => {
    setListeningSpeed(speed);
    try {
      await AsyncStorage.setItem("listeningSpeed", speed.toString());
      await ListeningSpeed.saveListeningSpeed(speed);
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle rewind book functionality
  const handleRewindBook = async () => {
    // Prevent rewind during loading operations
    if (loadingBook) {
      return false;
    }
    
    try {
      // Show loading state
      setLoadingBook(true);
      
      // Use the new encapsulated function to handle rewinding
      const success = await readingManager.rewindBook();
      
      return success;
    } catch (error) {
      // Show error message appropriate for the platform
      if (Platform.OS === 'web') {
        alert(uiText.rewindFailed || "Failed to rewind the book.");
      } else {
        Alert.alert(
          uiText.error || "Error",
          uiText.rewindFailed || "Failed to rewind the book."
        );
      }
      return false;
    } finally {
      // Ensure loading state is cleared
      setLoadingBook(false);
    }
  };
  
  // Handle showing the library modal
  const handleLibraryButtonClick = () => {
    setShowLibrary(true);
  };
  
  // Handle closing the library modal
  const handleCloseLibrary = (libraryChanged) => {
    setShowLibrary(false);
    
    if (libraryChanged) {
      setLibraryRefreshKey(prev => prev + 1);
    }
  };
  
  // Handle load book button click
  const handleLoadBook = async () => {
    // Reset previous state
    clearContent();
    setIsAtEndOfBook(false);
    
    // Get the selected book
    const bookId = selectedBook;
    
    if (!bookId) {
      let message = "Please select a book from the dropdown.";
      if (Platform.OS === 'web') {
        alert("Selection Required: " + message);
      } else {
        Alert.alert("Selection Required", message);
      }
      return false;
    }
    
    if (!studyLanguage) {
      if (Platform.OS === 'web') {
        alert("Language Required: Please select a study language.");
      } else {
        Alert.alert("Language Required", "Please select a study language.");
      }
      return false;
    }
    
    setLoadingBook(true);
    
    try {
      // Get book details from user library
      const book = await getBookById(bookId);
      
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      // Set source language from book language
      setSourceLanguage(book.language);
      
      // Load the book using the new encapsulated function
      const success = await readingManager.loadBook(studyLanguage, bookId);
      
      if (!success) {
        throw new Error("Failed to load book");
      }
      
      return true;
    } catch (error) {
      setStudyLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      setNativeLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      return false;
    } finally {
      setLoadingBook(false);
    }
  };
  
  return (
    <MainUI
      uiText={uiText}
      selectedBook={selectedBook}
      setSelectedBook={handleBookChange}
      loadBook={handleLoadBook}
      rewindBook={handleRewindBook}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={handleShowTextChange}
      setShowTranslation={handleShowTranslationChange}
      articulation={articulation}
      setArticulation={handleArticulationChange}
      autoplay={autoplay}
      setAutoplay={handleAutoplayChange}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={handleToggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={handleListeningSpeedChange}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={totalSentences}
      readingLevel={readingLevel}
      setReadingLevel={handleReadingLevelChange}
      isAtEndOfBook={isAtEndOfBook}
      handleClearContent={clearContent}
      libraryRefreshKey={libraryRefreshKey}
      refreshLibrary={refreshLibrary}
      showLibrary={showLibrary}
      onLibraryButtonClick={handleLibraryButtonClick}
      onCloseLibrary={handleCloseLibrary}
    />
  );
}