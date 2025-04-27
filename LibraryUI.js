// LibraryUI.js - Component for the library screen with book listing and delete functionality
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, Modal,
  ScrollView, SafeAreaView, Alert,
  FlatList, ActivityIndicator
} from 'react-native';
import { styles } from './styles';
import { getUserLibrary, removeBookFromLibrary } from './userLibrary';

export function LibraryUI({
  visible,
  onClose,
  uiText
}) {
  // State for user's book library
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh

  // Load user's library when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadLibrary();
    }
  }, [visible, refreshKey]);

  // Load the user's library
  const loadLibrary = async () => {
    setLoading(true);
    try {
      const userLibrary = await getUserLibrary();
      setBooks(userLibrary);
    } catch (error) {
      console.error("Error loading library:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get translated book title if available
  const getBookTitle = (book) => {
    // Try to get translated title from uiText
    const translatedTitle = uiText[book.id] || uiText[`${book.id}Title`] || uiText[book.id + 'Title'];
    return translatedTitle || book.title;
  };

  // Handle book deletion
  const handleDeleteBook = (book) => {
    // Confirm deletion with alert
    Alert.alert(
      uiText.deleteBook || "Delete Book",
      `${uiText.confirmDelete || "Are you sure you want to delete"} "${getBookTitle(book)}" ${uiText.fromLibrary || "from your library"}?`,
      [
        {
          text: uiText.cancel || "Cancel",
          style: "cancel"
        },
        {
          text: uiText.yes || "Yes",
          onPress: async () => {
            try {
              const success = await removeBookFromLibrary(book.id);
              if (success) {
                // Refresh the list
                setRefreshKey(prevKey => prevKey + 1);
              } else {
                throw new Error("Failed to delete book");
              }
            } catch (error) {
              console.error("Error deleting book:", error);
              Alert.alert(
                uiText.error || "Error",
                `${uiText.errorDeletingBook || "Error deleting book"}: ${error.message}`
              );
            }
          }
        }
      ]
    );
  };

  // Render a book item
  const renderBookItem = ({ item }) => (
    <View style={styles.bookListItem}>
      <View style={styles.bookInfoContainer}>
        <Text style={styles.bookTitle}>{getBookTitle(item)}</Text>
        <Text style={styles.bookLanguage}>{item.language}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBook(item)}
      >
        <Text style={styles.deleteButtonText}>{uiText.deleteBook || "Delete"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.libraryModal}>
        <View style={styles.libraryContentWrapper}>
          {/* Header with Exit button */}
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>
              {uiText.library || "Library"}
            </Text>
            <TouchableOpacity 
              style={styles.exitButton} 
              onPress={onClose}
            >
              <Text style={styles.exitButtonText}>
                {uiText.exit || "Exit"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Scrollable content area */}
          <View style={styles.libraryContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#800020" />
                <Text style={styles.loadingText}>
                  {uiText.loading || "Loading..."}
                </Text>
              </View>
            ) : books.length === 0 ? (
              <View style={styles.emptyLibraryContainer}>
                <Text style={styles.emptyLibraryText}>
                  {uiText.emptyLibrary || "Your library is empty."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={books}
                renderItem={renderBookItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.bookList}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}