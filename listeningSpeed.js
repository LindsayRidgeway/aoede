// listeningSpeed.js - Updated with enhanced debugging for iOS
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as Core from './listeningSpeedCore';

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
    Core.log("No Google API key found");
    return null;
  }

  try {
    // We're using a synchronous approach, so we'll return a promise that will be resolved later
    const promise = fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${Core.GOOGLE_TTS_API_KEY}`
    )
    .then(response => {
      if (!response.ok) {
        Core.log(`Failed to fetch voices: ${response.status} ${response.statusText}`);
        return null;
      }
      return response.json();
    })
    .then(data => {
      return data.voices || null;
    })
    .catch(error => {
      Core.log(`Error fetching voices: ${error.message}`);
      return null;
    });
    
    return promise;
  } catch (error) {
    Core.log(`Error in fetchAvailableVoices: ${error.message}`);
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
      Core.log(`Voice initialization complete. Found ${availableVoices.length} voices.`);
    }
    
    return availableVoices;
  } catch (error) {
    Core.log(`Error initializing voices: ${error.message}`);
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
    Core.log(`Saved listening speed: ${integerSpeed}`);
    return true;
  } catch (error) {
    Core.log(`Error saving listening speed: ${error.message}`);
    return false;
  }
};

// Export storage functions from core
export const { 
  updateSpeechRate, 
  stopSpeaking 
} = Core;

// Get debug state for debugging panel
export const getDebugState = () => Core.debugState;

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish) => {
  if (!sentence) {
    if (onFinish) onFinish();
    return;
  }

  // Reset debug state for this new speech request
  Object.assign(Core.debugState, {
    lastApiRequest: null,
    lastApiResponse: null,
    lastAudioUri: null,
    lastError: null,
    soundLoadAttempts: 0,
    playbackStatus: null,
    startTime: new Date().toISOString(),
    sentence: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : '')
  });
  
  Core.log(`Starting TTS for sentence: "${sentence.substring(0, 30)}..." with speed: ${listeningSpeed}`);

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
  Core.log(`Button index: ${buttonIndex} (parsed from ${listeningSpeed})`);
  
  // Convert to 0-based array index (0-4), with bounds checking
  const speedIndex = Math.max(0, Math.min(4, buttonIndex - 1));
  
  // Get the speaking rate from our scale
  const speakingRate = speedScale[speedIndex];
  Core.log(`Speaking rate: ${speakingRate} (from button index ${buttonIndex})`);
  
  // Find the best voice for this language using our hybrid approach
  const bestVoice = getBestVoiceForLanguage(detectedLanguageCode);
  
  // If we found a voice, use its matched language code
  let ttsLanguageCode = null;
  let voiceName = null;
  
  if (bestVoice) {
    ttsLanguageCode = bestVoice.languageCode;
    voiceName = bestVoice.name;
    Core.log(`Selected voice: ${voiceName} for language code: ${ttsLanguageCode}`);
  } else {
    // No voice found, try to find a supported language code
    ttsLanguageCode = findSupportedLanguageCode(detectedLanguageCode);
    Core.log(`No specific voice found, using language code: ${ttsLanguageCode}`);
  }
  
  // If we still don't have a language code, use what we have
  if (!ttsLanguageCode && detectedLanguageCode) {
    ttsLanguageCode = detectedLanguageCode;
    Core.log(`Using detected language code directly: ${ttsLanguageCode}`);
  } else if (!ttsLanguageCode) {
    ttsLanguageCode = "en-US";
    Core.log(`No language code available, defaulting to: ${ttsLanguageCode}`);
  }

  try {
    // Check if we have a Google API key before attempting the API call
    if (!Core.GOOGLE_TTS_API_KEY) {
      Core.log("No Google API key found");
      Core.debugState.lastError = {
        type: 'MissingAPIKey',
        message: 'No Google API key available',
        time: new Date().toISOString()
      };
      
      if (onFinish) onFinish();
      return;
    }

    // Preparing TTS request body
    const requestBody = {
      input: { text: sentence },
      voice: { 
        languageCode: ttsLanguageCode,
        ssmlGender: "FEMALE"
      },
      audioConfig: { 
        audioEncoding: "MP3",
        speakingRate: speakingRate
      }
    };
    
    // If we have a specific voice name, use it
    if (voiceName) {
      requestBody.voice.name = voiceName;
    }
    
    Core.log(`Sending TTS API request`);
    // Store request without sensitive info in debug state
    Core.debugState.lastApiRequest = {
      inputTextLength: sentence.length,
      languageCode: ttsLanguageCode,
      ssmlGender: "FEMALE",
      speakingRate: speakingRate,
      hasVoiceName: !!voiceName
    };

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${Core.GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
    
    Core.log(`TTS API response status: ${response.status}`);
    Core.debugState.apiResponseStatus = response.status;

    if (!response.ok) {
      Core.log(`API request failed with status: ${response.status}`);
      
      // We'll try a simplified request if the first one fails
      Core.log('Attempting simplified TTS request without speed control');
      
      // If the first request failed, try without speed control
      const simplifiedBody = {
        input: { text: sentence },
        voice: { 
          languageCode: ttsLanguageCode,
          ssmlGender: "FEMALE"
        },
        audioConfig: { 
          audioEncoding: "MP3"
        }
      };
      
      // Keep the voice name if we had one
      if (voiceName) {
        simplifiedBody.voice.name = voiceName;
      }
      
      Core.log(`Sending simplified TTS API request`);
      // Store simplified request without sensitive info
      Core.debugState.lastSimplifiedRequest = {
        inputTextLength: sentence.length,
        languageCode: ttsLanguageCode,
        ssmlGender: "FEMALE",
        hasVoiceName: !!voiceName
      };
      
      const retryResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${Core.GOOGLE_TTS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(simplifiedBody),
        }
      );
      
      Core.log(`Simplified TTS API response status: ${retryResponse.status}`);
      Core.debugState.simplifiedResponseStatus = retryResponse.status;
      
      if (!retryResponse.ok) {
        Core.log(`Simplified API request also failed with status: ${retryResponse.status}`);
        
        // If that fails too, try one last approach without specific voice name
        if (voiceName) {
          Core.log('Final attempt: TTS request without specific voice name');
          
          const lastAttemptBody = {
            input: { text: sentence },
            voice: { 
              languageCode: ttsLanguageCode,
              ssmlGender: "FEMALE"
            },
            audioConfig: { 
              audioEncoding: "MP3"
            }
          };
          
          Core.log(`Sending final TTS API request`);
          // Store final request without sensitive info
          Core.debugState.lastFinalRequest = {
            inputTextLength: sentence.length,
            languageCode: ttsLanguageCode,
            ssmlGender: "FEMALE",
            hasVoiceName: false
          };
          
          const lastResponse = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${Core.GOOGLE_TTS_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lastAttemptBody),
            }
          );
          
          Core.log(`Final TTS API response status: ${lastResponse.status}`);
          Core.debugState.finalResponseStatus = lastResponse.status;
          
          if (!lastResponse.ok) {
            Core.log(`All TTS API requests failed`);
            Core.debugState.lastError = {
              type: 'AllAPIRequestsFailed',
              status: lastResponse.status,
              message: 'All API requests failed',
              time: new Date().toISOString()
            };
            
            if (onFinish) onFinish();
            return;
          }
          
          const lastData = await lastResponse.json();
          Core.debugState.lastApiResponse = {
            hasAudioContent: !!lastData.audioContent,
            audioContentLength: lastData.audioContent ? lastData.audioContent.length : 0
          };
          
          if (!lastData.audioContent) {
            Core.log('Final API response has no audio content');
            Core.debugState.lastError = {
              type: 'NoAudioContent',
              message: 'Final API response has no audio content',
              time: new Date().toISOString()
            };
            
            if (onFinish) onFinish();
            return;
          }
          
          // Play the audio from final attempt
          await Core.playAudioFromBase64(lastData.audioContent, onFinish);
          return;
        }
        
        // If we've tried everything and still failed
        Core.log('All API requests failed after exhausting all options');
        Core.debugState.lastError = {
          type: 'AllOptionsExhausted',
          message: 'All API requests failed after trying all options',
          time: new Date().toISOString()
        };
        
        if (onFinish) onFinish();
        return;
      }
      
      const retryData = await retryResponse.json();
      Core.debugState.lastApiResponse = {
        hasAudioContent: !!retryData.audioContent,
        audioContentLength: retryData.audioContent ? retryData.audioContent.length : 0
      };
      
      if (!retryData.audioContent) {
        Core.log('Simplified API response has no audio content');
        Core.debugState.lastError = {
          type: 'NoAudioContent',
          message: 'Simplified API response has no audio content',
          time: new Date().toISOString()
        };
        
        if (onFinish) onFinish();
        return;
      }
      
      // Play the audio from simplified response
      await Core.playAudioFromBase64(retryData.audioContent, onFinish);
      return;
    }

    const data = await response.json();
    Core.debugState.lastApiResponse = {
      hasAudioContent: !!data.audioContent,
      audioContentLength: data.audioContent ? data.audioContent.length : 0
    };
    
    if (!data.audioContent) {
      Core.log('API response has no audio content');
      Core.debugState.lastError = {
        type: 'NoAudioContent',
        message: 'API response has no audio content',
        time: new Date().toISOString()
      };
      
      if (onFinish) onFinish();
      return;
    }

    // Play the audio 
    await Core.playAudioFromBase64(data.audioContent, onFinish);
  } catch (error) {
    Core.log(`Error in TTS process: ${error.message}`);
    Core.debugState.lastError = {
      type: 'TTSProcessError',
      message: error.message,
      time: new Date().toISOString()
    };
    
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
  detectedLanguageCode,
  getDebugState
};