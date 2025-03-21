// IosPickers.js - iOS-specific picker components using direct iOS controls
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// iOS native approach - simple text display with direct Picker usage
export const IosSelectorButton = ({
  value,
  placeholder,
  onPress,
  disabled
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.inputButton,
        disabled && styles.disabledButton
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text 
        style={[
          styles.inputButtonText,
          !value && styles.placeholderText
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
};

// Direct iOS picker component for languages
export const IosLanguagePicker = ({
  visible,
  languages,
  selectedValue,
  onValueChange,
  prompt,
  enabled = true
}) => {
  if (!visible) return null;
  
  return (
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        prompt={prompt}
        enabled={enabled}
        itemStyle={styles.pickerItem}
      >
        <Picker.Item label={prompt || "Select language"} value="" />
        {languages.map(lang => (
          <Picker.Item 
            key={lang.language} 
            label={lang.name} 
            value={lang.language} 
          />
        ))}
      </Picker>
    </View>
  );
};

// Direct iOS picker component for books
export const IosBookPicker = ({
  visible,
  books,
  selectedValue,
  onValueChange,
  getBookTitle,
  prompt,
  enabled = true
}) => {
  if (!visible) return null;
  
  return (
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        prompt={prompt}
        enabled={enabled}
        itemStyle={styles.pickerItem}
      >
        <Picker.Item label={prompt || "Select a book"} value="" />
        {books.map(book => (
          <Picker.Item 
            key={book.id} 
            label={getBookTitle(book)} 
            value={book.id} 
          />
        ))}
      </Picker>
    </View>
  );
};

// Styles for iOS components
const styles = StyleSheet.create({
  inputButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  inputButtonText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    color: '#999'
  },
  disabledButton: {
    opacity: 0.5
  },
  pickerContainer: {
    backgroundColor: '#fff',
    width: '100%',
    height: 250,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  pickerItem: {
    fontSize: 16
  }
});