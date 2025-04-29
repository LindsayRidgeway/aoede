import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
const { parseHTML } = require('linkedom');

const LibraryUI = () => {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('https://aoede.pro/books/library-hub.html');
      const hubText = await response.text();
      const { document: hubDoc } = parseHTML(hubText);
      const bookElements = hubDoc.querySelectorAll('a.book-link');

      const booksArray = Array.from(bookElements).map(el => ({
        title: el.textContent,
        url: el.getAttribute('href'),
      }));

      setBooks(booksArray);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://aoede.pro/books/search/${searchTerm}.html`);
      const html = await response.text();
      const { document: doc } = parseHTML(html);
      const searchElements = doc.querySelectorAll('a.search-result');

      const resultsArray = Array.from(searchElements).map(el => ({
        title: el.textContent,
        url: el.getAttribute('href'),
      }));

      setSearchResults(resultsArray);
    } catch (error) {
      console.error('Error during search:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => console.log('Selected:', item.url)}>
      <View style={styles.item}>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for a book"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <Button title="Search" onPress={handleSearch} />
      <FlatList
        data={searchResults.length > 0 ? searchResults : books}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 18,
  },
});

export default LibraryUI;
