# Aoede Gamepad Support

This README explains how to use gamepad controllers with the Aoede web application.

## Overview

Gamepad support has been added to the Aoede web application to enhance the user experience, especially for scenarios like hiking while listening to language content. The implementation follows a hybrid approach:

1. **Direct Button Mapping**: Primary shoulder buttons (L1/R1) are mapped directly to the most commonly used functions (Next Sentence and Listen/Stop)
2. **Spatial Navigation**: D-pad buttons allow navigation between UI elements (like a virtual cursor)

## Supported Controllers

The gamepad support should work with most standard controllers, including:

- Xbox controllers
- PlayStation controllers
- Nintendo Switch Pro controllers
- Generic USB/Bluetooth gamepads

## Button Mappings

The default button mappings are as follows:

| Controller Button | Function |
|-------------------|----------|
| Right Shoulder (R1) | Listen/Stop |
| Left Shoulder (L1) | Next Sentence |
| Left Trigger (L2) | Previous Sentence |
| Right Trigger (R2) | Go to Beginning of Book |
| Share/Select Button | Go to End of Book |
| A/Cross/Bottom Button | Click/Toggle the currently focused element |
| B/Circle/Right Button | Not mapped |
| X/Square/Left Button | Not mapped |
| Y/Triangle/Top Button | Not mapped |
| D-pad Up/Down/Left/Right | Navigate between UI elements |

## Using Gamepad Controls

1. **Connect your gamepad**: Connect your controller to your device via USB or Bluetooth before loading the Aoede web application
2. **Load a book**: Select a study language and book, then click "Load Book"
3. **Use shoulder buttons**: Use R1 to listen to the current sentence and L1 to advance to the next sentence
4. **Use D-pad**: Navigate between UI controls with the D-pad, and press A/Cross to activate the focused control
5. **Change settings**: Navigate to toggle switches and press A/Cross to toggle them on/off

## Spatial Navigation

The D-pad buttons provide intuitive spatial navigation throughout all parts of the app:

- **Home Panel**: Navigate between language selection, reading level, book selection, and buttons
- **Reading Panel**: Navigate between media controls, speed settings, toggle switches, and the home button
- **Library Panel**: Navigate between tabs, search inputs, book items, and action buttons
- **A/Cross Button**: Used to click buttons or toggle switches when they're focused

The navigation is smart - it will try to find the element that's most logically in the direction you're pressing.

## Hiking Mode

For hiking or hands-free use, the recommended approach is:

1. Load your book before starting your activity
2. Put your phone in your pocket with the screen on and Aoede open
3. Use the gamepad controller to:
   - Press R1 (right shoulder) to listen to sentences
   - Press L1 (left shoulder) to advance to the next sentence
   - Use L2/R2 for previous sentence or beginning of book

This allows you to control Aoede without looking at your screen, making it perfect for activities like hiking.

## Troubleshooting

- **Controller not detected**: Refresh the page after connecting your controller
- **Button presses not working**: Make sure you're in reading mode (after loading a book)
- **Wrong button mappings**: Different controllers may have slightly different button mappings. Try different buttons if the expected ones don't work
- **Toggle switches not responding**: Navigate to them with D-pad and press the A/Cross button to toggle

## Technical Implementation

The gamepad support is implemented in three main files:

1. `gamepadSupport.js` - Core implementation that detects gamepads and handles input
2. `ReadingUIGamepad.js` - Enhanced reading UI with gamepad support  
3. `UI.js` - Updated UI manager that initializes gamepad support

The implementation uses the Web Gamepad API which is supported in all modern browsers.
