// iosPickerStyles.js - iOS-specific styles for custom picker modals
import { StyleSheet } from 'react-native';

// iOS-specific styles for the modal picker components
export const iosPickerStyles = StyleSheet.create({
  inputButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  inputButtonText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    color: '#999'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '80%'
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 5
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  doneButton: {
    padding: 5
  },
  doneButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
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
  itemList: {
    paddingBottom: 20
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 15,
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
  disabledButton: {
    opacity: 0.5
  }
});