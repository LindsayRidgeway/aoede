// listeningSpeedCore.js - Core functionality for audio playback and TTS (Web Only)
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Flag to track if audio session is configured
let isAudioSessionConfigured = false;

// Keep track of current playback
let currentSound = null;

// Configure audio session for web
export const configureAudioSession = async () => {  
  if (isAudioSessionConfigured) {
    return;
  }
  
  try {
    const audioConfig = {
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false
    };
    
    await Audio.setAudioModeAsync(audioConfig);
    
    isAudioSessionConfigured = true;
    
  } catch (error) {
    if (__DEV__) console.log(`Error configuring audio session: ${error.message}`);
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
    const audioUri = `data:audio/mp3;base64,${base64Audio}`;
    
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
      
      await sound.playAsync();
      
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