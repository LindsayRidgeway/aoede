import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateLabels } from './translateLabels';
import { toggleSpeak, processNextSentence } from './audioControls';
import { fetchBookContent } from './gptBookService';
import { processSourceText } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';

export default function App() {
  const [uiText, setUiText] = useState({});
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState(6);
  const [searchMode, setSearchMode] = useState('dropdown'); // 'dropdown' or 'search'
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        translateLabels(setUiText);
        
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
  
  // Handle speak button click
  const handleToggleSpeak = () => {
    toggleSpeak(isSpeaking, setIsSpeaking, studyLangSentence, listeningSpeed);
  };
  
  // Handle next sentence button click
  const handleNextSentence = () => {
    processNextSentence(
      sentences, 
      currentSentenceIndex, 
      setCurrentSentenceIndex,
      setStudyLangSentence, 
      setNativeLangSentence, 
      Alert.alert
    );
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
  
  // Direct implementation of loadContent to avoid import issues
  const loadContent = async (bookIdOrSearch, studyLanguage, isCustomSearch = false) => {
    if (!bookIdOrSearch || !studyLanguage) {
      Alert.alert("Required Information", "Please select a book and specify a study language.");
      return false;
    }
    
    setLoadingBook(true);
    
    try {
      console.log(`Loading content for: "${bookIdOrSearch}" in ${studyLanguage} with reading level: ${readingLevel}`);
      
      // Step 1: Get the original sentences from GPT-4o
      const isSearchQuery = searchMode === 'search';
      const bookData = await fetchBookContent(bookIdOrSearch, 100, isSearchQuery);
      console.log("Book data fetched successfully:", bookData.title);
      
      if (!bookData || !bookData.sentences || bookData.sentences.length === 0) {
        console.error("Failed to fetch book content or no sentences returned");
        setStudyLangSentence("Error loading content.");
        setNativeLangSentence("Error loading content.");
        setLoadingBook(false);
        return false;
      }
      
      // Join sentences into a single text for processing
      const sourceText = bookData.sentences.join(' ');
      
      // Step 2: Process the text - translate to study language and simplify
      const processedText = await processSourceText(sourceText, studyLanguage, readingLevel);
      console.log("Text processed successfully");
      
      if (!processedText || processedText.length === 0) {
        console.error("Failed to process source text or no content returned");
        setStudyLangSentence("Error processing content.");
        setNativeLangSentence("Error processing content.");
        setLoadingBook(false);
        return false;
      }
      
      // Step 3: Parse the processed text into sentences
      const simplifiedSentences = processedText.split(/(?<=[.!?])\s+/);
      console.log(`Extracted ${simplifiedSentences.length} simplified sentences`);
      
      if (simplifiedSentences.length === 0) {
        console.error("Failed to parse sentences");
        setStudyLangSentence("Error parsing sentences.");
        setNativeLangSentence("Error parsing sentences.");
        setLoadingBook(false);
        return false;
      }
      
      // Step 4: Translate each sentence to native language using Google Translate
      const translatedSentences = await translateSentences(simplifiedSentences, studyLanguage, navigator.language.split('-')[0] || "en");
      console.log(`Translated ${translatedSentences.length} sentences`);
      
      if (translatedSentences.length === 0) {
        console.error("Failed to translate sentences");
        setStudyLangSentence("Error translating sentences.");
        setNativeLangSentence("Error translating sentences.");
        setLoadingBook(false);
        return false;
      }
      
      // Create paired sentences
      const pairedSentences = [];
      const maxLength = Math.min(simplifiedSentences.length, translatedSentences.length);
      
      for (let i = 0; i < maxLength; i++) {
        pairedSentences.push({
          original: simplifiedSentences[i],
          translation: translatedSentences[i]
        });
      }
      
      // Set state with the paired sentences
      setSentences(pairedSentences);
      setSourceLanguage(detectLanguageCode(studyLanguage));
      setCurrentSentenceIndex(0);
      
      // Display first sentence
      if (pairedSentences.length > 0) {
        setStudyLangSentence(pairedSentences[0].original);
        setNativeLangSentence(pairedSentences[0].translation);
        
        // Log the first few sentences for debugging
        const sampleSize = Math.min(3, pairedSentences.length);
        for (let i = 0; i < sampleSize; i++) {
          console.log(`Sentence ${i+1}:`);
          console.log(`Original: ${pairedSentences[i].original}`);
          console.log(`Translation: ${pairedSentences[i].translation}`);
        }
        
        return true;
      } else {
        console.error("No paired sentences created");
        setStudyLangSentence("Error creating sentences.");
        setNativeLangSentence("Error creating sentences.");
        return false;
      }
    } catch (error) {
      console.error("Error loading book:", error);
      setStudyLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      setNativeLangSentence(`Error: ${error.message || "Unknown error loading content."}`);
      return false;
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle load book button click
  const handleLoadBook = () => {
    console.log("Load button clicked");
    console.log(`Search mode: ${searchMode}`);
    
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
    
    console.log("Starting content loading...");
    
    // Call the directly implemented loadContent function
    loadContent(contentToLoad, studyLanguage);
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
      loadingBook={loadingBook}
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
    />
  );
}