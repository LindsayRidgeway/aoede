// iosPickerStyles.js - iOS-specific styles for modal pickers
import { StyleSheet, Dimensions } from 'react-native';

// Get screen dimensions for proper sizing
const { width, height } = Dimensions.get('window');

// iOS-specific styles for the modal picker components
export const iosPickerStyles = StyleSheet.create({
  // Selector button styles
  inputButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    width: '100%'
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
  
  // Modal container styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalContent: {
    width: width,
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingBottom: 30, // Extra padding for iOS home indicator
    maxHeight: height * 0.8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1
  },
  closeButton: {
    padding: 5
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '400'
  },
  doneButton: {
    padding: 5
  },
  doneButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  
  // Search input styles
  searchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16
  },
  
  // List styles
  listContainer: {
    flexGrow: 1
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  itemText: {
    fontSize: 16,
    color: '#333'
  },
  selectedItem: {
    backgroundColor: '#f0f9ff'
  },
  selectedItemText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  
  // Empty state
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