// listeningSpeedCore.js - Core functionality for audio playback and TTS
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

// Debug state tracking - but hide sensitive data
export const debugState = {
  lastApiRequest: null,
  lastApiResponse: null,
  lastAudioUri: null,
  lastError: null,
  audioSessionConfig: null,
  soundLoadAttempts: 0,
  playbackStatus: null,
  platform: Platform.OS,
  lastLog: null
};

// Set to false to disable debug alerts, true to enable
const DEBUG = false;

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

// Function to log debug messages
export const log = (message) => {
  if (DEBUG) {
    console.log(`[ListeningSpeed] ${message}`);
    // Add to debug state for viewing in DebugPanel
    debugState.lastLog = `${new Date().toISOString()} - ${message}`;
  }
};

// Function to show Alert for critical iOS audio issues
export const showDebugAlert = (title, message) => {
  if (DEBUG && Platform.OS === 'ios') {
    Alert.alert(
      `Debug: ${title}`,
      message,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: false }
    );
  }
};

// Configure audio session with enhanced debugging for iOS
export const configureAudioSession = async () => {
  log(`Configuring audio session. Already configured: ${isAudioSessionConfigured}`);
  
  if (isAudioSessionConfigured) {
    log('Audio session already configured, skipping');
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
    
    log(`Attempting to set audio mode with config`);
    // Don't store the full config in debug state to avoid showing API keys
    debugState.audioSessionConfig = {
      playsInSilentModeIOS: audioConfig.playsInSilentModeIOS,
      configured: true
    };
    
    await Audio.setAudioModeAsync(audioConfig);
    
    isAudioSessionConfigured = true;
    log('Audio session successfully configured to play in silent mode');
    
    // For iOS, let's verify the audio session was set correctly
    if (Platform.OS === 'ios') {
      log('iOS detected, performing additional audio session validation');
      try {
        // Try to get the current audio mode to verify settings took effect
        const currentAudioMode = await Audio.getAudioModeAsync();
        log(`iOS audio session validated`);
        // Don't store the full audio mode in debug state
        debugState.currentAudioMode = {
          playsInSilentModeIOS: currentAudioMode.playsInSilentModeIOS,
          validated: true
        };
        
        // For iOS 14+ compatibility check
        if (currentAudioMode && Platform.OS === 'ios') {
          log('iOS detected, performing additional audio initialization');
          // Additional initialization specifically for iOS
          try {
            await Audio.setIsEnabledAsync(true);
            log('Audio.setIsEnabledAsync(true) successful');
          } catch (enableError) {
            log(`Error in Audio.setIsEnabledAsync: ${enableError.message}`);
            // Continue despite this error
          }
        }
      } catch (verifyError) {
        log(`Error verifying audio mode: ${verifyError.message}`);
      }
    }
  } catch (error) {
    log(`Error configuring audio session: ${error.message}`);
    debugState.lastError = {
      type: 'AudioSessionConfig',
      message: error.message,
      time: new Date().toISOString()
    };
    
    showDebugAlert('Audio Config Error', `Failed to configure audio: ${error.message}`);
    
    // On iOS, try a more basic configuration as fallback
    if (Platform.OS === 'ios') {
      try {
        log('Trying fallback iOS audio configuration');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true
        });
        isAudioSessionConfigured = true;
        log('Fallback audio configuration applied');
      } catch (fallbackError) {
        log(`Fallback audio configuration also failed: ${fallbackError.message}`);
      }
    }
  }
};

// Play audio from base64 with extensive debugging
export const playAudioFromBase64 = async (base64Audio, onFinish) => {
  log(`Preparing to play audio from base64 (length: ${base64Audio ? base64Audio.length : 'null'})`);
  
  if (!base64Audio) {
    log('No base64 audio data to play');
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
      log(`iOS: Created audio URI with explicit format`);
    } else {
      audioUri = `data:audio/mp3;base64,${base64Audio}`;
    }
    
    log(`Loading audio from URI (length: ${audioUri.length})`);
    // Don't store the actual URI in debug state, just the info that it was created
    debugState.lastAudioUri = `Audio URI created (${audioUri.length} chars)`;
    
    try {
      log('Starting to load audio...');
      await sound.loadAsync({ uri: audioUri });
      log('Audio loaded successfully');
      debugState.soundLoadStatus = 'success';
      
      // Set up a listener for when playback finishes
      sound.setOnPlaybackStatusUpdate(status => {
        // Don't store full status object in debug state
        debugState.playbackStatus = { 
          isPlaying: status.isPlaying,
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis,
          didJustFinish: status.didJustFinish
        };
        
        log(`Playback status update: playing=${status.isPlaying}, position=${status.positionMillis}ms`);
        
        if (status.didJustFinish) {
          log('Playback finished naturally');
          sound.setOnPlaybackStatusUpdate(null);
          
          // Clean up
          (async () => {
            try {
              if (sound === currentSound) {
                await sound.unloadAsync();
                currentSound = null;
                log('Sound unloaded after playback');
              }
            } catch (error) {
              log(`Error cleaning up sound: ${error.message}`);
              debugState.lastError = {
                type: 'CleanupError',
                message: error.message,
                time: new Date().toISOString()
              };
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      log('Starting playback...');
      const playbackStatus = await sound.playAsync();
      log(`Playback started`);
      // Don't store full status object in debug state
      debugState.initialPlaybackStatus = { 
        isPlaying: playbackStatus.isPlaying,
        positionMillis: playbackStatus.positionMillis,
        durationMillis: playbackStatus.durationMillis
      };
      
      // For iOS, make extra effort to check volume
      if (Platform.OS === 'ios') {
        try {
          log('Getting sound status on iOS...');
          const soundStatus = await sound.getStatusAsync();
          log(`iOS sound status: volume=${soundStatus.volume}, rate=${soundStatus.rate}`);
          // Don't store full status object in debug state
          debugState.iosSoundStatus = { 
            volume: soundStatus.volume,
            rate: soundStatus.rate,
            isPlaying: soundStatus.isPlaying
          };
          
          // Check if volume is 0
          if (soundStatus.volume === 0) {
            log('WARNING: iOS sound volume is 0!');
            
            // Try to set volume
            try {
              await sound.setVolumeAsync(1.0);
              log('Attempted to correct volume to 1.0');
            } catch (volumeError) {
              log(`Error setting volume: ${volumeError.message}`);
            }
          }
        } catch (statusError) {
          log(`Error getting iOS sound status: ${statusError.message}`);
        }
      }
    } catch (loadError) {
      log(`Error loading audio: ${loadError.message}`);
      debugState.lastError = {
        type: 'AudioLoadError',
        message: loadError.message,
        time: new Date().toISOString()
      };
      
      showDebugAlert('Audio Load Error', `Failed to load audio: ${loadError.message}`);
      
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
    log(`Error in audio playback: ${error.message}`);
    debugState.lastError = {
      type: 'AudioPlaybackError',
      message: error.message,
      time: new Date().toISOString()
    };
    
    showDebugAlert('Audio Playback Error', `Error in audio playback: ${error.message}`);
    
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
      log('Stopping current playback');
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      log(`Error stopping speech: ${error.message}`);
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