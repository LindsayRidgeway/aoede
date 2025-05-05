// styles.js - Main styles file that imports and exports from module files
import { StyleSheet } from 'react-native';
import { homeStyles } from './homeStyles';
import { readingStyles } from './readingStyles';
import { libraryStyles } from './libraryStyles';

// Merge all styles into one object to maintain compatibility
export const styles = {
  ...homeStyles,
  ...readingStyles,
  ...libraryStyles,
};

export default styles;