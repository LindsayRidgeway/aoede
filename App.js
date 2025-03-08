import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchBookContent, popularBooks } from './gptBookService';
import { processSourceText, translateBatch } from './apiServices';
import { translateSentences, detectLanguageCode } from './textProcessing';

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
    searchButton: "Search"
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
  
  // Handle next sentence button click
  const handleNextSentence = () => {
    if (sentences.length === 0) return;
    
    // Increment sentence index
    const nextIndex = currentSentenceIndex + 1;
    
    // Check if we've reached the end of available sentences
    if (nextIndex >= sentences.length) {
      // Show notification to user that we're at the end
      Alert.alert("End of Content", "You've reached the end of the available sentences.");
      return;
    }
    
    // Display the next sentence
    setCurrentSentenceIndex(nextIndex);
    setStudyLangSentence(sentences[nextIndex].original);
    setNativeLangSentence(sentences[nextIndex].translation);
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
      const bookData = await fetchBookContent(bookIdOrSearch, 200, isSearchQuery);
      console.log(`Book data fetched successfully: ${bookData.title}, ${bookData.sentences.length} sentences`);
      
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
      const translatedSentences = await translateSentences(simplifiedSentences, studyLanguage, userLanguage);
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
    loadContent(contentToLoad, studyLanguage, searchMode === 'search');
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