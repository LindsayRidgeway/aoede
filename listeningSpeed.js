// listeningSpeed.js - Updated with enhanced debugging for iOS
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as Core from './listeningSpeedCore';
import { apiTextToSpeech } from './apiServices';

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of available voices
let availableVoices = null;
let languageInitialized = false; // Track if we've initialized voice data

// Cache for TTS voices by language
let cachedVoicesByLanguage = {}; 
// Set of all supported language codes (with regions)
let supportedVoiceLanguageCodes = new Set();

// Function to fetch available voices from Google TTS API
function fetchAvailableVoices() {
  if (!Core.GOOGLE_TTS_API_KEY) {
    return null;
  }

  try {
    // We're using a synchronous approach, so we'll return a promise that will be resolved later
	  if (__DEV__) console.log("FETCH 0010");
    const promise = fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${Core.GOOGLE_TTS_API_KEY}`
    )
    .then(response => {
      if (!response.ok) {
        return null;
      }
      return response.json();
    })
    .then(data => {
      return data.voices || null;
    })
    .catch(error => {
      return null;
    });
    
    return promise;
  } catch (error) {
    return Promise.resolve(null);
  }
}

// Initialize and cache voice list
export const initializeVoices = async () => {
  if (languageInitialized && availableVoices) {
    return availableVoices;
  }
  
  try {
    availableVoices = await fetchAvailableVoices();
    
    if (availableVoices && availableVoices.length > 0) {
      // Clear existing cache
      cachedVoicesByLanguage = {};
      supportedVoiceLanguageCodes.clear();
      
      // Process and categorize all voices
      for (const voice of availableVoices) {
        // Add all language codes to supported set
        voice.languageCodes.forEach(code => {
          supportedVoiceLanguageCodes.add(code);
          
          // Also add the base language code to our set for easy checking
          const baseCode = code.split('-')[0];
          supportedVoiceLanguageCodes.add(baseCode);
        });
        
        // Map voices by base language code for easier lookup
        for (const langCode of voice.languageCodes) {
          // Get base language code without region (e.g., 'en' from 'en-US')
          const baseCode = langCode.split('-')[0];
          
          if (!cachedVoicesByLanguage[baseCode]) {
            cachedVoicesByLanguage[baseCode] = [];
          }
          
          // Add this voice to the language's voice array
          cachedVoicesByLanguage[baseCode].push({
            ...voice,
            // Add the specific language code this voice was matched with
            matchedLanguageCode: langCode
          });
        }
      }
      
      languageInitialized = true;
    }
    
    return availableVoices;
  } catch (error) {
    return null;
  }
};

// Find a supported language code based on the input language
const findSupportedLanguageCode = (inputLanguage) => {
  if (!inputLanguage) return null;
  
  // Normalize to lowercase
  const normalizedCode = inputLanguage.toLowerCase().trim();
  
  // Check if this language is directly supported, either as a base code or with a region
  if (supportedVoiceLanguageCodes.has(normalizedCode)) {
    return normalizedCode;
  }
  
  // Check if we have any language codes that start with this base code
  const matchingCodes = Array.from(supportedVoiceLanguageCodes)
    .filter(code => code.toLowerCase().startsWith(normalizedCode + '-'));
  
  if (matchingCodes.length > 0) {
    return matchingCodes[0];
  }
  
  // Check if we have any voices specifically for this base language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    const firstVoice = cachedVoicesByLanguage[normalizedCode][0];
    return firstVoice.matchedLanguageCode;
  }
  
  // No match found - just return the input code
  return normalizedCode;
};

// Get the best voice for a language with the hybrid approach:
// 1. Try to find a Standard voice first (good for common languages)
// 2. If no Standard voice is found, use any available voice (for uncommon languages)
const getBestVoiceForLanguage = (languageCode) => {
  if (!languageCode) return null;
  
  // Normalize to lowercase
  const normalizedCode = languageCode.toLowerCase().trim();
  
  // Handle case where we don't have voices cached yet
  if (!cachedVoicesByLanguage || Object.keys(cachedVoicesByLanguage).length === 0) {
    return null;
  }
  
  // Check if we have any voices for this base language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    const voices = cachedVoicesByLanguage[normalizedCode];
    
    // First try to get Standard voices (filter out HD/Chirp/Studio voices)
    const standardVoices = voices.filter(voice => 
      !voice.name.includes('HD') && 
      !voice.name.includes('Chirp') &&
      !voice.name.includes('Studio')
    );
    
    // If Standard voices are available, use them
    if (standardVoices.length > 0) {
      // Prefer female Standard voices when available
      const femaleStandardVoices = standardVoices.filter(
        voice => voice.ssmlGender === 'FEMALE'
      );
      
      if (femaleStandardVoices.length > 0) {
        return {
          name: femaleStandardVoices[0].name,
          languageCode: femaleStandardVoices[0].matchedLanguageCode
        };
      }
      
      // Fall back to any Standard voice
      return {
        name: standardVoices[0].name,
        languageCode: standardVoices[0].matchedLanguageCode
      };
    }
    
    // If no Standard voices are found, try any voice (for uncommon languages)
    // Prefer female voices when available
    const femaleVoices = voices.filter(
      voice => voice.ssmlGender === 'FEMALE'
    );
    
    if (femaleVoices.length > 0) {
      return {
        name: femaleVoices[0].name,
        languageCode: femaleVoices[0].matchedLanguageCode
      };
    }
    
    // Last resort: use any available voice
    return {
      name: voices[0].name,
      languageCode: voices[0].matchedLanguageCode
    };
  }
  
  // Return null if no match found
  return null;
};

// Export storage functions
export const getStoredStudyLanguage = async () => {
  try {
    const storedStudyLanguage = await AsyncStorage.getItem("studyLanguage");
    const storedLanguageCode = await AsyncStorage.getItem("studyLanguageCode");

    if (storedLanguageCode) {
      detectedLanguageCode = storedLanguageCode; // Cache the stored code
    }

    return storedStudyLanguage ? storedStudyLanguage : "";
  } catch (error) {
    return "";
  }
};

export const saveStudyLanguage = async (language) => {
  try {
    await AsyncStorage.setItem("studyLanguage", language);

    // Store the language code directly
    if (language && language.length > 0) {
      detectedLanguageCode = language;
      await AsyncStorage.setItem("studyLanguageCode", language);
    }
  } catch (error) {
    // Handle silently
  }
};

// Get stored listening speed with better default handling
export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    if (storedListeningSpeed !== null) {
      const speed = parseInt(storedListeningSpeed, 10);
      // Ensure it's a valid value (1-5)
      if (speed >= 1 && speed <= 5) {
        return speed;
      }
    }
    return 3; // Default to middle speed (3)
  } catch (error) {
    return 3; // Default to middle speed (3) on error
  }
};

// Save listening speed with validation
export const saveListeningSpeed = async (speed) => {
  try {
    // Ensure we save a clean integer value between 1-5
    const integerSpeed = Math.max(1, Math.min(5, parseInt(speed, 10) || 3));
    await AsyncStorage.setItem("listeningSpeed", integerSpeed.toString());
    return true;
  } catch (error) {
    return false;
  }
};

// Export storage functions from core
export const { 
  updateSpeechRate, 
  stopSpeaking 
} = Core;

// Process text for articulation
const processTextForArticulation = (text, articulationEnabled) => {
  if (!articulationEnabled || !text) {
    return text;
  }

  // Replace spaces between words with commas followed by space
  // const processedText = text.replace(/(\w)(\s)(\w)/g, '$1, $3');
  return text.split(/\s+/).join(', ');
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish, articulation = false) => {
  if (!sentence) {
    if (onFinish) onFinish();
    return;
  }
  
  // Process the sentence for articulation if needed
  const processedSentence = processTextForArticulation(sentence, articulation);
  
  // Configure audio session
  await Core.configureAudioSession();

  // Stop any currently playing audio first
  await Core.stopSpeaking();

  // Ensure voices are initialized - but don't await it
  if (!languageInitialized || !availableVoices) {
    initializeVoices();
  }

  // Map button numbers (1-5) to specific speaking rates
  const speedScale = [0.5, 0.75, 1.0, 1.25, 1.5];
  
  // Make sure the button index is a clean integer between 1-5
  const buttonIndex = parseInt(listeningSpeed, 10) || 3; // Default to 3 (normal speed) if parsing fails
  
  // Convert to 0-based array index (0-4), with bounds checking
  const speedIndex = Math.max(0, Math.min(4, buttonIndex - 1));
  
  // Get the speaking rate from our scale
  const speakingRate = speedScale[speedIndex];
  
  // Find the best voice for this language using our hybrid approach
  const bestVoice = getBestVoiceForLanguage(detectedLanguageCode);
  
  // If we found a voice, use its matched language code
  let ttsLanguageCode = null;
  let voiceName = null;
  
  if (bestVoice) {
    ttsLanguageCode = bestVoice.languageCode;
    voiceName = bestVoice.name;
  } else {
    // No voice found, try to find a supported language code
    ttsLanguageCode = findSupportedLanguageCode(detectedLanguageCode);
  }
  
  // If we still don't have a language code, use what we have
  if (!ttsLanguageCode && detectedLanguageCode) {
    ttsLanguageCode = detectedLanguageCode;
  } else if (!ttsLanguageCode) {
    ttsLanguageCode = "en-US";
  }

  try {
    // First attempt: with voice name and speaking rate
    let audioContent = await apiTextToSpeech(
      processedSentence,
      ttsLanguageCode,
      speakingRate,
      voiceName,
      "FEMALE"
    );
    
    // Second attempt: with speaking rate but no voice name
    if (!audioContent && voiceName) {
      if (__DEV__) console.log("First TTS attempt failed, trying without voice name");
      audioContent = await apiTextToSpeech(
        processedSentence,
        ttsLanguageCode,
        speakingRate,
        null,
        "FEMALE"
      );
    }
    
    // Third attempt: with default rate (1.0) and no voice name
    if (!audioContent && (speakingRate !== 1.0 || voiceName)) {
      if (__DEV__) console.log("Second TTS attempt failed, trying with default settings");
      audioContent = await apiTextToSpeech(
        processedSentence,
        ttsLanguageCode,
        1.0,
        null,
        "FEMALE"
      );
    }
    
    if (!audioContent) {
      if (__DEV__) console.log("All TTS attempts failed");
      if (onFinish) onFinish();
      return;
    }
    
    // Play the audio content
    await Core.playAudioFromBase64(audioContent, onFinish);
  } catch (error) {
    if (__DEV__) console.log(`Error in speakSentenceWithPauses: ${error.message}`);
    if (onFinish) onFinish();
  }
};

// Add a default export with all functions
export default {
  getStoredListeningSpeed,
  getStoredStudyLanguage,
  saveStudyLanguage,
  saveListeningSpeed,
  updateSpeechRate,
  stopSpeaking,
  speakSentenceWithPauses,
  initializeVoices,
  detectedLanguageCode
};