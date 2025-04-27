// styles.js - Main styles file that imports and exports from module files
import { homeStyles } from './homeStyles';
import { readingStyles } from './readingStyles';

// Merge all styles into one object to maintain compatibility
const styles = {
  ...homeStyles,
  ...readingStyles,
};

export { styles };