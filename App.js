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

// Debug flag - set to false to disable debug logging
const DEBUG = false;

// Debug logging helper
const log = (message) => {
  if (DEBUG) {
    console.log(`[App] ${message}`);
  }
};

// Get API key using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
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

// Get Google API key from Expo Constants
const GOOGLE_API_KEY = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');

// Direct translation method using Google Translate
const directTranslate = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;
  
  try {
    // Convert language names to codes if needed
    const sourceCode = detectLanguageCode(sourceLang);
    const targetCode = detectLanguageCode(targetLang);
    
    log(`Direct translate from ${sourceCode} to ${targetCode}`);
    
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceCode,
          target: targetCode,
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
    log(`Error in directTranslate: ${error.message}`);
    return text;
  }
};

// Get the user's preferred locale/language using multiple methods for better reliability
const getDeviceLanguage = async () => {
  try {
    // First try reading from AsyncStorage (user's previous selection)
    try {
      const storedLang = await AsyncStorage.getItem('userLanguage');
      if (storedLang) {
        log(`Using stored language preference: ${storedLang}`);
        return storedLang;
      }
    } catch (error) {
      log(`Error reading stored language: ${error.message}`);
    }
    
    // Try to get device language from React Native's NativeModules
    if (Platform.OS !== 'web') {
      // iOS
      if (Platform.OS === 'ios' && NativeModules.SettingsManager?.settings?.AppleLocale) {
        const deviceLocale = NativeModules.SettingsManager.settings.AppleLocale;
        const langCode = deviceLocale.split('_')[0];
        log(`Detected iOS device locale: ${langCode}`);
        return langCode;
      }
      
      // Android
      if (Platform.OS === 'android' && NativeModules.I18nManager) {
        const isRTL = NativeModules.I18nManager.isRTL;
        const localeIdentifier = NativeModules.I18nManager.localeIdentifier;
        
        if (localeIdentifier) {
          const langCode = localeIdentifier.split('_')[0];
          log(`Detected Android device locale: ${langCode} (RTL: ${isRTL})`);
          return langCode;
        }
      }
    }
    
    // For Web, use navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const navLang = navigator.language.split('-')[0];
      log(`Using navigator language: ${navLang}`);
      return navLang;
    }
    
    // Log the fallback to English
    log('No language detected, falling back to English');
  } catch (error) {
    log(`Error detecting language: ${error.message}`);
  }
  
  // Default fallback
  return 'en';
};

