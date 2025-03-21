// IosPickers.js - iOS-specific picker components
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal } from 'react-native';
import { iosPickerStyles } from './iosPickerStyles';

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
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={iosPickerStyles.modalContainer}>
        <View style={iosPickerStyles.modalContent}>
          <View style={iosPickerStyles.modalHeader}>
            <TouchableOpacity
              style={iosPickerStyles.closeButton}
              onPress={onCancel}
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
            >
              <Text style={[
                iosPickerStyles.doneButtonText,
                !selectedLanguage && iosPickerStyles.disabledButton
              ]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={iosPickerStyles.searchInput}
            placeholder="Search languages..."
            value={searchText}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
            autoCapitalize="none"
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
                    iosPickerStyles.item,
                    isSelected && iosPickerStyles.selectedItem
                  ]}
                  onPress={() => onSelectLanguage(item)}
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
            contentContainerStyle={iosPickerStyles.itemList}
          />
        </View>
      </View>
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
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={iosPickerStyles.modalContainer}>
        <View style={iosPickerStyles.modalContent}>
          <View style={iosPickerStyles.modalHeader}>
            <TouchableOpacity
              style={iosPickerStyles.closeButton}
              onPress={onCancel}
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
            >
              <Text style={[
                iosPickerStyles.doneButtonText,
                !selectedBook && iosPickerStyles.disabledButton
              ]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={iosPickerStyles.searchInput}
            placeholder="Search books..."
            value={searchText}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          
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
            contentContainerStyle={iosPickerStyles.itemList}
          />
        </View>
      </View>
    </Modal>
  );
};

// iOS-specific selector button
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