// listeningSpeed.js - Fixed for HD voice pace control incompatibility
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Debug flag - set to false to disable debug logging
const DEBUG = false;

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of current playback
let currentSound = null; // Track the current sound object
let cachedVoicesByLanguage = {}; // Cache for TTS voices by language
let supportedVoiceLanguageCodes = new Set(); // Set of all supported language codes (with regions)

// Safely access API keys with optional chaining
const GOOGLE_TTS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY || "";

// Keep track of available voices
let availableVoices = null;
let languageInitialized = false; // Track if we've initialized voice data

// Function to log debug messages
const log = (message) => {
  if (DEBUG) {
    console.log(`[ListeningSpeed] ${message}`);
  }
};

// Function to fetch available voices from Google TTS API
function fetchAvailableVoices() {
  if (!GOOGLE_TTS_API_KEY) {
    log("No Google API key found");
    return null;
  }

  try {
    // We're using a synchronous approach, so we'll return a promise that will be resolved later
    const promise = fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_API_KEY}`
    )
    .then(response => {
      if (!response.ok) {
        log(`Failed to fetch voices: ${response.status} ${response.statusText}`);
        return null;
      }
      return response.json();
    })
    .then(data => {
      return data.voices || null;
    })
    .catch(error => {
      log(`Error fetching voices: ${error.message}`);
      return null;
    });
    
    return promise;
  } catch (error) {
    log(`Error in fetchAvailableVoices: ${error.message}`);
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
      log(`Voice initialization complete. Found ${availableVoices.length} voices.`);
    }
    
    return availableVoices;
  } catch (error) {
    log(`Error initializing voices: ${error.message}`);
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

// Get the best voice for a language with pace control support
const getBestVoiceForLanguage = (languageCode, needsPaceControl = true) => {
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
    
    // Filter voices based on pace control compatibility
    // HD voices only support pace control in English, so avoid them for non-English languages
    let filteredVoices = voices;
    
    if (needsPaceControl && normalizedCode !== 'en') {
      // For non-English languages with pace control, avoid HD voices
      filteredVoices = voices.filter(voice => 
        !voice.name.includes('HD') && 
        !voice.name.includes('Chirp')  // Chirp voices are HD and have pace control limitations
      );
    }
    
    // If no voices match our criteria, fall back to all available voices
    if (filteredVoices.length === 0) {
      filteredVoices = voices;
    }
    
    // Prefer female voices when available
    const femaleVoices = filteredVoices.filter(
      voice => voice.ssmlGender === 'FEMALE'
    );
    
    if (femaleVoices.length > 0) {
      return {
        name: femaleVoices[0].name,
        languageCode: femaleVoices[0].matchedLanguageCode
      };
    }
    
    return {
      name: filteredVoices[0].name,
      languageCode: filteredVoices[0].matchedLanguageCode
    };
  }
  
  // Return null if no match found
  return null;
};

// Export all functions
export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    return storedListeningSpeed ? parseFloat(storedListeningSpeed) || 1.0 : 1.0;
  } catch (error) {
    return 1.0;
  }
};

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

export const saveListeningSpeed = async (speed) => {
  try {
    await AsyncStorage.setItem("listeningSpeed", speed.toString());
  } catch (error) {
    // Handle silently
  }
};

export const updateSpeechRate = async (rate, setSpeechRate) => {
  setSpeechRate(rate);
  try {
    await AsyncStorage.setItem("speechRate", rate.toString());
  } catch (error) {
    // Handle silently
  }
};

// Add function to stop speaking
export const stopSpeaking = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      log(`Error stopping speech: ${error.message}`);
    } finally {
      currentSound = null;
    }
  }
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish) => {
  if (!sentence) {
    if (onFinish) onFinish();
    return;
  }

  // Stop any currently playing audio first
  await stopSpeaking();

  // Ensure voices are initialized - but don't await it
  if (!languageInitialized || !availableVoices) {
    initializeVoices();
  }

  // Calculate if pace control is needed based on listening speed
  const usesPaceControl = Math.abs(listeningSpeed - 1.0) > 0.01;
  const speakingRate = usesPaceControl ? Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1)) : 1.0;
  
  // First, try to find the best voice and language code for this language
  // Only mention that we need pace control if the speed isn't 1.0
  const bestVoice = getBestVoiceForLanguage(detectedLanguageCode, usesPaceControl);
  
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
    // Check if we have a Google API key before attempting the API call
    if (!GOOGLE_TTS_API_KEY) {
      log("No Google API key found");
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
      audioConfig: { audioEncoding: "MP3" }
    };
    
    // Only add speaking rate if we're using pace control
    if (usesPaceControl) {
      // For non-English voices, be extra careful with Chirp and HD voices
      if (ttsLanguageCode.startsWith('en') || 
          (!voiceName || (!voiceName.includes('Chirp') && !voiceName.includes('HD')))) {
        requestBody.audioConfig.speakingRate = speakingRate;
      }
    }
    
    // If we have a specific voice name, use it
    if (voiceName) {
      requestBody.voice.name = voiceName;
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      // If we got an error and we're using pace control, try again without it
      if (usesPaceControl && response.status === 400) {
        log("Request failed with pace control, retrying without it");
        
        // Remove pace control and retry
        if (requestBody.audioConfig.speakingRate) {
          delete requestBody.audioConfig.speakingRate;
        }
        
        const retryResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );
        
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json();
          log(`Retry API error: ${JSON.stringify(errorData)}`);
          if (onFinish) onFinish();
          return;
        }
        
        const retryData = await retryResponse.json();
        if (!retryData.audioContent) {
          log("No audio content in retry response");
          if (onFinish) onFinish();
          return;
        }
        
        // Use the successful retry data
        const sound = new Audio.Sound();
        currentSound = sound;
        
        try {
          const audioUri = `data:audio/mp3;base64,${retryData.audioContent}`;
          await sound.loadAsync({ uri: audioUri });
          
          // Set up a listener for when playback finishes
          sound.setOnPlaybackStatusUpdate(status => {
            if (status.didJustFinish) {
              sound.setOnPlaybackStatusUpdate(null);
              
              // Clean up
              (async () => {
                try {
                  if (sound === currentSound) {
                    await sound.unloadAsync();
                    currentSound = null;
                  }
                } catch (error) {
                  log(`Error cleaning up sound: ${error.message}`);
                } finally {
                  if (onFinish) onFinish();
                }
              })();
            }
          });
          
          await sound.playAsync();
        } catch (error) {
          log(`Error playing sound: ${error.message}`);
          if (sound === currentSound) {
            try {
              await sound.unloadAsync();
            } catch (e) {
              // Ignore errors during cleanup
            }
            currentSound = null;
          }
          if (onFinish) onFinish();
        }
        
        return;
      } else {
        // Handle other types of errors
        const errorData = await response.json();
        log(`API error: ${JSON.stringify(errorData)}`);
        if (onFinish) onFinish();
        return;
      }
    }

    const data = await response.json();
    if (!data.audioContent) {
      log("No audio content in response");
      if (onFinish) onFinish();
      return;
    }

    // Decode Base64 and play MP3
    const sound = new Audio.Sound();
    currentSound = sound; // Store reference to current sound
    
    try {
      const audioUri = `data:audio/mp3;base64,${data.audioContent}`;
      await sound.loadAsync({ uri: audioUri });
      
      // Set up a listener for when playback finishes
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          // Only run this once when playback finishes
          sound.setOnPlaybackStatusUpdate(null);
          
          // Clean up
          (async () => {
            try {
              if (sound === currentSound) {
                await sound.unloadAsync();
                currentSound = null;
              }
            } catch (error) {
              log(`Error cleaning up sound: ${error.message}`);
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      log(`Error playing sound: ${error.message}`);
      if (sound === currentSound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
        currentSound = null;
      }
      if (onFinish) onFinish();
    }
  } catch (error) {
    log(`Error in speech synthesis: ${error.message}`);
    if (onFinish) onFinish(); // Call onFinish even on error
  }
};

// Start voice initialization during module loading, but don't await it
initializeVoices();

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