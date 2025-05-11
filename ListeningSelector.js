import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, FlatList, 
  Modal, ActivityIndicator, StyleSheet, Platform
} from 'react-native';
import { apiGetSupportedLanguages } from './apiServices';

const LanguageSelector = ({ 
  value, 
  onChangeLanguage, 
  placeholder, 
  label, 
  containerStyle,
  labelStyle,
  style,
  disabled = false,
  uiText = {}
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [languages, setLanguages] = useState([]);
  const [filteredLanguages, setFilteredLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch languages on component mount
  useEffect(() => {
    fetchLanguages();
  }, []);
  
  // Filter languages when search text changes
  useEffect(() => {
    if (languages.length > 0 && searchText) {
      const filtered = languages.filter(lang => 
        lang.name.toLowerCase().includes(searchText.toLowerCase()) ||
        lang.language.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages(languages);
    }
  }, [searchText, languages]);
  
  // Fetch languages from the centralized API function
  const fetchLanguages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const languageList = await apiGetSupportedLanguages();
      
      if (languageList && Array.isArray(languageList)) {
        // Sort languages alphabetically by name
        const sortedLanguages = [...languageList].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        setLanguages(sortedLanguages);
        setFilteredLanguages(sortedLanguages);
      } else {
        setError('Failed to load languages');
      }
    } catch (err) {
      console.error('Error fetching languages:', err);
      setError('Error loading languages');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle language selection
  const handleSelect = (language) => {
    if (onChangeLanguage) {
      onChangeLanguage(language.name, language.language);
    }
    setModalVisible(false);
    setSearchText('');
  };
  
  // Render language item for the list
  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.languageItem} 
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.languageName}>{item.name}</Text>
      <Text style={styles.languageCode}>{item.language}</Text>
    </TouchableOpacity>
  );
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.selectorButton,
          style,
          disabled && styles.disabledButton
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text 
          style={[
            styles.selectorText, 
            !value && styles.placeholderText
          ]}
          numberOfLines={1}
        >
          {value || placeholder || "Select language"}
        </Text>
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {uiText.selectLanguage || "Select Language"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder={uiText.searchLanguages || "Search languages..."}
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3a7ca5" />
                <Text style={styles.loadingText}>
                  {uiText.loadingLanguages || "Loading languages..."}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchLanguages}>
                  <Text style={styles.retryText}>
                    {uiText.retry || "Retry"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredLanguages}
                renderItem={renderLanguageItem}
                keyExtractor={item => item.language}
                contentContainerStyle={styles.languageList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {uiText.noLanguagesFound || "No languages found"}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
    color: '#666'
  },
  selectorButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  selectorText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    color: '#999'
  },
  disabledButton: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.2)'
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#f0f0f0'
  },
  closeButtonText: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold'
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    margin: 10,
    backgroundColor: '#f9f9f9'
  },
  languageList: {
    paddingHorizontal: 10,
    paddingBottom: 20
  },
  languageItem: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  languageName: {
    fontSize: 16,
    color: '#333'
  },
  languageCode: {
    fontSize: 14,
    color: '#888',
    textAlign: 'right'
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center'
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#3a7ca5',
    borderRadius: 5
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666'
  }
});

export default LanguageSelector;