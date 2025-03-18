import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of current playback
let currentSound = null; // Track the current sound object
let cachedVoicesByLanguage = {}; // Cache for TTS voices by language

// Safely access API keys with optional chaining
const GOOGLE_TTS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY || "";

// Keep track of available voices
let availableVoices = null;

// Function to fetch available voices from Google TTS API
async function fetchAvailableVoices() {
  if (!GOOGLE_TTS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.voices || null;
  } catch (error) {
    return null;
  }
}

// Initialize and cache voice list
export const initializeVoices = async () => {
  if (availableVoices) {
    return availableVoices;
  }
  
  try {
    availableVoices = await fetchAvailableVoices();
    
    if (availableVoices) {
      // Create a map of language codes to voices
      for (const voice of availableVoices) {
        const languageCode = voice.languageCodes[0].split('-')[0];
        if (!cachedVoicesByLanguage[languageCode]) {
          cachedVoicesByLanguage[languageCode] = [];
        }
        cachedVoicesByLanguage[languageCode].push(voice);
      }
    }
    
    return availableVoices;
  } catch (error) {
    return null;
  }
};

// Get the best voice for a language
const getBestVoiceForLanguage = (languageCode) => {
  if (!languageCode) return null;
  
  // Normalize to lowercase
  const normalizedCode = languageCode.toLowerCase();
  
  // First try exact match
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    // Prefer female voices when available
    const femaleVoices = cachedVoicesByLanguage[normalizedCode].filter(
      voice => voice.ssmlGender === 'FEMALE'
    );
    
    if (femaleVoices.length > 0) {
      return femaleVoices[0].name;
    }
    
    return cachedVoicesByLanguage[normalizedCode][0].name;
  }
  
  // Return null if no match found
  return null;
};

// Get the best language code with region for TTS from available voices
const getBestTTSLanguageCode = (languageCode) => {
  if (!languageCode) return null;
  
  // Normalize to lowercase
  const normalizedCode = languageCode.toLowerCase();
  
  // Check if we have voices cached for this language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    // Get the first voice's languageCode (which is the full code like "en-US")
    return cachedVoicesByLanguage[normalizedCode][0].languageCodes[0];
  }
  
  // If we don't have a cached voice, try to append the region code
  // e.g., "en" -> "en-US", using uppercase version of the language code
  return `${normalizedCode}-${normalizedCode.toUpperCase()}`;
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
      console.warn("Error stopping speech:", error);
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

  // Ensure voices are initialized
  if (!availableVoices) {
    await initializeVoices();
  }

  const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));

  // Get the appropriate TTS language code with region
  let ttsLanguageCode;
  
  if (detectedLanguageCode) {
    // Try to get the best TTS language code for the detected language
    ttsLanguageCode = getBestTTSLanguageCode(detectedLanguageCode);
    
    // If we still don't have a valid language code with region
    if (!ttsLanguageCode || !ttsLanguageCode.includes('-')) {
      // Add a region code to make it valid for TTS
      ttsLanguageCode = `${detectedLanguageCode}-${detectedLanguageCode.toUpperCase()}`;
    }
  } else {
    // Default to English if no language code is detected
    ttsLanguageCode = "en-US";
  }

  try {
    // Check if we have a Google API key before attempting the API call
    if (!GOOGLE_TTS_API_KEY) {
      if (onFinish) onFinish();
      return;
    }

    // Get the best voice for the language if available
    const voiceName = getBestVoiceForLanguage(detectedLanguageCode);
    
    // Preparing TTS request body
    const requestBody = {
      input: { text: sentence },
      voice: { 
        languageCode: ttsLanguageCode,
        ssmlGender: "FEMALE"
      },
      audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate }
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
      const errorData = await response.json();
      if (onFinish) onFinish();
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
              console.warn("Error cleaning up sound:", error);
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.warn("[TTS] Error playing sound:", error);
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
    console.warn("[TTS] Error in speech synthesis:", error);
    if (onFinish) onFinish(); // Call onFinish even on error
  }
};

// Call initializeVoices during module loading to start fetching voices
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
