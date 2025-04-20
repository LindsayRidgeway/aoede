// listeningSpeedCore.js - Core functionality for audio playback and TTS
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

// Flag to track if audio session is configured
let isAudioSessionConfigured = false;

// Keep track of current playback
let currentSound = null; // Track the current sound object

// Get API key using helper function for consistency
export const getConstantValue = (key) => {
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants?.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

// Safely access API keys directly from Constants
export const GOOGLE_TTS_API_KEY = getConstantValue('GOOGLE_API_KEY');

// Configure audio session
export const configureAudioSession = async () => {  
  if (isAudioSessionConfigured) {
    return;
  }
  
  try {
    const audioConfig = {
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true, // This enables playback when silent switch is on
      shouldDuckAndroid: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false
    };
    
    await Audio.setAudioModeAsync(audioConfig);
    
    isAudioSessionConfigured = true;
    
    // For iOS, let's verify the audio session was set correctly
    if (Platform.OS === 'ios') {
      try {
        // Try to get the current audio mode to verify settings took effect
        const currentAudioMode = await Audio.getAudioModeAsync();
        
        // For iOS 14+ compatibility check
        if (currentAudioMode && Platform.OS === 'ios') {
          // Additional initialization specifically for iOS
          try {
            await Audio.setIsEnabledAsync(true);
          } catch (enableError) {
            if (__DEV__) console.log(`Error in Audio.setIsEnabledAsync: ${enableError.message}`);
            // Continue despite this error
          }
        }
      } catch (verifyError) {
        if (__DEV__) console.log(`Error verifying audio mode: ${verifyError.message}`);
      }
    }
  } catch (error) {
    if (__DEV__) console.log(`Error configuring audio session: ${error.message}`);
    
    // On iOS, try a more basic configuration as fallback
    if (Platform.OS === 'ios') {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true
        });
        isAudioSessionConfigured = true;
      } catch (fallbackError) {
        if (__DEV__) console.log(`Fallback audio configuration also failed: ${fallbackError.message}`);
      }
    }
  }
};

// Play audio from base64
export const playAudioFromBase64 = async (base64Audio, onFinish) => {  
  if (!base64Audio) {
    if (__DEV__) console.log('No base64 audio data to play');
    if (onFinish) onFinish();
    return;
  }
  
  // Ensure audio session is configured
  await configureAudioSession();
  
  // Stop any current playback
  await stopSpeaking();
  
  const sound = new Audio.Sound();
  currentSound = sound;
  
  try {
    // On iOS, make extra effort to ensure proper format
    let audioUri;
    if (Platform.OS === 'ios') {
      // iOS might be more strict about the data URI format
      audioUri = `data:audio/mp3;base64,${base64Audio}`;
    } else {
      audioUri = `data:audio/mp3;base64,${base64Audio}`;
    }
    
    try {
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
              if (__DEV__) console.log(`Error cleaning up sound: ${error.message}`);
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      const playbackStatus = await sound.playAsync();
      
      // For iOS, make extra effort to check volume
      if (Platform.OS === 'ios') {
        try {
          const soundStatus = await sound.getStatusAsync();
         
          // Check if volume is 0
          if (soundStatus.volume === 0) {
            if (__DEV__) console.log('WARNING: iOS sound volume is 0!');
            
            // Try to set volume
            try {
              await sound.setVolumeAsync(1.0);
            } catch (volumeError) {
              if (__DEV__) console.log(`Error setting volume: ${volumeError.message}`);
            }
          }
        } catch (statusError) {
          if (__DEV__) console.log(`Error getting iOS sound status: ${statusError.message}`);
        }
      }
    } catch (loadError) {
      if (__DEV__) console.log(`Error loading audio: ${loadError.message}`);
      
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
    if (__DEV__) console.log(`Error in audio playback: ${error.message}`);
    
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
};

// Stop any current playback
export const stopSpeaking = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      if (__DEV__) console.log(`Error stopping speech: ${error.message}`);
    } finally {
      currentSound = null;
    }
  }
};

// Storage helper functions
export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    return storedListeningSpeed ? parseInt(storedListeningSpeed, 10) || 3 : 3;
  } catch (error) {
    return 3; // Default to normal speed
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

// Configure audio session early
configureAudioSession();