import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BookReader from './bookReader';
import { bookSources } from './bookSources';
import Constants from 'expo-constants';

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
  if (Constants?.extra && Constants.extra[key] !== undefined) {
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

export default function App() {
  // Get the user's language from browser or device
  const userLanguage = (typeof navigator !== 'undefined' && navigator.language) 
    ? navigator.language.split('-')[0] 
    : "en";
  
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
    enterLanguage: "Enter study language",
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
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState(6);
  const [isAtEndOfBook, setIsAtEndOfBook] = useState(false);
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Translate UI if not English
        if (userLanguage !== 'en') {
          translateUiElements();
        }
        
        // Load stored settings
        try {
          const storedSelectedBook = await AsyncStorage.getItem("selectedBook");
          const storedSpeechRate = await AsyncStorage.getItem("speechRate");
          const storedReadingLevel = await AsyncStorage.getItem("readingLevel");
          
          if (storedSelectedBook !== null) {
            setSelectedBook(storedSelectedBook);
          }
          
          if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
          }
          
          if (storedReadingLevel !== null) {
            setReadingLevel(parseInt(storedReadingLevel, 10));
          }
        } catch (error) {
          // Silent error handling
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        await ListeningSpeed.detectLanguageCode(language);
        
        // Initialize BookReader
        BookReader.initialize(handleSentenceProcessed, userLanguage);
      } catch (error) {
        // Silent error handling
      }
    };
    
    initialize();
  }, []);
  
  // Direct translation of UI elements
  const translateUiElements = async () => {
    if (userLanguage === 'en') return;
    
    try {
      // Translate basic UI elements
      const translatedElements = {};
      for (const [key, value] of Object.entries(defaultUiText)) {
        try {
          const translated = await directTranslate(value, 'en', userLanguage);
          translatedElements[key] = translated;
        } catch (error) {
          translatedElements[key] = value;
        }
      }
      
      // Translate book titles
      const translatedBooks = {};
      for (const book of bookSources) {
        try {
          const translatedTitle = await directTranslate(book.title, 'en', userLanguage);
          translatedBooks[book.id] = translatedTitle;
        } catch (error) {
          translatedBooks[book.id] = book.title;
        }
      }
      
      // Set translated text
      setUiText({...translatedElements, ...translatedBooks});
      
    } catch (error) {
      // Silent error handling
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
        alert("Language Required: Please enter a study language.");
      } else {
        Alert.alert("Language Required", "Please enter a study language.");
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
      
      // Set source language from study language
      setSourceLanguage(detectLanguageCode(studyLanguage));
      
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
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={handleToggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={totalSentences}
      readingLevel={readingLevel}
      setReadingLevel={handleReadingLevelChange}
      isAtEndOfBook={isAtEndOfBook}
    />
  );
}