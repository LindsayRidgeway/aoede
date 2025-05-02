// DebugPanel.js - Re-enabled for debugging TestFlight issues
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// Global log buffer that persists across renders
let logBuffer = [];

// Add a log entry (can be called from anywhere)
export const debugLog = (message) => {
	if (false) {
  const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
  const logEntry = `${timestamp}: ${message}`;
  console.log(logEntry); // Also log to console
  logBuffer.push(logEntry);
  
  // Keep buffer size reasonable
  if (logBuffer.length > 100) {
    logBuffer = logBuffer.slice(-100);
  }
}
};

// Clear the log
export const clearDebugLogs = () => {
  logBuffer = [];
};

const DebugPanel = () => {
  const [logs, setLogs] = useState([]);
  
  // Update display when logs change
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setLogs([...logBuffer]);
    }, 500);
    
    return () => clearInterval(updateInterval);
  }, []);
  
  if (!logs.length) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Debug Panel</Text>
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={() => clearDebugLogs()}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
      >
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '80%',
    maxHeight: 200,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#eee',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 3,
    backgroundColor: '#ddd',
    borderRadius: 3,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#333',
  },
  logContainer: {
    maxHeight: 170,
  },
  logContent: {
    padding: 5,
  },
  logEntry: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#333',
    marginBottom: 2,
  },
});

export default DebugPanel;