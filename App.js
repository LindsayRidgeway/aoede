import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchBookContent, popularBooks } from './gptBookService';
import { processSourceText, translateBatch } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';
import BatchProcessor from './batchProcessor';

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
    console.error("Translation failed:", error);
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
    switchToSearch: "Switch to Search",
    switchToDropdown: "Switch to Book List",
    bookSearch: "Book Search",
    enterBookSearch: "Enter book title or description",
    searchButton: "Search",
    loadingMore: "Loading more sentences...",
    pleaseWait: "Please wait. This may take several minutes...",
    endOfBook: "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.",
    continue: "Continue"
  };
  
  const [uiText, setUiText] = useState(defaultUiText);
  const [selectedBook, setSelectedBook] = useState("");  
  const [customSearch, setCustomSearch] = useState("");
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
  const [searchMode, setSearchMode] = useState('dropdown'); // 'dropdown' or 'search'
  const [currentBookData, setCurrentBookData] = useState(null); // Store fetched book data
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
          const storedSearchMode = await AsyncStorage.getItem("searchMode");
          const storedCustomSearch = await AsyncStorage.getItem("customSearch");
          
          if (storedSelectedBook !== null) {
            setSelectedBook(storedSelectedBook);
          }
          
          if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
          }
          
          if (storedReadingLevel !== null) {
            setReadingLevel(parseInt(storedReadingLevel, 10));
          }
          
          if (storedSearchMode !== null) {
            setSearchMode(storedSearchMode);
          }
          
          if (storedCustomSearch !== null) {
            setCustomSearch(storedCustomSearch);
          }
        } catch (error) {
          console.error("Error loading stored settings:", error);
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        await ListeningSpeed.detectLanguageCode(language);
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    
    initialize();
  }, []);
  
  // Direct translation of UI elements
  const translateUiElements = async () => {
    if (userLanguage === 'en') return;
    
    try {
      console.log(`Translating UI to ${userLanguage}`);
      
      // Translate basic UI elements
      const translatedElements = {};
      for (const [key, value] of Object.entries(defaultUiText)) {
        try {
          const translated = await directTranslate(value, 'en', userLanguage);
          translatedElements[key] = translated;
        } catch (error) {
          console.error(`Error translating ${key}:`, error);
          translatedElements[key] = value;
        }
      }
      
      // Translate book titles
      const translatedBooks = {};
      for (const book of popularBooks) {
        try {
          const translatedTitle = await directTranslate(book.title, 'en', userLanguage);
          translatedBooks[book.id] = translatedTitle;
        } catch (error) {
          console.error(`Error translating book title ${book.id}:`, error);
          translatedBooks[book.id] = book.title;
        }
      }
      
      // Set translated text
      setUiText({...translatedElements, ...translatedBooks});
      
    } catch (error) {
      console.error("Error translating UI:", error);
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
    console.log("Clearing content area");
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
    console.log("Next sentence button clicked");
    
    if (sentences.length === 0) return;
    
    // Increment sentence index
    const nextIndex = currentSentenceIndex + 1;
    
    // Check if we've reached the end of available sentences
    if (nextIndex >= sentences.length) {
      console.log("Reached end of current sentences batch");
      
      // Check if we should load more sentences
      if (BatchProcessor.shouldProcessNextBatch(currentSentenceIndex)) {
        console.log("Attempting to load more sentences");
        setLoadingMoreSentences(true);
        
        try {
          // Process next batch of sentences
          const newBatch = await BatchProcessor.processNextBatch();
          
          if (newBatch && newBatch.length > 0) {
            console.log(`Loaded new batch with ${newBatch.length} sentences`);
            
            // Add new sentences and continue
            setSentences(prevSentences => [...prevSentences, ...newBatch]);
            
            // Move to the first sentence of the new batch
            const newIndex = sentences.length; // Index of first item in new batch
            setCurrentSentenceIndex(newIndex);
            setStudyLangSentence(newBatch[0].original);
            setNativeLangSentence(newBatch[0].translation);
          } else {
            console.log("No more sentences available");
            // No more sentences available - directly display end of book message
            setStudyLangSentence(uiText.endOfBook || "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.");
            setNativeLangSentence("");
            
            // Set a specific flag to indicate we're at the end
            setIsAtEndOfBook(true);
          }
        } catch (error) {
          console.error("Error loading more sentences:", error);
          setStudyLangSentence("Error loading more sentences.");
          setNativeLangSentence("Please try again.");
        } finally {
          setLoadingMoreSentences(false);
        }
        
        return;
      } else {
        console.log("No more sentences can be loaded");
        // We're at the end and can't load more - directly display end of book message
        setStudyLangSentence(uiText.endOfBook || "You have read all the sentences that I retrieved for that book. To continue studying, please use Load Book again.");
        setNativeLangSentence("");
        
        // Set a specific flag to indicate we're at the end
        setIsAtEndOfBook(true);
        return;
      }
    }
    
    // Display the next sentence
    console.log(`Moving to sentence index ${nextIndex}`);
    setCurrentSentenceIndex(nextIndex);
    setStudyLangSentence(sentences[nextIndex].original);
    setNativeLangSentence(sentences[nextIndex].translation);
    
    // Check if we should start loading more sentences in the background
    if (BatchProcessor.shouldProcessNextBatch(nextIndex)) {
      console.log("Starting background loading of next batch");
      setLoadingMoreSentences(true);
      
      try {
        // Process next batch of sentences in the background
        const newBatch = await BatchProcessor.processNextBatch();
        
        if (newBatch && newBatch.length > 0) {
          // Add new sentences without changing the current index
          setSentences(prevSentences => [...prevSentences, ...newBatch]);
          console.log(`Added ${newBatch.length} new sentences in background`);
        }
      } catch (error) {
        console.error("Error loading more sentences in background:", error);
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
      console.error("Error saving selectedBook:", error);
    }
  };
  
  // Handle custom search change
  const handleCustomSearchChange = async (text) => {
    setCustomSearch(text);
    try {
      await AsyncStorage.setItem("customSearch", text);
    } catch (error) {
      console.error("Error saving customSearch:", error);
    }
  };
  
  // Handle search mode change
  const handleSearchModeChange = async (mode) => {
    setSearchMode(mode);
    try {
      await AsyncStorage.setItem("searchMode", mode);
    } catch (error) {
      console.error("Error saving searchMode:", error);
    }
  };
  
  // Handle reading level change
  const handleReadingLevelChange = async (level) => {
    setReadingLevel(level);
    try {
      await AsyncStorage.setItem("readingLevel", level.toString());
    } catch (error) {
      console.error("Error saving readingLevel:", error);
    }
  };
  
  // Handle new batch of sentences
  const handleNewBatchReady = (newBatch) => {
    // Only add new batch to sentences if we're loading the initial batch
    // For subsequent batches, they are added directly in handleNextSentence
    if (isLoadingInitialBatch && newBatch.length > 0) {
      setSentences(prevSentences => [...prevSentences, ...newBatch]);
      console.log(`Added ${newBatch.length} sentences from initial batch`);
    }
  };
  
  // Handle load book button click - using batch processor
  const handleLoadBook = async () => {
    console.log("Load button clicked");
    console.log(`Search mode: ${searchMode}`);
    
    // Reset previous sentences and state
    clearContent(); // Use the common clear function
    setIsAtEndOfBook(false); // Ensure flag is reset
    
    // Determine what to load based on search mode
    const contentToLoad = searchMode === 'search' ? customSearch : selectedBook;
    
    console.log(`Content to load: "${contentToLoad}"`);
    console.log(`Study language: "${studyLanguage}"`);
    console.log(`Reading level: ${readingLevel}`);
    
    if (!contentToLoad) {
      const message = searchMode === 'search' 
        ? "Please enter a book title or description to search." 
        : "Please select a book from the dropdown.";
      
      console.log(`Validation error: ${message}`);
      Alert.alert("Selection Required", message);
      return;
    }
    
    if (!studyLanguage) {
      console.log("Validation error: No study language specified");
      Alert.alert("Language Required", "Please enter a study language.");
      return;
    }
    
    setLoadingBook(true);
    setIsLoadingInitialBatch(true);
    
    try {
      console.log("Starting content loading...");
      
      // Step 1: Get the original sentences from GPT-4o
      const isSearchQuery = searchMode === 'search';
      const bookData = await fetchBookContent(contentToLoad, 500, isSearchQuery);
      console.log(`Book data fetched successfully: ${bookData.title}, ${bookData.sentences.length} sentences`);
      
      // Store book data for later use
      setCurrentBookData(bookData);
      
      if (!bookData || !bookData.sentences || bookData.sentences.length === 0) {
        console.error("Failed to fetch book content or no sentences returned");
        setStudyLangSentence("Error loading content.");
        setNativeLangSentence("Error loading content.");
        setLoadingBook(false);
        setIsLoadingInitialBatch(false);
        return;
      }
      
      // Set source language from study language
      setSourceLanguage(detectLanguageCode(studyLanguage));
      
      // Step 2: Initialize the batch processor
      BatchProcessor.reset();
      const firstBatch = await BatchProcessor.initialize(
        bookData,
        studyLanguage,
        userLanguage,
        readingLevel,
        handleNewBatchReady
      );
      
      if (!firstBatch || firstBatch.length === 0) {
        console.error("Failed to process first batch of sentences");
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
      
      console.log(`First batch loaded with ${firstBatch.length} sentences`);
      
      // Log the first few sentences for debugging
      const sampleSize = Math.min(3, firstBatch.length);
      for (let i = 0; i < sampleSize; i++) {
        console.log(`Sentence ${i+1}:`);
        console.log(`Original: ${firstBatch[i].original}`);
        console.log(`Translation: ${firstBatch[i].translation}`);
      }
      
      // Start background loading of the second batch if needed
      if (BatchProcessor.shouldProcessNextBatch(0)) {
        console.log("Starting background loading of second batch");
        BatchProcessor.processNextBatch().then(newBatch => {
          if (newBatch && newBatch.length > 0) {
            setSentences(prevSentences => [...prevSentences, ...newBatch]);
            console.log(`Added ${newBatch.length} sentences from second batch in background`);
          }
        }).catch(error => {
          console.error("Error loading second batch in background:", error);
        });
      }
      
    } catch (error) {
      console.error("Error loading book:", error);
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
      customSearch={customSearch}
      setCustomSearch={handleCustomSearchChange}
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
      searchMode={searchMode}
      setSearchMode={handleSearchModeChange}
      isAtEndOfBook={isAtEndOfBook}
    />
  );
}