import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNextBookSection, getAllBookText, translateText } from './api';

// Import state variables from App.js to maintain shared state
import { 
  sourceText, sentences, currentSentenceIndex, adaptiveSentences, 
  currentAdaptiveIndex, tooHardWords, isLoadingNextSection, needsMoreContent 
} from './App';

// Split text into sentences
export const splitIntoSentences = (text) => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
};

// Helper function to translate and set sentences in both languages
export const translateAndSetSentences = async (sentence, sourceLang, setStudyLangSentence, setNativeLangSentence) => {
  try {
    if (!sentence || sentence.trim() === "") {
      return;
    }
    
    // Get the detected language code from listeningSpeed.js
    const { detectedLanguageCode } = require('./listeningSpeed');
    
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
    console.error("Error translating sentence:", error);
    setStudyLangSentence("Error translating sentence.");
    setNativeLangSentence("Error translating sentence.");
  }
};

// Save current state
export const saveCurrentState = async () => {
  try {
    await AsyncStorage.setItem('tooHardWords', JSON.stringify(Array.from(tooHardWords)));
    await AsyncStorage.setItem('currentSentenceIndex', currentSentenceIndex.toString());
    await AsyncStorage.setItem('adaptiveSentences', JSON.stringify(adaptiveSentences));
    await AsyncStorage.setItem('currentAdaptiveIndex', currentAdaptiveIndex.toString());
  } catch (error) {
    console.error("Error saving current state:", error);
  }
};

// Background loading of additional book sections
export const startBackgroundLoading = async (setLoadProgress) => {
  try {
    // Check if we're already loading
    if (isLoadingNextSection) return;
    
    global.isLoadingNextSection = true;
    setLoadProgress(prev => ({ ...prev, loading: true }));
    
    // Get how many sections we already have
    const storedSectionsStr = await AsyncStorage.getItem('bookSections');
    const sectionsCount = storedSectionsStr ? JSON.parse(storedSectionsStr).length : 0;
    
    setLoadProgress(prev => ({ ...prev, sections: sectionsCount }));
    
    // Check if we need more content
    const shouldLoadMore = !needsMoreContent && currentSentenceIndex > (sentences.length * 0.7);
    
    if (shouldLoadMore || needsMoreContent) {
      // Load the next section
      const nextSection = await fetchNextBookSection();
      
      if (nextSection && nextSection.text) {
        // Get all sections and update our text
        const allText = await getAllBookText();
        global.sourceText = allText.text;
        
        // Update sentences array with new content
        global.sentences = splitIntoSentences(allText.text);
        
        // Update sections count
        const updatedSectionsStr = await AsyncStorage.getItem('bookSections');
        const updatedCount = updatedSectionsStr ? JSON.parse(updatedSectionsStr).length : 0;
        setLoadProgress(prev => ({ ...prev, sections: updatedCount }));
        
        // Save state
        await saveCurrentState();
        
        // Reset flag
        global.needsMoreContent = false;
      } else {
        // No more content available
        setLoadProgress(prev => ({ ...prev, complete: true }));
      }
    }
  } catch (error) {
    console.error("Error loading additional sections:", error);
  } finally {
    global.isLoadingNextSection = false;
    setLoadProgress(prev => ({ ...prev, loading: false }));
  }
};

// Generate adaptive sentences from a single source sentence
export const generateAdaptiveSentences = async (sourceSentence, tooHardWords, openaiKey) => {
  try {
    if (!sourceSentence || sourceSentence.trim() === "") {
      return [];
    }
    
    // If we have no too-hard words, just return the source sentence
    // But still apply the 6-word limit rule if it's a long sentence
    if (tooHardWords.size === 0) {
      const words = sourceSentence.split(/\s+/);
      if (words.length <= 6) {
        return [sourceSentence];
      } else {
        // Break the sentence into chunks of about 6 words
        const chunks = [];
        for (let i = 0; i < words.length; i += 6) {
          chunks.push(words.slice(i, i + 6).join(' '));
        }
        return chunks;
      }
    }
    
    // Check if the sentence already fits our criteria (0-1 too-hard words)
    const words = sourceSentence.split(/\s+/);
    const tooHardWordsCount = words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
      return cleanWord.length > 0 && tooHardWords.has(cleanWord);
    }).length;
    
    // If the source sentence is short (≤ 6 words) and has 0-1 too-hard words, use it directly
    if (words.length <= 6 && tooHardWordsCount <= 1) {
      return [sourceSentence];
    }
    
    // Otherwise, use AI to generate adaptive sentences
    return await generateAdaptiveSentencesWithAI(sourceSentence, tooHardWords, openaiKey);
  } catch (error) {
    // If anything goes wrong, return the original sentence
    console.error("Error generating adaptive sentences:", error);
    return [sourceSentence];
  }
};

// Generate adaptive sentences using AI
const generateAdaptiveSentencesWithAI = async (sourceSentence, tooHardWords, openaiKey) => {
  const tooHardWordsArray = Array.from(tooHardWords);
  
  const prompt = `
    Generate simpler sentences for a language learner. The original sentence is:
    "${sourceSentence}"
    
    These words are TOO DIFFICULT for the learner:
    ${tooHardWordsArray.join(', ')}
    
    Rules:
    1. Create very short, simple sentences of 6 words or fewer
    2. Each sentence should have AT MOST ONE difficult word
    3. Keep the original meaning but simplify vocabulary and grammar
    4. Break the sentence into multiple simpler sentences if needed
    5. Return ONLY the simplified sentences with no explanations
  `;
  
  try {
    // Call the AI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You simplify sentences for language learners. Create very short, simple sentences with basic grammar."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from AI");
    }
    
    // Split the response into separate sentences
    const adaptiveText = data.choices[0].message.content.trim();
    const adaptives = adaptiveText.split(/\n+/).filter(s => s.trim().length > 0);
    
    // If we get no valid sentences back, do a simple split
    if (adaptives.length === 0) {
      const words = sourceSentence.split(/\s+/);
      const chunks = [];
      for (let i = 0; i < words.length; i += 6) {
        chunks.push(words.slice(i, i + 6).join(' '));
      }
      return chunks;
    }
    
    // Verify that all adaptive sentences are 6 words or fewer
    const verifiedAdaptives = adaptives.flatMap(sentence => {
      const sentenceWords = sentence.split(/\s+/);
      // If more than 6 words, break it down further
      if (sentenceWords.length > 6) {
        const chunks = [];
        for (let i = 0; i < sentenceWords.length; i += 6) {
          chunks.push(sentenceWords.slice(i, i + 6).join(' '));
        }
        return chunks;
      }
      return sentence;
    });
    
    return verifiedAdaptives;
  } catch (error) {
    console.error("Error fetching from AI:", error);
    
    // Fall back to simple mechanical chunking
    const words = sourceSentence.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += 6) {
      chunks.push(words.slice(i, i + 6).join(' '));
    }
    return chunks;
  }
};