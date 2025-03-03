import React, { useState, useEffect } from 'react';

import { MainUI } from './UI';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { getStoredStudyLanguage, detectLanguageCode, detectedLanguageCode } from './listeningSpeed'; 
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";

// State variables for adaptive sentence generation
let sourceText = "";
let currentSentenceIndex = 0;
let sentences = [];
let knownWords = new Set(); // This actually tracks words that are TOO HARD for the user
let adaptiveSentences = [];
let currentAdaptiveIndex = 0;

// OpenAI key from config
const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); // Sentence in study language
  const [nativeLangSentence, setNativeLangSentence] = useState(""); // Sentence in user's native language
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [knownWordsList, setKnownWordsList] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newWordsList, setNewWordsList] = useState([]);
  
  useEffect(() => {
    const initialize = async () => {
      translateLabels(setUiText);
      loadStoredSettings(setUserQuery, setSpeechRate);
      
      // Load study language first - critical for initial translations
      const language = await getStoredStudyLanguage();
      setStudyLanguage(language);
      await detectLanguageCode(language);
      
      // Load too hard words
      try {
        const savedTooHardWords = await AsyncStorage.getItem('tooHardWords');
        if (savedTooHardWords) {
          const parsedWords = JSON.parse(savedTooHardWords);
          knownWords = new Set(parsedWords);
          setKnownWordsList(parsedWords);
        }
        
        // Load source text and language if available
        const savedSourceText = await AsyncStorage.getItem('sourceText');
        const savedSourceLang = await AsyncStorage.getItem('sourceLanguage');
        
        if (savedSourceText && savedSourceLang) {
          sourceText = savedSourceText;
          setSourceLanguage(savedSourceLang);
          sentences = splitIntoSentences(sourceText);
          
          // Load current position
          const savedIndex = await AsyncStorage.getItem('currentSentenceIndex');
          if (savedIndex) {
            currentSentenceIndex = parseInt(savedIndex, 10);
          }
          
          // Load adaptive sentences if available
          const savedAdaptiveSentences = await AsyncStorage.getItem('adaptiveSentences');
          const savedAdaptiveIndex = await AsyncStorage.getItem('currentAdaptiveIndex');
          
          if (savedAdaptiveSentences) {
            adaptiveSentences = JSON.parse(savedAdaptiveSentences);
            if (savedAdaptiveIndex) {
              currentAdaptiveIndex = parseInt(savedAdaptiveIndex, 10);
            }
            
            // If we have adaptive sentences, use them
            if (adaptiveSentences.length > 0 && currentAdaptiveIndex < adaptiveSentences.length) {
              // Get the current adaptive sentence
              const adaptiveSentence = adaptiveSentences[currentAdaptiveIndex];
              await translateAndSetSentences(adaptiveSentence, savedSourceLang);
            } else {
              // Otherwise, generate new adaptive sentences
              await handleNextSentence();
            }
          } else if (sentences.length > 0) {
            // No adaptive sentences yet, but we have source sentences
            await handleNextSentence();
          }
        }
      } catch (error) {
        // Handle silently
      }
    };
    
    initialize();
  }, []);

  // Extract new words from current sentence
  useEffect(() => {
    if (studyLangSentence) {
      // Extract words from the sentence
      const words = studyLangSentence
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Filter to only show words that haven't been marked as too hard
      const lowerCaseTooHardWords = new Set(knownWordsList.map(w => w.toLowerCase()));
      const newWords = words.filter(word => 
        !lowerCaseTooHardWords.has(word.toLowerCase())
      );
      
      // Update new words list
      setNewWordsList([...new Set(newWords)]);
    }
  }, [studyLangSentence, knownWordsList]);
  
  // Helper function to translate and set sentences in both languages
  const translateAndSetSentences = async (sentence, sourceLang) => {
    try {
      // Translate to study language
      const studyLangCode = detectedLanguageCode || "en";
      if (sourceLang !== studyLangCode) {
        const translatedToStudy = await translateText(sentence, sourceLang, studyLangCode);
        setStudyLangSentence(translatedToStudy.replace(/^"|"$/g, ""));
      } else {
        setStudyLangSentence(sentence);
      }
      
      // Translate to user's native language
      const nativeLang = navigator.language.split('-')[0] || "en";
      if (sourceLang !== nativeLang) {
        const translatedToNative = await translateText(sentence, sourceLang, nativeLang);
        setNativeLangSentence(translatedToNative.replace(/^"|"$/g, ""));
      } else {
        setNativeLangSentence(sentence);
      }
    } catch (error) {
      setStudyLangSentence("Error translating sentence.");
      setNativeLangSentence("Error translating sentence.");
    }
  };
  
  // Split text into sentences
  const splitIntoSentences = (text) => {
    return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
  };
  
  // Toggle speak function
  const toggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakSentenceWithPauses(studyLangSentence, listeningSpeed, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };
  
  // Save current state
  const saveCurrentState = async () => {
    try {
      await AsyncStorage.setItem('tooHardWords', JSON.stringify(Array.from(knownWords)));
      await AsyncStorage.setItem('sourceText', sourceText);
      await AsyncStorage.setItem('currentSentenceIndex', currentSentenceIndex.toString());
      await AsyncStorage.setItem('sourceLanguage', sourceLanguage);
      await AsyncStorage.setItem('adaptiveSentences', JSON.stringify(adaptiveSentences));
      await AsyncStorage.setItem('currentAdaptiveIndex', currentAdaptiveIndex.toString());
    } catch (error) {
      // Handle silently
    }
  };
  
  // Generate adaptive sentences from a single source sentence
  const generateAdaptiveSentences = async (sourceSentence) => {
    try {
      // If we have no too-hard words, just return the source sentence
      // But still apply the 6-word limit rule if it's a long sentence
      if (knownWords.size === 0) {
        const words = sourceSentence.split(/\s+/);
        if (words.length <= 6) {
          return [sourceSentence];
        } else {
          // Break the sentence into chunks of about 6 words
          return await breakIntoMeaningfulChunks(sourceSentence);
        }
      }
      
      // Check if the sentence already fits our criteria (0-1 unknown words)
      const words = sourceSentence.split(/\s+/);
      const tooHardWordsCount = words.filter(word => {
        const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
        return cleanWord.length > 0 && knownWords.has(cleanWord);
      }).length;
      
      // If the source sentence is short (≤ 6 words) and has 0-1 too-hard words, use it directly
      if (words.length <= 6 && tooHardWordsCount <= 1) {
        return [sourceSentence];
      }
      
      // Otherwise, use AI to generate adaptive sentences
      const adaptiveSentences = await generateAdaptiveSentencesWithAI(sourceSentence);
      return adaptiveSentences;
    } catch (error) {
      // If anything goes wrong, return the original sentence
      console.error("Error generating adaptive sentences:", error);
      return [sourceSentence];
    }
  };
  
  // Break a long sentence into meaningful chunks using AI
  const breakIntoMeaningfulChunks = async (sentence) => {
    try {
      const prompt = `
        You are helping a language learner by breaking a long sentence into shorter, meaningful chunks.
        
        Original sentence: "${sentence}"
        
        Please break this sentence into multiple shorter sentences that:
        1. Each have about 6 words or fewer
        2. Maintain the meaning of the original sentence
        3. Are grammatically correct
        4. Preserve the original sentence structure where possible (don't default to SVO)
        5. Cover all important information from the original
        
        Return ONLY the simplified sentences separated by line breaks. Do not include any explanation.
      `;
      
      // Call the AI API
      const chunkedText = await fetchFromAI(prompt);
      
      // Split the response into separate sentences
      const chunks = chunkedText.split(/\n+/).filter(s => s.trim().length > 0);
      
      return chunks.length > 0 ? chunks : [sentence];
    } catch (error) {
      // If anything goes wrong, do a simple mechanical chunking
      const words = sentence.split(/\s+/);
      const chunks = [];
      for (let i = 0; i < words.length; i += 6) {
        chunks.push(words.slice(i, i + 6).join(' '));
      }
      return chunks;
    }
  };
  
  // Generate adaptive sentences using AI
  const generateAdaptiveSentencesWithAI = async (sourceSentence) => {
    const tooHardWordsArray = Array.from(knownWords);
    
    // Limit the number of too-hard words to avoid overloading the API
    const limitedTooHardWords = tooHardWordsArray.slice(0, 100);
    
    const prompt = `
      You are helping a language learner by generating simplified sentences for listening practice.
      
      Here is the list of words the user finds TOO DIFFICULT:
      ${limitedTooHardWords.join(', ')}${tooHardWordsArray.length > 100 ? ' [and more...]' : ''}
      
      Original sentence: "${sourceSentence}"
      
      Please adapt this sentence according to these rules:
      1. Break the original sentence into multiple simpler sentences if needed
      2. Each sentence should contain AT MOST ONE difficult word (from the too-difficult words list)
      3. If a sentence has a difficult word, it should be no longer than 6 words total
      4. Preserve the original sentence structure and style where possible (don't default to SVO)
      5. You may simplify difficult words when necessary
      6. DO NOT create sentences in SVO (Subject-Verb-Object) format unless the original was in that format
      7. Make sure all the important information from the original sentence is preserved
      8. Each sentence should be grammatically correct and meaningful
      
      Return ONLY the simplified sentence(s) separated by line breaks. Do not include any explanation or commentary.
    `;
    
    // Call the AI API
    const adaptiveText = await fetchFromAI(prompt);
    
    // Split the response into separate sentences
    const adaptives = adaptiveText.split(/\n+/).filter(s => s.trim().length > 0);
    
    if (adaptives.length === 0) {
      return [sourceSentence];
    }
    
    return adaptives;
  };
  
  // Make API call to get adaptive sentences from AI
  const fetchFromAI = async (prompt) => {
    try {
      const requestBody = {
        model: "gpt-3.5-turbo", // Using GPT-3.5 for cost efficiency
        messages: [
          { role: "system", content: "You are a language learning assistant that simplifies sentences for beginners. Your goal is to create very simple, short sentences with at most one difficult word per sentence." },
          { role: "user", content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.3 // Lower temperature for more consistent results
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response from AI");
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error fetching from AI:", error);
      throw error;
    }
  };
  
  // Handle book loading
  const handleLoadBook = async () => {
    if (!userQuery) return;
    
    setLoadingBook(true);
    
    try {
      // Fetch book text
      const { text, language } = await fetchBookTextFromChatGPT(userQuery);
      
      // Set source text and language
      sourceText = text;
      const sourceLang = language || "en";
      setSourceLanguage(sourceLang);
      
      // Split into sentences
      sentences = splitIntoSentences(sourceText);
      currentSentenceIndex = 0;
      
      // Reset adaptive sentences
      adaptiveSentences = [];
      currentAdaptiveIndex = 0;
      
      // Save state
      await saveCurrentState();
      
      // Generate first adaptive sentence
      if (sentences.length > 0) {
        await handleNextSentence();
      } else {
        setStudyLangSentence("No content available.");
        setNativeLangSentence("No content available.");
      }
    } catch (error) {
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle next sentence
  const handleNextSentence = async () => {
    if (sentences.length === 0) {
      setStudyLangSentence("No content available. Please load a book.");
      setNativeLangSentence("No content available. Please load a book.");
      return;
    }
    
    setLoadingBook(true);
    
    try {
      // Check if we have more adaptive sentences for the current source sentence
      if (adaptiveSentences.length > 0 && currentAdaptiveIndex < adaptiveSentences.length - 1) {
        // If so, increment the adaptive index and show the next adaptive sentence
        currentAdaptiveIndex++;
        const adaptiveSentence = adaptiveSentences[currentAdaptiveIndex];
        
        // Save state
        await saveCurrentState();
        
        // Translate and display
        await translateAndSetSentences(adaptiveSentence, sourceLanguage);
      } else {
        // We've finished the current adaptive sentences, move to the next source sentence
        if (currentSentenceIndex < sentences.length) {
          const nextSourceSentence = sentences[currentSentenceIndex];
          currentSentenceIndex++;
          
          // Generate adaptive sentences for this source sentence
          adaptiveSentences = await generateAdaptiveSentences(nextSourceSentence);
          currentAdaptiveIndex = 0;
          
          // Save state
          await saveCurrentState();
          
          // Translate and display the first adaptive sentence
          if (adaptiveSentences.length > 0) {
            await translateAndSetSentences(adaptiveSentences[0], sourceLanguage);
          } else {
            // Fallback if no adaptive sentences were generated
            await translateAndSetSentences(nextSourceSentence, sourceLanguage);
          }
        } else {
          // We've reached the end of the source text, loop back to the beginning
          currentSentenceIndex = 0;
          
          if (sentences.length > 0) {
            // Generate adaptive sentences for the first source sentence
            const firstSourceSentence = sentences[0];
            adaptiveSentences = await generateAdaptiveSentences(firstSourceSentence);
            currentAdaptiveIndex = 0;
            
            // Save state
            await saveCurrentState();
            
            // Translate and display the first adaptive sentence
            if (adaptiveSentences.length > 0) {
              await translateAndSetSentences(adaptiveSentences[0], sourceLanguage);
            } else {
              await translateAndSetSentences(firstSourceSentence, sourceLanguage);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in handleNextSentence:", error);
      setStudyLangSentence("Error generating sentence.");
      setNativeLangSentence("Error generating sentence.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle word feedback
  const handleWordFeedback = async (words, isTooHard) => {
    if (isTooHard) {
      // Add words to too-hard words list
      words.forEach(word => knownWords.add(word.toLowerCase()));
    } else {
      // Remove words from too-hard words list
      words.forEach(word => knownWords.delete(word.toLowerCase()));
    }
    
    // Update state
    setKnownWordsList(Array.from(knownWords));
    await saveCurrentState();
  };

  // Clear history
  const clearHistory = async () => {
    setShowConfirmation(true);
  };

  // Confirm clear history
  const confirmClearHistory = async () => {
    try {
      // Clear too-hard words
      knownWords.clear();
      setKnownWordsList([]);
      
      // Also clear history words in AsyncStorage
      await AsyncStorage.removeItem('historyWords');
      
      // Reset adaptive sentences
      adaptiveSentences = [];
      currentAdaptiveIndex = 0;
      
      // Save state
      await saveCurrentState();
      
      // Close confirmation dialog
      setShowConfirmation(false);
      
      // Regenerate current sentence
      if (sentences.length > 0) {
        // Reset to beginning of current sentence's adaptive sentences
        const currentSourceIndex = Math.max(0, currentSentenceIndex - 1);
        const currentSourceSentence = sentences[currentSourceIndex];
        
        // Generate new adaptive sentences
        adaptiveSentences = await generateAdaptiveSentences(currentSourceSentence);
        currentAdaptiveIndex = 0;
        
        // Save state
        await saveCurrentState();
        
        // Display the first adaptive sentence
        if (adaptiveSentences.length > 0) {
          await translateAndSetSentences(adaptiveSentences[0], sourceLanguage);
        } else {
          await translateAndSetSentences(currentSourceSentence, sourceLanguage);
        }
      }
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  // Cancel clear history
  const cancelClearHistory = () => {
    setShowConfirmation(false);
  };
  
  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
      loadBook={handleLoadBook}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}
      speakSentence={toggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      onWordFeedback={handleWordFeedback}
      knownWords={knownWordsList}
      newWords={newWordsList}
      clearHistory={clearHistory}
      showConfirmation={showConfirmation}
      confirmClearHistory={confirmClearHistory}
      cancelClearHistory={cancelClearHistory}
    />
  );
}