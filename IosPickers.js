// IosPickers.js - Updated with fixed iOS modal layout issues
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, 
  Modal, FlatList, SafeAreaView, 
  Keyboard, TouchableWithoutFeedback,
  Dimensions
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
  const [modalHeight, setModalHeight] = useState(height * 0.8);
  
  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      // Adjust modal height when keyboard appears
      const keyboardHeight = event.endCoordinates.height;
      setModalHeight(height - keyboardHeight - 20); // 20px buffer
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // Reset modal height when keyboard disappears
      setModalHeight(height * 0.8);
    });

    // Set initial modal height
    setModalHeight(height * 0.8);

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
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={iosPickerStyles.modalOverlay}>
          <SafeAreaView style={[
            iosPickerStyles.modalContent,
            { maxHeight: modalHeight }
          ]}>
            <View style={iosPickerStyles.modalHeader}>
              <TouchableOpacity
                style={iosPickerStyles.closeButton}
                onPress={onCancel}
                hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              >
                <Text style={iosPickerStyles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={iosPickerStyles.modalTitle}>
                {uiText.studyLanguage || "Study Language"}
              </Text>
              
              <TouchableOpacity
                style={iosPickerStyles.doneButton}
                onPress={onDone}
                disabled={!selectedLanguage}
                hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              >
                <Text style={[
                  iosPickerStyles.doneButtonText,
                  !selectedLanguage && iosPickerStyles.disabledButton
                ]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={iosPickerStyles.searchContainer}>
              <TextInput
                style={iosPickerStyles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={onSearchChange}
                clearButtonMode="while-editing"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <FlatList
              data={languages}
              keyExtractor={item => item.language}
              renderItem={({item}) => {
                const isSelected = selectedLanguage && 
                                selectedLanguage.language === item.language;
                return (
                  <TouchableOpacity
                    style={[
                      iosPickerStyles.item,
                      isSelected && iosPickerStyles.selectedItem
                    ]}
                    onPress={() => onSelectLanguage(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      iosPickerStyles.itemText,
                      isSelected && iosPickerStyles.selectedItemText
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={iosPickerStyles.listContainer}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                searchText ? (
                  <View style={iosPickerStyles.emptyContainer}>
                    <Text style={iosPickerStyles.emptyText}>
                      No languages found matching "{searchText}"
                    </Text>
                  </View>
                ) : null
              }
              // Make sure the list takes available space after search box and header
              style={{ flex: 1 }}
              initialNumToRender={20}
              windowSize={10}
            />
          </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
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
  const [modalHeight, setModalHeight] = useState(height * 0.8);
  
  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      // Adjust modal height when keyboard appears
      const keyboardHeight = event.endCoordinates.height;
      setModalHeight(height - keyboardHeight - 20); // 20px buffer
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // Reset modal height when keyboard disappears
      setModalHeight(height * 0.8);
    });

    // Set initial modal height
    setModalHeight(height * 0.8);

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
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={iosPickerStyles.modalOverlay}>
          <SafeAreaView style={[
            iosPickerStyles.modalContent,
            { maxHeight: modalHeight }
          ]}>
            <View style={iosPickerStyles.modalHeader}>
              <TouchableOpacity
                style={iosPickerStyles.closeButton}
                onPress={onCancel}
                hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              >
                <Text style={iosPickerStyles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={iosPickerStyles.modalTitle}>
                {uiText.bookSelection || "Book Selection"}
              </Text>
              
              <TouchableOpacity
                style={iosPickerStyles.doneButton}
                onPress={onDone}
                disabled={!selectedBook}
                hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              >
                <Text style={[
                  iosPickerStyles.doneButtonText,
                  !selectedBook && iosPickerStyles.disabledButton
                ]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={iosPickerStyles.searchContainer}>
              <TextInput
                style={iosPickerStyles.searchInput}
                placeholder="Search books..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={onSearchChange}
                clearButtonMode="while-editing"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <FlatList
              data={books}
              keyExtractor={item => item.id}
              renderItem={({item}) => {
                const isSelected = selectedBook && selectedBook.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      iosPickerStyles.item,
                      isSelected && iosPickerStyles.selectedItem
                    ]}
                    onPress={() => onSelectBook(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      iosPickerStyles.itemText,
                      isSelected && iosPickerStyles.selectedItemText
                    ]}>
                      {getBookTitle(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={iosPickerStyles.listContainer}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                searchText ? (
                  <View style={iosPickerStyles.emptyContainer}>
                    <Text style={iosPickerStyles.emptyText}>
                      No books found matching "{searchText}"
                    </Text>
                  </View>
                ) : null
              }
              // Make sure the list takes available space after search box and header
              style={{ flex: 1 }}
              initialNumToRender={20}
              windowSize={10}
            />
          </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};