// styles.js - Main styles file that imports and exports from module files
import { homeStyles } from './homeStyles';
import { readingStyles } from './readingStyles';
import { libraryStyles } from './libraryStyles';

// Merge all styles into one object to maintain compatibility
const styles = {
  ...homeStyles,
  ...readingStyles,
  ...libraryStyles,
};

export { styles };