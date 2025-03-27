// listeningSpeed.js - Updated with silent mode override for iOS
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Disable debug logging for production
const DEBUG = false;

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of current playback
let currentSound = null; // Track the current sound object
let cachedVoicesByLanguage = {}; // Cache for TTS voices by language
let supportedVoiceLanguageCodes = new Set(); // Set of all supported language codes (with regions)

// Flag to track if audio session is configured
let isAudioSessionConfigured = false;

// Get API key using helper function for consistency
const getConstantValue = (key) => {
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

// Safely access API keys directly from Constants
const GOOGLE_TTS_API_KEY = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');

// Keep track of available voices
let availableVoices = null;
let languageInitialized = false; // Track if we've initialized voice data

// Function to log debug messages
const log = (message) => {
  if (DEBUG) {
    console.log(`[ListeningSpeed] ${message}`);
  }
};

// Configure audio session to play in silent mode on iOS
const configureAudioSession = async () => {
  if (isAudioSessionConfigured) return;
  
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true, // This enables playback when silent switch is on
      shouldDuckAndroid: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false
    });
    
    isAudioSessionConfigured = true;
    log('Audio session configured to play in silent mode');
  } catch (error) {
    log(`Error configuring audio session: ${error.message}`);
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

// Export all functions
export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    return storedListeningSpeed ? parseInt(storedListeningSpeed, 10) || 3 : 3;
  } catch (error) {
    return 3; // Default to normal speed
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
    // Ensure we save a clean integer value
    const integerSpeed = parseInt(speed, 10);
    await AsyncStorage.setItem("listeningSpeed", integerSpeed.toString());
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

  // Configure audio session to play in silent mode (mainly for iOS)
  await configureAudioSession();

  // Stop any currently playing audio first
  await stopSpeaking();

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
      audioConfig: { 
        audioEncoding: "MP3",
        speakingRate: speakingRate
      }
    };
    
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
      
      const retryResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(simplifiedBody),
        }
      );
      
      if (!retryResponse.ok) {
        // If that fails too, try one last approach without specific voice name
        if (voiceName) {
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
          
          const lastResponse = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lastAttemptBody),
            }
          );
          
          if (!lastResponse.ok) {
            if (onFinish) onFinish();
            return;
          }
          
          const lastData = await lastResponse.json();
          if (!lastData.audioContent) {
            if (onFinish) onFinish();
            return;
          }
          
          // Use the successful last attempt data
          const sound = new Audio.Sound();
          currentSound = sound;
          
          try {
            const audioUri = `data:audio/mp3;base64,${lastData.audioContent}`;
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
        }
        
        // If we've tried everything and still failed
        if (onFinish) onFinish();
        return;
      }
      
      const retryData = await retryResponse.json();
      if (!retryData.audioContent) {
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
    }

    const data = await response.json();
    if (!data.audioContent) {
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
    if (onFinish) onFinish(); // Call onFinish even on error
  }
};

// Configure audio session early
configureAudioSession();

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