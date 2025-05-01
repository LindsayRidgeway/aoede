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
import DebugPanel, { debugLog } from './DebugPanel';

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

// Get Google API key from Expo Constants
const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');

// Direct translation method using Google Translate
const directTranslate = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;
  
  try {
	if (__DEV__) console.log("FETCH 0001");
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
  debugLog('App initialized');

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
        debugLog('App: Starting initialization');
        debugLog('App: User library initialized');
        debugLog(`App: Device language detected: ${deviceLang}`);
