// App.js - Modified to be web-only
import React, { useState, useEffect } from 'react';
import MainUI from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateBatch, apiTranslateSentenceCheap, apiTranslateSentenceFast } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BookReader from './bookReader';
import { bookSources } from './bookSources';
import Constants from 'expo-constants';
import { initializeUserLibrary, getUserLibrary, getBookById } from './userLibrary';
import DebugPanel from './DebugPanel';
import gamepadManager from './gamepadSupport';

// Get the user's preferred locale/language for web
const getDeviceLanguage = async () => {
  try {
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
  const readingManager = BookReader.readingManagement();

  // Basic UI text in English
  const defaultUiText = {
    addBook: "Add Book",
    articulation: "Articulation",
    autoplay: "Sentence Auto-play",
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
    goToEndConfirmMessage: "Go to the end of the book?",
    goToEndConfirmTitle: "End of Book",
    homeLink: "Home",
    library: "Library",
    libraryComingSoon: "Library management features are coming soon.",
    listen: "Listen",
    loadBook: "Load Book",
    loading: "Loading...",
    myLibrary: "My Library",
    next: "Next Sentence",
    position: "Position",
    readingLevel: "Reading Level",
    readingSpeed: "Reading Speed",
    rewindConfirmMessage: "Rewind the book to the beginning?",
    rewindConfirmTitle: "Rewind",
    rewindFailed: "Failed to rewind the book.",
    search: "Search",
    searchBooks: "Search Books",
    searchError: "Search error",
    searchPlaceholder: "Search Project Gutenberg by title, author, or subject",
    searching: "Searching...",
    showText: "Show Sentence",
    showTranslation: "Show Translation",
    sourceMaterial: "Source Material",
    stop: "Stop",
    stopSearch: "Stop",
    studyLanguage: "Study Language",
    success: "Success",
    totalSentences: "Total Sentences",
    yes: "Yes"
  };
  
  const [uiText, setUiText] = useState(defaultUiText);
  const [selectedBook, setSelectedBook] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); 
  const [nativeLangSentence, setNativeLangSentence] = useState(""); 
  const [showText, setShowText] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [articulation, setArticulation] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(3);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState(6);
  const [isAtEndOfBook, setIsAtEndOfBook] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);
  
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
            if (speed >= 1 && speed <= 5) {
              setListeningSpeed(speed);
              await ListeningSpeed.saveListeningSpeed(speed);
            }
          } else {
            await ListeningSpeed.saveListeningSpeed(3);
          }
        } catch (error) {
          // Silent error handling
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        
        // Initialize BookReader
        BookReader.initialize(handleSentenceProcessed, deviceLang || 'en');
        
        // Initialize gamepad support
        gamepadManager.init();
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
          const translated = await apiTranslateSentenceFast(value, 'en', targetLang);
          translatedElements[key] = translated;
        } catch (error) {
          translatedElements[key] = value;
        }
      }
      
      // Translate book titles
      const translatedBooks = {};
      const userLibrary = await getUserLibrary();
      
      for (const book of userLibrary) {
        try {
          const translatedTitle = await apiTranslateSentenceFast(book.title, 'en', targetLang);
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
    
    setStudyLangSentence(sentence);
    setNativeLangSentence(translation || sentence);
    
    const progress = readingManager.getProgress();
    setCurrentSentenceIndex(progress.currentSentenceIndex);
    
    if (BookReader.bookSentences && BookReader.bookSentences.length > 0) {
      setTotalSentences(BookReader.bookSentences.length);
    } else {
      setTotalSentences(progress.totalSentencesInBook || 0);
    }
    
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
      await readingManager.advanceToNextSentence();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (autoplay && !isSpeaking) {
        const currentSentence = BookReader.simpleArray && BookReader.simpleArray.length > 0 
          ? BookReader.simpleArray[0] 
          : studyLangSentence;
        
        if (currentSentence) {
          ListeningSpeed.speakSentenceWithPauses(
            currentSentence,
            listeningSpeed, 
            () => {
              setIsSpeaking(false);
            }, 
            articulation
          );
          setIsSpeaking(true);
        }
      }
    } catch (error) {
      setStudyLangSentence("Error: " + error.message);
    }
  };
  
  // Handle previous sentence button click
  const handlePreviousSentence = async () => {
    try {
      if (isSpeaking) {
        ListeningSpeed.stopSpeaking();
        setIsSpeaking(false);
      }
      
      await readingManager.goToPreviousSentence();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (autoplay && !isSpeaking) {
        const currentSentence = BookReader.simpleArray && BookReader.simpleArray.length > 0 
          ? BookReader.simpleArray[0] 
          : studyLangSentence;
        
        if (currentSentence) {
          ListeningSpeed.speakSentenceWithPauses(
            currentSentence,
            listeningSpeed, 
            () => {
              setIsSpeaking(false);
            }, 
            articulation
          );
          setIsSpeaking(true);
        }
      }
    } catch (error) {
      setStudyLangSentence("Error: " + error.message);
    }
  };
  
  // Handle go to end of book button click
  const handleGoToEndOfBook = async () => {
    try {
      if (loadingBook) {
        return false;
      }
      
      if (isSpeaking) {
        ListeningSpeed.stopSpeaking();
        setIsSpeaking(false);
      }
      
      const confirmed = window.confirm(uiText.goToEndConfirmMessage || "Go to the end of the book?");
      if (!confirmed) {
        return false;
      }
      
      setLoadingBook(true);
      
      try {
        await readingManager.goToEndOfBook();
        return true;
      } catch (error) {
        setStudyLangSentence("Error: " + error.message);
        return false;
      } finally {
        setLoadingBook(false);
      }
    } catch (error) {
      setStudyLangSentence("Error: " + error.message);
      return false;
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
    if (loadingBook) {
      return false;
    }
    
    const confirmed = window.confirm(uiText.rewindConfirmMessage || "Rewind the book to the beginning?");
    if (!confirmed) {
      return false;
    }
    
    try {
      setLoadingBook(true);
      const success = await readingManager.rewindBook();
      return success;
    } catch (error) {
      alert(uiText.rewindFailed || "Failed to rewind the book.");
      return false;
    } finally {
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
    clearContent();
    setIsAtEndOfBook(false);
    
    const bookId = selectedBook;
    
    if (!bookId) {
      alert("Selection Required: Please select a book from the dropdown.");
      return false;
    }
    
    if (!studyLanguage) {
      alert("Language Required: Please select a study language.");
      return false;
    }
    
    setLoadingBook(true);
    
    try {
      const book = await getBookById(bookId);
      
      if (!book) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      setSourceLanguage(book.language);
      
      const success = await readingManager.loadBook(studyLanguage, bookId);
      
      if (!success) {
        throw new Error("Failed to load book");
      }
      
      if (BookReader.bookSentences) {
        setTotalSentences(BookReader.bookSentences.length);
      }
      
      // Register gamepad callbacks for this book
      gamepadManager.registerCallbacks({
        onNext: handleNextSentence,
        onListen: handleToggleSpeak,
        onPrevious: handlePreviousSentence,
        onBeginningOfBook: handleRewindBook,
        onEndOfBook: handleGoToEndOfBook
      });
      
      return true;
    } catch (error) {
      setStudyLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      setNativeLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      return false;
    } finally {
      setLoadingBook(false);
    }
  };
  
  if (typeof MainUI === 'undefined') {
    console.error('MainUI component is undefined!');
    return <div>Error: MainUI component not found</div>;
  }
  
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
      handlePreviousSentence={handlePreviousSentence}
      handleGoToEndOfBook={handleGoToEndOfBook}
    />
  );
}