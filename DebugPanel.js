// DebugPanel.js - Component to display debug info in the UI (with API key protection)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { getConstantValue } from './apiUtilsXXX';
import { apiDebugResults } from './apiServices';

// Helper function to censor sensitive values like API keys
const censorValue = (key, value) => {
  // If the value is null, undefined, or empty, just return it
  if (!value) return value;
  
  // Check if this is sensitive data that should be censored
  const sensitiveKeys = ['api_key', 'apikey', 'key', 'token', 'secret', 'password', 'auth'];
  
  // For API keys specifically
  if (key.toLowerCase().includes('api_key') || 
      key.toLowerCase().includes('apikey') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('key')) {
    // Show just the first 4 and last 4 characters if long enough
    if (typeof value === 'string' && value.length > 12) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
    // Otherwise just hide it completely
    return "[API KEY HIDDEN]";
  }
  
  // For URLs that might contain API keys as parameters
  if (typeof value === 'string' && 
     (value.includes('key=') || value.includes('api_key=') || value.includes('apikey='))) {
    // Try to censor just the key parameter
    return value.replace(/([?&](api_?)?key=)[^&]+/gi, '$1[API KEY HIDDEN]');
  }
  
  return value;
};

// Function to get all possible versions of a key (with censoring)
const getAllVersionsOfKey = (key) => {
  const versions = {};
  
  // Constants paths
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    versions.expoConfigExtra = censorValue(key, Constants.expoConfig.extra[key]);
  }
  
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    versions.manifestExtra = censorValue(key, Constants.manifest.extra[key]);
  }
  
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    versions.constantsExtra = censorValue(key, Constants.extra[key]);
  }
  
  // Get the value that would be used by getConstantValue
  versions.actualUsed = censorValue(key, getConstantValue(key));
  
  return versions;
};

// Function to sanitize debug data to remove sensitive information
const sanitizeDebugData = (data) => {
  if (!data) return null;
  
  // Deep clone the object to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Sanitize API results if present
  if (sanitized.apiDebugResults) {
    // Sanitize Anthropic API results
    if (sanitized.apiDebugResults.lastAnthropicAttempt) {
      const attempt = sanitized.apiDebugResults.lastAnthropicAttempt;
      
      if (attempt.apiKey) {
        attempt.apiKey = censorValue('apiKey', attempt.apiKey);
      }
      
      if (attempt.url && attempt.url.includes('key=')) {
        attempt.url = censorValue('url', attempt.url);
      }
    }
    
    // Sanitize Google API results
    if (sanitized.apiDebugResults.lastGoogleAttempt) {
      const attempt = sanitized.apiDebugResults.lastGoogleAttempt;
      
      if (attempt.apiKey) {
        attempt.apiKey = censorValue('apiKey', attempt.apiKey);
      }
      
      if (attempt.url && attempt.url.includes('key=')) {
        attempt.url = censorValue('url', attempt.url);
      }
    }
    
    // Sanitize any stored API keys
    if (sanitized.apiDebugResults.anthropicKey) {
      sanitized.apiDebugResults.anthropicKey = censorValue('anthropicKey', sanitized.apiDebugResults.anthropicKey);
    }
    
    if (sanitized.apiDebugResults.googleKey) {
      sanitized.apiDebugResults.googleKey = censorValue('googleKey', sanitized.apiDebugResults.googleKey);
    }
    
    if (sanitized.apiDebugResults.corsProxy) {
      // Not sensitive but for consistency
      sanitized.apiDebugResults.corsProxy = sanitized.apiDebugResults.corsProxy;
    }
  }
  
  return sanitized;
};

const DebugPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const [debugData, setDebugData] = useState(null);
  
  // Refresh debug data every 2 seconds when panel is expanded
  useEffect(() => {
    if (!expanded) return;
    
    const fetchDebugData = () => {
      // Get all versions of each key
      const anthropicVersions = getAllVersionsOfKey('EXPO_PUBLIC_ANTHROPIC_API_KEY');
      const googleVersions = getAllVersionsOfKey('EXPO_PUBLIC_GOOGLE_API_KEY');
      const corsProxyVersions = getAllVersionsOfKey('EXPO_PUBLIC_CORS_PROXY');
      
      setDebugData({
        anthropicVersions,
        googleVersions,
        corsProxyVersions,
        apiDebugResults: sanitizeDebugData({...apiDebugResults})
      });
    };
    
    // Initial fetch
    fetchDebugData();
    
    // Set up interval to refresh data
    const interval = setInterval(fetchDebugData, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [expanded]);
  
  if (!expanded) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setExpanded(true)}
      >
        <Text style={styles.toggleButtonText}>Show Debug Info</Text>
      </TouchableOpacity>
    );
  }
  
  if (!debugData) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={() => setExpanded(false)}
        >
          <Text style={styles.toggleButtonText}>Hide Debug Info</Text>
        </TouchableOpacity>
        <Text>Loading debug data...</Text>
      </View>
    );
  }
  
  const { anthropicVersions, googleVersions, corsProxyVersions } = debugData;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setExpanded(false)}
      >
        <Text style={styles.toggleButtonText}>Hide Debug Info</Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView}>
        <Text style={styles.heading}>Platform: {Constants.platform?.ios ? 'iOS' : Constants.platform?.android ? 'Android' : 'Web'}</Text>
        
        <Text style={styles.heading}>API Keys Status:</Text>
        <View style={styles.keyItem}>
          <Text style={styles.source}>Anthropic API Key:</Text>
          <Text style={styles.keyValue}>Available: {anthropicVersions.actualUsed ? 'YES' : 'NO'}</Text>
        </View>
        <View style={styles.keyItem}>
          <Text style={styles.source}>Google API Key:</Text>
          <Text style={styles.keyValue}>Available: {googleVersions.actualUsed ? 'YES' : 'NO'}</Text>
        </View>
        <View style={styles.keyItem}>
          <Text style={styles.source}>CORS Proxy:</Text>
          <Text style={styles.keyValue}>{corsProxyVersions.actualUsed || 'Not configured'}</Text>
        </View>
        
        <Text style={styles.heading}>API Debugging:</Text>
        
        {/* Anthropic API Results */}
        <Text style={styles.subheading}>Last Anthropic API Call:</Text>
        {debugData.apiDebugResults?.lastAnthropicAttempt ? (
          <View style={styles.apiResultContainer}>
            <Text style={styles.source}>Time: {debugData.apiDebugResults.lastAnthropicAttempt.time}</Text>
            <Text style={styles.source}>Success: {debugData.apiDebugResults.lastAnthropicAttempt.success ? 'YES' : 'NO'}</Text>
            {debugData.apiDebugResults.lastAnthropicAttempt.cors && (
              <Text style={styles.keyValue}>CORS Proxy: {debugData.apiDebugResults.lastAnthropicAttempt.cors}</Text>
            )}
            {debugData.apiDebugResults.lastAnthropicAttempt.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorText}>
                  {typeof debugData.apiDebugResults.lastAnthropicAttempt.error === 'object'
                    ? JSON.stringify(debugData.apiDebugResults.lastAnthropicAttempt.error, null, 2)
                    : String(debugData.apiDebugResults.lastAnthropicAttempt.error)
                  }
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noDataText}>No Anthropic API calls made yet</Text>
        )}
        
        {/* Google API Results */}
        <Text style={styles.subheading}>Last Google API Call:</Text>
        {debugData.apiDebugResults?.lastGoogleAttempt ? (
          <View style={styles.apiResultContainer}>
            <Text style={styles.source}>Time: {debugData.apiDebugResults.lastGoogleAttempt.time}</Text>
            <Text style={styles.source}>Success: {debugData.apiDebugResults.lastGoogleAttempt.success ? 'YES' : 'NO'}</Text>
            {debugData.apiDebugResults.lastGoogleAttempt.sourceLang && (
              <Text style={styles.keyValue}>Source Language: {debugData.apiDebugResults.lastGoogleAttempt.sourceLang}</Text>
            )}
            {debugData.apiDebugResults.lastGoogleAttempt.targetLang && (
              <Text style={styles.keyValue}>Target Language: {debugData.apiDebugResults.lastGoogleAttempt.targetLang}</Text>
            )}
            {debugData.apiDebugResults.lastGoogleAttempt.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorText}>
                  {typeof debugData.apiDebugResults.lastGoogleAttempt.error === 'object'
                    ? JSON.stringify(debugData.apiDebugResults.lastGoogleAttempt.error, null, 2)
                    : String(debugData.apiDebugResults.lastGoogleAttempt.error)
                  }
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noDataText}>No Google API calls made yet</Text>
        )}

        <Text style={styles.heading}>Constants Structure:</Text>
        <Text style={styles.keyValue}>
          {JSON.stringify({
            hasExtra: !!Constants?.extra,
            hasExpoConfig: !!Constants?.expoConfig,
            hasExpoConfigExtra: !!Constants?.expoConfig?.extra,
            hasManifest: !!Constants?.manifest,
            hasManifestExtra: !!Constants?.manifest?.extra
          }, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    margin: 10,
    maxHeight: 400
  },
  scrollView: {
    flexGrow: 0
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5
  },
  subheading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 3,
    paddingLeft: 5
  },
  keyItem: {
    marginBottom: 5,
    paddingLeft: 10
  },
  source: {
    fontWeight: 'bold',
    fontSize: 14
  },
  keyValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#e0e0e0',
    padding: 5,
    borderRadius: 4
  },
  toggleButton: {
    backgroundColor: '#3a7ca5',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 5
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  apiResultContainer: {
    backgroundColor: '#e8e8e8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    marginLeft: 5
  },
  errorContainer: {
    marginTop: 5,
    padding: 5,
    backgroundColor: '#ffe0e0',
    borderRadius: 4
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#900'
  },
  errorText: {
    color: '#900',
    fontFamily: 'monospace',
    fontSize: 11
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    marginLeft: 10,
    marginBottom: 10
  }
});

export default DebugPanel;
