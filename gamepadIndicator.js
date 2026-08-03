// gamepadIndicator.js - Smart indicator that only shows when a gamepad is connected
import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import gamepadManager from './gamepadSupport';

const GamepadIndicator = () => {
  const [gamepadConnected, setGamepadConnected] = useState(false);
  
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    gamepadManager.init();
    
    // Function to check for connected gamepads
    const checkGamepads = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        // Check if any non-null gamepad is connected
        const hasGamepad = Array.from(gamepads).some(gamepad => gamepad && gamepad.connected !== false);
        setGamepadConnected(hasGamepad);
      } else {
        setGamepadConnected(Object.keys(gamepadManager.gamepads).length > 0);
      }
    };
    
    // Check initially
    checkGamepads();
    
    // Listen for gamepad connections/disconnections
    const handleGamepadConnected = () => {
      setGamepadConnected(true);
    };
    
    const handleGamepadDisconnected = () => {
      // Small delay to ensure navigator.getGamepads() is updated
      setTimeout(checkGamepads, 100);
    };

    const handleAoedeGamepadChange = (event) => {
      setGamepadConnected(Boolean(event.detail?.connected));
    };
    
    // Add event listeners
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    window.addEventListener('webkitgamepadconnected', handleGamepadConnected);
    window.addEventListener('webkitgamepaddisconnected', handleGamepadDisconnected);
    window.addEventListener('aoede-gamepadchange', handleAoedeGamepadChange);
    
    // Fallback polling for browsers that don't support the events
    const intervalId = setInterval(checkGamepads, 500);
    
    // Cleanup
    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      window.removeEventListener('webkitgamepadconnected', handleGamepadConnected);
      window.removeEventListener('webkitgamepaddisconnected', handleGamepadDisconnected);
      window.removeEventListener('aoede-gamepadchange', handleAoedeGamepadChange);
      clearInterval(intervalId);
    };
  }, []);
  
  // Only render if on web platform and a gamepad is connected
  if (Platform.OS !== 'web' || !gamepadConnected) {
    return null;
  }
  
  return (
    <View style={{
      marginTop: 15,
      padding: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      borderRadius: 5,
      alignItems: 'center'
    }}>
      <Text style={{
        fontSize: 10,
        color: '#666',
        fontStyle: 'italic'
      }}>
        Gamepad Connected
      </Text>
    </View>
  );
};

export default GamepadIndicator;
