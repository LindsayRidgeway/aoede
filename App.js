import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processSourceText, translateBatch } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BatchProcessor from './batchProcessor';
import BookPipe from './bookPipe';
import { bookSources } from './bookSources';

// Direct translation method using Google Translate
const directTranslate = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;
  
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=AIzaSyDvrAsHGvT7nurWKi3w0879zLWFYtpEgJ0`,
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
    continue: "Continue"
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
  const [loadingMoreSentences, setLoadingMoreSentences] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState(6);
  const [isLoadingInitialBatch, setIsLoadingInitialBatch] = useState(false); // Distinguish initial vs next batch loading
  const [isAtEndOfBook, setIsAtEndOfBook] = useState(false); // Track if we've reached the end of all available sentences
  
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
    setSentences([]);
    setCurrentSentenceIndex(0);
    setIsAtEndOfBook(false); // Reset end flag
    
    // Reset BatchProcessor too
    BatchProcessor.reset();
  };
  
  // Handle next sentence button click - with improved end-of-book handling
  const handleNextSentence = async () => {
    if (sentences.length === 0) return;
    
    // Increment sentence index
    const nextIndex = currentSentenceIndex + 1;
    
    // Check if we've reached the end of available sentences
    if (nextIndex >= sentences.length) {
      // Check if we should load more sentences
      if (BatchProcessor.shouldProcessNextBatch(currentSentenceIndex)) {
        setLoadingMoreSentences(true);
        
        try {
          // Process next batch of sentences
          const newBatch = await BatchProcessor.processNextBatch();
          
          if (newBatch && newBatch.length > 0) {
            // Add new sentences and continue
            setSentences(prevSentences => [...prevSentences, ...newBatch]);
            
            // Move to the first sentence of the new batch
            const newIndex = sentences.length; // Index of first item in new batch
            setCurrentSentenceIndex(newIndex);
            setStudyLangSentence(newBatch[0].original);
            setNativeLangSentence(newBatch[0].translation);
          } else {
            // No more sentences available - directly display end of book message
            setStudyLangSentence(uiText.endOfBook || "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.");
            setNativeLangSentence("");
            
            // Set a specific flag to indicate we're at the end
            setIsAtEndOfBook(true);
          }
        } catch (error) {
          setStudyLangSentence("Error loading more sentences.");
          setNativeLangSentence("Please try again.");
        } finally {
          setLoadingMoreSentences(false);
        }
        
        return;
      } else {
        // We're at the end and can't load more - directly display end of book message
        setStudyLangSentence(uiText.endOfBook || "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.");
        setNativeLangSentence("");
        
        // Set a specific flag to indicate we're at the end
        setIsAtEndOfBook(true);
        return;
      }
    }
    
    // Display the next sentence
    setCurrentSentenceIndex(nextIndex);
    setStudyLangSentence(sentences[nextIndex].original);
    setNativeLangSentence(sentences[nextIndex].translation);
    
    // Check if we should start loading more sentences in the background
    if (BatchProcessor.shouldProcessNextBatch(nextIndex)) {
      setLoadingMoreSentences(true);
      
      try {
        // Process next batch of sentences in the background
        const newBatch = await BatchProcessor.processNextBatch();
        
        if (newBatch && newBatch.length > 0) {
          // Add new sentences without changing the current index
          setSentences(prevSentences => [...prevSentences, ...newBatch]);
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setLoadingMoreSentences(false);
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
    try {
      await AsyncStorage.setItem("readingLevel", level.toString());
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle new batch of sentences
  const handleNewBatchReady = (newBatch) => {
    // Only add new batch to sentences if we're loading the initial batch
    // For subsequent batches, they are added directly in handleNextSentence
    if (isLoadingInitialBatch && newBatch.length > 0) {
      setSentences(prevSentences => [...prevSentences, ...newBatch]);
    }
  };
  
  // Handle load book button click - using batch processor
  const handleLoadBook = async () => {
    // Reset previous sentences and state
    clearContent(); // Use the common clear function
    setIsAtEndOfBook(false); // Ensure flag is reset
    
    // Use the selected book
    const bookId = selectedBook;
    
    if (!bookId) {
      let message = "Please select a book from the dropdown.";
      Alert.alert("Selection Required", message);
      return;
    }
    
    if (!studyLanguage) {
      Alert.alert("Language Required", "Please enter a study language.");
      return;
    }
    
    setLoadingBook(true);
    setIsLoadingInitialBatch(true);
    
    try {
      // Set source language from study language
      setSourceLanguage(detectLanguageCode(studyLanguage));
      
      // Step 1: Initialize the batch processor with the book ID
      const firstBatch = await BatchProcessor.initialize(
        bookId,
        studyLanguage,
        userLanguage,
        readingLevel,
        handleNewBatchReady
      );
      
      if (!firstBatch || firstBatch.length === 0) {
        setStudyLangSentence("Error processing content.");
        setNativeLangSentence("Error processing content.");
        setLoadingBook(false);
        setIsLoadingInitialBatch(false);
        return;
      }
      
      // Set sentences and display the first one
      setSentences(firstBatch);
      setCurrentSentenceIndex(0);
      setStudyLangSentence(firstBatch[0].original);
      setNativeLangSentence(firstBatch[0].translation);
      
      // Start background loading of the second batch if needed
      if (BatchProcessor.shouldProcessNextBatch(0)) {
        BatchProcessor.processNextBatch().then(newBatch => {
          if (newBatch && newBatch.length > 0) {
            setSentences(prevSentences => [...prevSentences, ...newBatch]);
          }
        }).catch(error => {
          // Silent error handling
        });
      }
      
    } catch (error) {
      setStudyLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      setNativeLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
    } finally {
      setLoadingBook(false);
      setIsLoadingInitialBatch(false);
    }
  };
  
  return (
    <MainUI
      uiText={uiText}
      selectedBook={selectedBook}
      setSelectedBook={handleBookChange}
      loadBook={handleLoadBook}
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
      loadingBook={loadingBook || loadingMoreSentences}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={sentences.length}
      readingLevel={readingLevel}
      setReadingLevel={handleReadingLevelChange}
      isAtEndOfBook={isAtEndOfBook}
    />
  );
}