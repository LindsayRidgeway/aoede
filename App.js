import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { translateLabels } from './translateLabels';
import { updateUserQuery } from './updateUserQuery';

// Get API keys from app.json
const anthropicKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const googleKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY;
const CORS_PROXY = Constants.expoConfig?.extra?.EXPO_PUBLIC_CORS_PROXY || "";

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
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
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        translateLabels(setUiText);
        
        // Load stored settings
        try {
          const storedUserQuery = await AsyncStorage.getItem("userQuery");
          const storedSpeechRate = await AsyncStorage.getItem("speechRate");
          
          if (storedUserQuery !== null) {
            setUserQuery(storedUserQuery);
          }
          
          if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
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
  
  // Toggle speak function
  const toggleSpeak = () => {
    if (isSpeaking) {
      ListeningSpeed.stopSpeaking();
      setIsSpeaking(false);
    } else {
      ListeningSpeed.speakSentenceWithPauses(studyLangSentence, listeningSpeed, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };
  
  // Load book handler
  const loadBookHandler = async () => {
    if (!userQuery || !studyLanguage) return;
    
    setLoadingBook(true);
    
    try {
      console.log(`Loading content for query: "${userQuery}" in language: "${studyLanguage}"`);
      
      // Step 1: Get the original sentences from the source material
      const sourceText = await fetchSourceText(userQuery);
      console.log("Source text fetched successfully");
      
      if (!sourceText || sourceText.length === 0) {
        console.error("Failed to fetch source text or no content returned");
        setStudyLangSentence("Error loading content.");
        setNativeLangSentence("Error loading content.");
        setLoadingBook(false);
        return;
      }
      
      // Step 2: Process the text - translate to study language and simplify
      const processedText = await processSourceText(sourceText, studyLanguage);
      console.log("Text processed successfully");
      
      if (!processedText || processedText.length === 0) {
        console.error("Failed to process source text or no content returned");
        setStudyLangSentence("Error processing content.");
        setNativeLangSentence("Error processing content.");
        setLoadingBook(false);
        return;
      }
      
      // Step 3: Parse the processed text into sentences
      const simplifiedSentences = parseIntoSentences(processedText);
      console.log(`Extracted ${simplifiedSentences.length} simplified sentences`);
      
      if (simplifiedSentences.length === 0) {
        console.error("Failed to parse sentences");
        setStudyLangSentence("Error parsing sentences.");
        setNativeLangSentence("Error parsing sentences.");
        setLoadingBook(false);
        return;
      }
      
      // Step 4: Translate each sentence to native language using Google Translate
      const translatedSentences = await translateSentences(simplifiedSentences, studyLanguage, navigator.language.split('-')[0] || "en");
      console.log(`Translated ${translatedSentences.length} sentences`);
      
      if (translatedSentences.length === 0) {
        console.error("Failed to translate sentences");
        setStudyLangSentence("Error translating sentences.");
        setNativeLangSentence("Error translating sentences.");
        setLoadingBook(false);
        return;
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
      } else {
        console.error("No paired sentences created");
        setStudyLangSentence("Error creating sentences.");
        setNativeLangSentence("Error creating sentences.");
      }
    } catch (error) {
      console.error("Error loading book:", error);
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Step 1: Fetch the source text
  const fetchSourceText = async (title) => {
    try {
      if (!anthropicKey) {
        console.error("Missing Anthropic API key");
        return null;
      }
      
      console.log(`Using CORS proxy: ${CORS_PROXY}`);
      const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2000,
          messages: [
            { 
              role: "user", 
              content: `Please provide the first 10 sentences of "${title}" in its original language.

Just output the raw text of those 10 sentences, without any commentary, analysis, or explanation.

Format as follows:
ORIGINAL_TEXT:
[sentence 1]
[sentence 2]
...and so on

LANGUAGE: [language code]`
            }
          ]
        })
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`API error (status ${response.status}):`, responseText);
        return null;
      }
      
      const data = await response.json();
      console.log("Response received from Claude API for source text");
      
      if (data.error) {
        console.error("Claude API error:", data.error);
        return null;
      }
      
      if (!data.content || data.content.length === 0) {
        console.error("No content in Claude API response");
        return null;
      }
      
      // Get the response text
      const fullResponse = data.content[0].text.trim();
      console.log("Source text response received:", fullResponse.substring(0, 100) + "...");
      
      // Extract the original text
      const originalTextMatch = fullResponse.match(/ORIGINAL_TEXT:\s*([\s\S]*?)(?=\s*LANGUAGE:|$)/);
      if (originalTextMatch && originalTextMatch[1]) {
        return originalTextMatch[1].trim();
      }
      
      // If we couldn't extract the original text, return the whole response
      return fullResponse;
    } catch (error) {
      console.error("Error fetching source text:", error);
      return null;
    }
  };
  
  // Step 2: Process the source text - translate and simplify
  const processSourceText = async (sourceText, targetLanguage) => {
    try {
      if (!anthropicKey) {
        console.error("Missing Anthropic API key");
        return null;
      }
      
      const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
      const ageGroup = 6; // Hardcoded to 6 as requested
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4000,
          messages: [
            { 
              role: "user", 
              content: `Here are some sentences:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

Follow these guidelines for simplification:
1. Replace complex vocabulary with simpler words
2. Break down sentences longer than 10-12 words into multiple shorter sentences
3. Use vocabulary a ${ageGroup}-year-old would know
4. Eliminate abstract concepts
5. Focus on concrete, visual descriptions
6. Split sentences with multiple clauses into separate sentences
7. Target sentence length: 4-8 words, maximum 10 words
8. Each simplified sentence must be clear and comprehensible to a ${ageGroup}-year-old

Please aim to create about 25-30 simplified sentences total from these original sentences.

Format your response by listing ONLY the simplified sentences in ${targetLanguage}, with each sentence on its own line.`
            }
          ]
        })
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`API error (status ${response.status}):`, responseText);
        return null;
      }
      
      const data = await response.json();
      console.log("Response received from Claude API for processing");
      
      if (data.error) {
        console.error("Claude API error:", data.error);
        return null;
      }
      
      if (!data.content || data.content.length === 0) {
        console.error("No content in Claude API response");
        return null;
      }
      
      // Get the processed text
      const processedText = data.content[0].text.trim();
      console.log("Processed text received:", processedText.substring(0, 100) + "...");
      
      return processedText;
    } catch (error) {
      console.error("Error processing source text:", error);
      return null;
    }
  };
  
  // Step 3: Parse the processed text into sentences
  const parseIntoSentences = (text) => {
    if (!text) return [];
    
    // Split by newlines
    let sentences = text.split('\n')
                       .map(line => line.trim())
                       .filter(line => line.length > 0);
    
    // If there aren't enough sentences, try to split by periods
    if (sentences.length < 5) {
      sentences = text.split(/(?<=[.!?])\s+/)
                     .map(sentence => sentence.trim())
                     .filter(sentence => sentence.length > 0);
    }
    
    return sentences;
  };
  
  // Step 4: Translate sentences using Google Translate
  const translateSentences = async (sentences, sourceLang, targetLang) => {
    if (!sentences || sentences.length === 0) return [];
    if (sourceLang === targetLang) return sentences;
    
    const translatedSentences = [];
    
    // Detect language code for source language if needed
    const sourceLanguageCode = detectLanguageCode(sourceLang);
    
    // Batch translations to avoid too many API calls
    const batchSize = 10;
    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      
      try {
        const translations = await translateBatch(batch, sourceLanguageCode, targetLang);
        translatedSentences.push(...translations);
      } catch (error) {
        console.error(`Error translating batch ${i} to ${i + batchSize}:`, error);
        // If translation fails, use original sentences as fallback
        translatedSentences.push(...batch);
      }
    }
    
    return translatedSentences;
  };
  
  // Translate a batch of sentences
  const translateBatch = async (textArray, sourceLang, targetLang) => {
    if (!googleKey) {
      console.error("Google API Key Missing");
      return textArray; // Return original text as fallback
    }
    
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            q: textArray,
            source: sourceLang,
            target: targetLang,
            format: "text"
          })
        }
      );
      
      const data = await response.json();
      
      // Handle API errors
      if (data.error) {
        console.error("Translation API error:", data.error);
        return textArray; // Return original text as fallback
      }
      
      if (!data.data?.translations || data.data.translations.length === 0) {
        console.error("No translations in response:", data);
        return textArray; // Return original text as fallback
      }
      
      return data.data.translations.map(t => t.translatedText);
    } catch (error) {
      console.error("Translation failed:", error);
      return textArray; // Return original text as fallback
    }
  };
  
  // Process next sentence
  const processNextSentence = async () => {
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
  
  // Basic language code detection
  const detectLanguageCode = (languageName) => {
    const languageMap = {
      'english': 'en',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'dutch': 'nl',
      'russian': 'ru',
      'japanese': 'ja',
      'chinese': 'zh',
      'korean': 'ko',
      'arabic': 'ar',
      'hindi': 'hi',
      'turkish': 'tr',
      'vietnamese': 'vi',
      'thai': 'th',
      'indonesian': 'id',
      'hebrew': 'he',
      'polish': 'pl',
      'swedish': 'sv',
      'greek': 'el',
      'czech': 'cs',
      'danish': 'da',
      'finnish': 'fi',
      'norwegian': 'no',
      'romanian': 'ro',
      'hungarian': 'hu'
    };
    
    const lowercaseName = languageName.toLowerCase();
    
    // Try to find an exact match
    if (languageMap[lowercaseName]) {
      return languageMap[lowercaseName];
    }
    
    // If it's a 2-letter code already, return it
    if (/^[a-z]{2}$/.test(lowercaseName)) {
      return lowercaseName;
    }
    
    // Try to find a partial match
    for (const [key, value] of Object.entries(languageMap)) {
      if (lowercaseName.includes(key) || key.includes(lowercaseName)) {
        return value;
      }
    }
    
    // Default to English if no match found
    return 'en';
  };
  
  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
      loadBook={loadBookHandler}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={toggleSpeak}
      nextSentence={processNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={sentences.length}
    />
  );
}