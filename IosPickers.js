// IosPickers.js - Simplified version for iOS
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, 
  Modal, FlatList, SafeAreaView, 
  Keyboard, TouchableWithoutFeedback,
  Dimensions, StyleSheet
} from 'react-native';
import { iosPickerStyles } from './iosPickerStyles';

// Get screen dimensions for proper modal sizing
const { width, height } = Dimensions.get('window');

// iOS selector button component
export const IosSelectorButton = ({
  value,
  placeholder,
  onPress,
  disabled
}) => {
  return (
    <TouchableOpacity
      style={[
        iosPickerStyles.inputButton,
        disabled && iosPickerStyles.disabledButton
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text 
        style={[
          iosPickerStyles.inputButtonText,
          !value && iosPickerStyles.placeholderText
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
};

// Language picker component for iOS
export const IosLanguagePicker = ({
  visible,
  onCancel,
  onDone,
  languages,
  searchText,
  onSearchChange,
  selectedLanguage,
  onSelectLanguage,
  uiText
}) => {
  // When keyboard appears, adjust UI
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Function to dismiss keyboard when tapping modal
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        <View style={simpleStyles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={simpleStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={simpleStyles.title}>
            {uiText.studyLanguage || "Study Language"}
          </Text>
          
          <TouchableOpacity 
            onPress={onDone}
            disabled={!selectedLanguage}
          >
            <Text style={[
              simpleStyles.doneText,
              !selectedLanguage && {opacity: 0.5}
            ]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={simpleStyles.searchInput}
          placeholder="Search languages..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={onSearchChange}
          clearButtonMode="while-editing"
        />
        
        <FlatList
          data={languages}
          keyExtractor={item => item.language}
          renderItem={({item}) => {
            const isSelected = selectedLanguage && 
                          selectedLanguage.language === item.language;
            return (
              <TouchableOpacity
                style={[
                  simpleStyles.item,
                  isSelected && simpleStyles.selectedItem
                ]}
                onPress={() => onSelectLanguage(item)}
              >
                <Text style={[
                  simpleStyles.itemText,
                  isSelected && simpleStyles.selectedText
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            searchText ? (
              <View style={simpleStyles.emptyContainer}>
                <Text style={simpleStyles.emptyText}>
                  No languages found matching "{searchText}"
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

// Book picker component for iOS
export const IosBookPicker = ({
  visible,
  onCancel,
  onDone,
  books,
  searchText,
  onSearchChange,
  selectedBook,
  onSelectBook,
  getBookTitle,
  uiText
}) => {
  // When keyboard appears, adjust UI
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Function to dismiss keyboard when tapping modal
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        <View style={simpleStyles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={simpleStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={simpleStyles.title}>
            {uiText.bookSelection || "Book Selection"}
          </Text>
          
          <TouchableOpacity 
            onPress={onDone}
            disabled={!selectedBook}
          >
            <Text style={[
              simpleStyles.doneText,
              !selectedBook && {opacity: 0.5}
            ]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={simpleStyles.searchInput}
          placeholder="Search books..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={onSearchChange}
          clearButtonMode="while-editing"
        />
        
        <FlatList
          data={books}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const isSelected = selectedBook && selectedBook.id === item.id;
            return (
              <TouchableOpacity
                style={[
                  simpleStyles.item,
                  isSelected && simpleStyles.selectedItem
                ]}
                onPress={() => onSelectBook(item)}
              >
                <Text style={[
                  simpleStyles.itemText,
                  isSelected && simpleStyles.selectedText
                ]}>
                  {getBookTitle(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            searchText ? (
              <View style={simpleStyles.emptyContainer}>
                <Text style={simpleStyles.emptyText}>
                  No books found matching "{searchText}"
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

// Simple inline styles to avoid any dependency issues
const simpleStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF'
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  searchInput: {
    height: 40,
    margin: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  item: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedItem: {
    backgroundColor: '#f0f9ff'
  },
  itemText: {
    fontSize: 16,
    color: '#333'
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  }
});