export default function App() {
  // Basic UI text in English
  const defaultUiText = {
    appName: "Aoede",
    sourceMaterial: "Source Material",
    enterBook: "Select a book",
    listen: "Listen",
    stop: "Stop",
    next: "Next Sentence",
    loadBook: "Load Book",
    showText: "Show Foreign Sentence",
    showTranslation: "Show Translation",
    readingSpeed: "Reading Speed",
    studyLanguage: "Study Language",
    enterLanguage: "Select language",
    bookSelection: "Book Selection",
    readingLevel: "Reading Level",
    pleaseWait: "Please wait. This may take several minutes...",
    endOfBook: "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.",
    continue: "Continue",
    rewindConfirmTitle: "Rewind Book",
    rewindConfirmMessage: "Are you sure you want to rewind the book to the beginning?",
    cancel: "Cancel",
    yes: "Yes",
    error: "Error",
    rewindFailed: "Failed to rewind the book."
  };
  
  const [uiText, setUiText] = useState(defaultUiText);
  const [selectedBook, setSelectedBook] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); 
  const [nativeLangSentence, setNativeLangSentence] = useState(""); 
  const [showText, setShowText] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
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
  const [appLanguage, setAppLanguage] = useState('en'); // Default to English until we load
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get device language
        const deviceLang = await getDeviceLanguage();
        setAppLanguage(deviceLang);
        
        // Store detected language for future use
        if (deviceLang && deviceLang !== 'en') {
          try {
            await AsyncStorage.setItem('userLanguage', deviceLang);
            log(`Stored user language: ${deviceLang}`);
          } catch (error) {
            log(`Error storing user language: ${error.message}`);
          }
          
          // Translate UI elements to the detected language
          log(`Translating UI to ${deviceLang}`);
          await translateUiToLanguage(deviceLang);
        }
        
        // Load stored settings
        try {
          const storedSelectedBook = await AsyncStorage.getItem("selectedBook");
          const storedSpeechRate = await AsyncStorage.getItem("speechRate");
          const storedReadingLevel = await AsyncStorage.getItem("readingLevel");
          const storedShowText = await AsyncStorage.getItem("showText");
          const storedShowTranslation = await AsyncStorage.getItem("showTranslation");
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
          
          log(`Loaded settings: readingLevel=${storedReadingLevel}, showText=${storedShowText}, showTranslation=${storedShowTranslation}, listeningSpeed=${storedListeningSpeed}`);
        } catch (error) {
          // Silent error handling
          log(`Error loading stored settings: ${error.message}`);
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        
        // Initialize BookReader
        BookReader.initialize(handleSentenceProcessed, deviceLang || 'en');
      } catch (error) {
        // Silent error handling
        log(`Error during initialization: ${error.message}`);
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
          log(`Error translating UI element '${key}': ${error.message}`);
        }
      }
      
      // Translate book titles
      const translatedBooks = {};
      for (const book of bookSources) {
        try {
          const translatedTitle = await directTranslate(book.title, 'en', targetLang);
          translatedBooks[book.id] = translatedTitle;
        } catch (error) {
          translatedBooks[book.id] = book.title;
          log(`Error translating book title '${book.title}': ${error.message}`);
        }
      }
      
      // Set translated text
      setUiText({...translatedElements, ...translatedBooks});
      
    } catch (error) {
      // Silent error handling
      log(`Error in translateUiToLanguage: ${error.message}`);
    }
  };
  
  // Callback for when BookReader processes a sentence
  const handleSentenceProcessed = (sentence, translation) => {
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
    const progress = BookReader.getProgress();
    setCurrentSentenceIndex(progress.currentSentenceIndex);
    setTotalSentences(progress.totalSentencesInMemory);
    setIsAtEndOfBook(!progress.hasMoreContent && progress.currentSentenceIndex === progress.totalSentencesInMemory - 1);
  };
  
  // Handle speak button click
  const handleToggleSpeak = () => {
    if (isSpeaking) {
      ListeningSpeed.stopSpeaking();
      setIsSpeaking(false);
    } else {
      ListeningSpeed.speakSentenceWithPauses(studyLangSentence, listeningSpeed, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };
  
  // Clear content area
  const clearContent = () => {
    setStudyLangSentence("");
    setNativeLangSentence("");
    setCurrentSentenceIndex(0);
    setTotalSentences(0);
    setIsAtEndOfBook(false);
    BookReader.reset();
  };
  
  // Handle next sentence button click
  const handleNextSentence = async () => {
    try {
      setLoadingBook(true);
      await BookReader.handleNextSentence();
    } catch (error) {
      setStudyLangSentence("Error: " + error.message);
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle book selection change
  const handleBookChange = async (bookId) => {
    setSelectedBook(bookId);
    try {
      await AsyncStorage.setItem("selectedBook", bookId);
    } catch (error) {
      // Silent error handling
      log(`Error saving book selection: ${error.message}`);
    }
  };
  
  // Handle reading level change
  const handleReadingLevelChange = async (level) => {
    setReadingLevel(level);
    BookReader.setReadingLevel(level);
    try {
      await AsyncStorage.setItem("readingLevel", level.toString());
      log(`Saved reading level: ${level}`);
    } catch (error) {
      // Silent error handling
      log(`Error saving reading level: ${error.message}`);
    }
  };
  
  // Handle show text toggle change
  const handleShowTextChange = async (value) => {
    setShowText(value);
    try {
      await AsyncStorage.setItem("showText", value.toString());
      log(`Saved showText: ${value}`);
    } catch (error) {
      // Silent error handling
      log(`Error saving show text preference: ${error.message}`);
    }
  };
  
  // Handle show translation toggle change
  const handleShowTranslationChange = async (value) => {
    setShowTranslation(value);
    try {
      await AsyncStorage.setItem("showTranslation", value.toString());
      log(`Saved showTranslation: ${value}`);
    } catch (error) {
      // Silent error handling
      log(`Error saving show translation preference: ${error.message}`);
    }
  };
  
  // Handle listening speed change
  const handleListeningSpeedChange = async (speed) => {
    setListeningSpeed(speed);
    try {
      await AsyncStorage.setItem("listeningSpeed", speed.toString());
      await ListeningSpeed.saveListeningSpeed(speed);
      log(`Saved listening speed: ${speed}`);
    } catch (error) {
      // Silent error handling
      log(`Error saving listening speed: ${error.message}`);
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
      
      // Use BookReader to handle rewinding
      const success = await BookReader.handleRewind();
      
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
  
  // Handle language change for the app
  const handleAppLanguageChange = async (language) => {
    if (language && language !== appLanguage) {
      setAppLanguage(language);
      await translateUiToLanguage(language);
      try {
        await AsyncStorage.setItem('userLanguage', language);
      } catch (error) {
        log(`Error saving app language: ${error.message}`);
      }
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
      // Get book details
      const book = bookSources.find(b => b.id === bookId);
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      // Set source language from book language
      setSourceLanguage(book.language);
      
      // Set reading level in BookReader
      BookReader.setReadingLevel(readingLevel);
      
      // Load the book
      const success = await BookReader.handleLoadBook(studyLanguage, book.title);
      
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
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={handleToggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={handleListeningSpeedChange}  // Use the new handler
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={totalSentences}
      readingLevel={readingLevel}
      setReadingLevel={handleReadingLevelChange}
      isAtEndOfBook={isAtEndOfBook}
      appLanguage={appLanguage}
      setAppLanguage={handleAppLanguageChange}
    />
  );
}