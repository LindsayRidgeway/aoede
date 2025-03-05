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
      
      // Get content from Claude API
      const result = await fetchContentFromClaude(userQuery, studyLanguage);
      console.log("Result from fetchContentFromClaude:", result);
      
      if (result && result.sentences && result.sentences.length > 0) {
        console.log(`Successfully loaded ${result.sentences.length} sentences in ${result.language}`);
        
        setSentences(result.sentences);
        setSourceLanguage(result.language);
        setCurrentSentenceIndex(0);
        
        // Display first sentence
        const firstSentence = result.sentences[0];
        console.log("First sentence:", firstSentence);
        
        setStudyLangSentence(firstSentence.original);
        setNativeLangSentence(firstSentence.translation);
        
        // Log the first few sentences for debugging
        const sampleSize = Math.min(3, result.sentences.length);
        for (let i = 0; i < sampleSize; i++) {
          console.log(`Sentence ${i+1}:`);
          console.log(`Original: ${result.sentences[i].original}`);
          console.log(`Translation: ${result.sentences[i].translation}`);
        }
      } else {
        console.error("Failed to load content or no sentences returned");
        setStudyLangSentence("Error loading content.");
        setNativeLangSentence("Error loading content.");
      }
    } catch (error) {
      console.error("Error loading book:", error);
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
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
  
  // Fetch content from Claude API
  const fetchContentFromClaude = async (title, targetLanguage) => {
    try {
      if (!anthropicKey) {
        console.error("Missing Anthropic API key");
        return null;
      }
      
      // Get system language
      const systemLanguage = navigator.language.split('-')[0] || "en";
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
          max_tokens: 4000,
          messages: [
            { 
              role: "user", 
              content: `I need 40-50 simplified sentences for language learning based on the themes, characters, and setting of "${title}". I'd like these in ${targetLanguage}.

These should be simple, straightforward sentences a beginner could understand. Since I'm creating a language learning tool, I don't need direct quotes from the work - I need original, simplified content related to the work's themes and narrative.

Guidelines:
- Create short, simple sentences (4-7 words each) in ${targetLanguage}
- Use basic vocabulary appropriate for beginners
- Each line should contain EXACTLY ONE complete sentence
- Sentences should focus on characters, settings, and basic plot elements from ${title}
- DO NOT place multiple sentences on a single line
- Maintain natural language patterns in ${targetLanguage}
- Include a variety of sentence types (statements, questions, etc.)
- It's fine to create completely new sentences based on the work
- Avoid complex grammar or literary language

Format your response exactly as follows:

BEGIN_FOREIGN_SENTENCES
[One simplified sentence in ${targetLanguage}]
[One simplified sentence in ${targetLanguage}]
[One simplified sentence in ${targetLanguage}]
...more sentences...
END_FOREIGN_SENTENCES

BEGIN_TRANSLATED_SENTENCES
[Translation of first sentence in ${systemLanguage}]
[Translation of second sentence in ${systemLanguage}]
[Translation of third sentence in ${systemLanguage}]
...more translations...
END_TRANSLATED_SENTENCES

LANGUAGE: [two-letter ISO code for ${targetLanguage}]`
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
      console.log("Response received from Claude API");
      
      if (data.error) {
        console.error("Claude API error:", data.error);
        return null;
      }
      
      if (!data.content || data.content.length === 0) {
        console.error("No content in Claude API response");
        return null;
      }
      
      // Parse the response
      const fullResponse = data.content[0].text.trim();
      console.log("Response text:", fullResponse.substring(0, 200) + "...");
      
      const result = parseClaudeResponse(fullResponse);
      console.log("Parsed sentences count:", result.sentences.length);
      
      if (result.sentences.length === 0) {
        console.log("Full API response (for debugging):", fullResponse);
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching from Claude:", error);
      return null;
    }
  };
  
  // Parse Claude API response
  const parseClaudeResponse = (responseText) => {
    console.log("Parsing Claude response...");
    
    // Split the response into sections
    const foreignSectionMatch = responseText.match(/BEGIN_FOREIGN_SENTENCES\n([\s\S]*?)\nEND_FOREIGN_SENTENCES/);
    const translatedSectionMatch = responseText.match(/BEGIN_TRANSLATED_SENTENCES\n([\s\S]*?)\nEND_TRANSLATED_SENTENCES/);
    const languageMatch = responseText.match(/LANGUAGE:\s*([a-z]{2})/i);
    
    let foreignSentences = [];
    let translatedSentences = [];
    let language = 'en';
    
    // Extract foreign sentences
    if (foreignSectionMatch && foreignSectionMatch[1]) {
      foreignSentences = foreignSectionMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      console.log(`Found ${foreignSentences.length} foreign sentences`);
    } else {
      console.error("Could not find foreign sentences section");
      
      // Try alternate format - sometimes Claude might format without using the exact markers
      const altMatch = responseText.match(/foreign sentences[:\s]*\n([\s\S]*?)(?=\n\s*translated sentences|\n\s*begin_translated)/i);
      if (altMatch && altMatch[1]) {
        foreignSentences = altMatch[1]
          .split('\n')
          .map(line => line.trim().replace(/^\d+\.\s+/, '')) // Remove any numbering
          .filter(line => line.length > 0);
        console.log(`Found ${foreignSentences.length} foreign sentences using alternate parsing`);
      }
    }
    
    // Extract translated sentences
    if (translatedSectionMatch && translatedSectionMatch[1]) {
      translatedSentences = translatedSectionMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      console.log(`Found ${translatedSentences.length} translated sentences`);
    } else {
      console.error("Could not find translated sentences section");
      
      // Try alternate format
      const altMatch = responseText.match(/translated sentences[:\s]*\n([\s\S]*?)(?=\n\s*language:|\s*$)/i);
      if (altMatch && altMatch[1]) {
        translatedSentences = altMatch[1]
          .split('\n')
          .map(line => line.trim().replace(/^\d+\.\s+/, '')) // Remove any numbering
          .filter(line => line.length > 0);
        console.log(`Found ${translatedSentences.length} translated sentences using alternate parsing`);
      }
    }
    
    // Extract language code
    if (languageMatch && languageMatch[1]) {
      language = languageMatch[1].toLowerCase();
      console.log(`Detected language code: ${language}`);
    } else {
      console.warn("Could not find language code, defaulting to 'en'");
    }
    
    // Create paired sentences
    const sentences = [];
    const maxLength = Math.min(foreignSentences.length, translatedSentences.length);
    
    for (let i = 0; i < maxLength; i++) {
      sentences.push({
        original: foreignSentences[i],
        translation: translatedSentences[i]
      });
    }
    
    console.log(`Created ${sentences.length} paired sentences`);
    
    return {
      sentences,
      language
    };
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