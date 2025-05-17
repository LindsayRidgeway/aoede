// gamepadSupport.js - Adds gamepad/controller support to Aoede web version
import { Platform } from 'react-native';

class GamepadManager {
  constructor() {
    // Only enable on web platform
    this.isWeb = Platform.OS === 'web';
    this.enabled = this.isWeb;
    
    // Tracking for connected gamepads
    this.gamepads = {};
    this.haveEvents = false;
    
    // Track button states to prevent repeating actions
    this.buttonStates = {};
    
    // Navigation config 
    this.focusableSelectors = [
      // Reading UI elements
      '#begin-button', // First button (Beginning of book)
      '#prev-button',  // Previous sentence
      '#listen-button', // Listen/Stop
      '#next-button',   // Next sentence
      '#end-button',    // End of book
      '#speed-1', '#speed-2', '#speed-3', '#speed-4', '#speed-5', // Speed controls
      '#articulation-toggle', '#autoplay-toggle', 
      '#showtext-toggle', '#showtranslation-toggle',
      '#home-button', // Home button
      
      // Home UI elements
      'select[name="studyLanguage"]', // Study language dropdown
      'select[name="readingLevel"]', // Reading level buttons or dropdown
      'select[name="selectedBook"]', // Book selection dropdown
      '#library-button', // Library button
      '#load-book-button', // Load book button
      
      // Library UI elements
      '#library-close-button', // Library close button
      '.tab-button', // Tab buttons
      '#search-input', // Search input
      '#search-button', // Search button
      '.book-item', // Book items in the library
      '.book-action-button', // Book action buttons (add, delete, etc.)
    ];
    
    // Track current focus index
    this.currentFocusIndex = -1;
    
    // Callbacks for button presses
    this.buttonHandlers = {
      next: null,
      listen: null,
      previous: null,
      beginningOfBook: null,
      endOfBook: null
    };
    
    // Polling interval (milliseconds)
    this.pollInterval = 100;
    this.intervalId = null;
    
    // Button to function mappings (customizable)
    this.buttonMappings = {
      // Playstation controller mapping example
      // Right shoulder button (R1) for Listen/Stop
      5: 'beginningOfBook',
      
      // Left shoulder button (L1) for Next Sentence
      4: 'previous',
      
      // Left trigger (L2) for Previous Sentence
      6: 'next',
      
      // Right trigger (R2) for Beginning of Book
      7: 'listen',
      
      // Share button for End of Book
      8: 'endOfBook',
      
      // Generic mappings (should work on many controllers)
      // A/Cross/Bottom button - primary action (click focused element)
      0: 'primary',
      
      // B/Circle/Right button - not mapped
      // 1: 'secondary',
      
      // X/Square/Left button - not mapped
      // 2: 'tertiary',
      
      // Y/Triangle/Top button - not mapped
      // 3: 'quaternary',
      
      // D-pad mappings
      12: 'dpadUp',
      13: 'dpadDown',
      14: 'dpadLeft',
      15: 'dpadRight',
    };
  }

  // Initialize the gamepad manager
  init() {
    if (!this.isWeb || !this.enabled) return;
    
    // Don't initialize twice
    if (this.haveEvents) return;
    
    // Setup the appropriate event listeners
    if (typeof window !== 'undefined') {
      // Check if the Gamepad API is available
      if ('GamepadEvent' in window) {
        // Modern browsers have the GamepadEvent
        window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
        window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
        this.haveEvents = true;
      } else if ('WebKitGamepadEvent' in window) {
        // Webkit-specific event
        window.addEventListener('webkitgamepadconnected', this.onGamepadConnected.bind(this));
        window.addEventListener('webkitgamepaddisconnected', this.onGamepadDisconnected.bind(this));
        this.haveEvents = true;
      } else {
        // Fallback to polling for older browsers
        this.startPolling();
      }
      
      // Always start polling for actual button states
      this.startPolling();
      
      console.log('Gamepad support initialized');
    }
    
    return this;
  }
  
  // Register callback handlers for button presses
  registerCallbacks({
    onNext,
    onListen,
    onPrevious,
    onBeginningOfBook,
    onEndOfBook
  }) {
    this.buttonHandlers = {
      next: onNext,
      listen: onListen,
      previous: onPrevious,
      beginningOfBook: onBeginningOfBook,
      endOfBook: onEndOfBook
    };
    
    return this;
  }
  
  // Handle gamepad connection event
  onGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    this.gamepads[event.gamepad.index] = event.gamepad;
    
    // If we're not already polling, start now
    if (!this.intervalId) {
      this.startPolling();
    }
  }
  
  // Handle gamepad disconnection event
  onGamepadDisconnected(event) {
    console.log('Gamepad disconnected:', event.gamepad.id);
    delete this.gamepads[event.gamepad.index];
    
    // If no gamepads left, stop polling
    if (Object.keys(this.gamepads).length === 0) {
      this.stopPolling();
    }
  }
  
  // Start polling for gamepad input
  startPolling() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.pollGamepads();
    }, this.pollInterval);
  }
  
  // Stop polling for gamepad input
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  // Poll for gamepad state
  pollGamepads() {
    if (!this.isWeb || !this.enabled) return;
    
    // Feature detect and get gamepads
    if (!navigator.getGamepads) {
      return;
    }
    
    // Get the latest gamepad states
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    // Process each gamepad
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      
      // Skip disconnected gamepads
      if (!gamepad) continue;
      
      // Store the gamepad for future reference
      this.gamepads[gamepad.index] = gamepad;
      
      // Process button states
      this.processGamepadInput(gamepad);
    }
  }
  
  // Process input from a gamepad
  processGamepadInput(gamepad) {
    if (!gamepad || !gamepad.buttons) return;
    
    const buttonStates = this.buttonStates[gamepad.index] || {};
    
    // Check each button
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = gamepad.buttons[i];
      const pressed = button.pressed || button.value > 0.5;
      const prevState = buttonStates[i] || false;
      
      // Only trigger on button down (not held)
      if (pressed && !prevState) {
        this.handleButtonPress(i);
      }
      
      // Update button state
      buttonStates[i] = pressed;
    }
    
    // Process axes for d-pad emulation
    if (gamepad.axes && gamepad.axes.length >= 2) {
      // Horizontal axis (left stick)
      if (Math.abs(gamepad.axes[0]) > 0.7) {
        const direction = gamepad.axes[0] > 0 ? 'dpadRight' : 'dpadLeft';
        const axisKey = `axis0_${direction}`;
        
        if (!buttonStates[axisKey]) {
          this.handleDirectionalInput(direction);
          buttonStates[axisKey] = true;
        }
      } else {
        // Reset axis state when returned to center
        buttonStates['axis0_dpadRight'] = false;
        buttonStates['axis0_dpadLeft'] = false;
      }
      
      // Vertical axis (left stick)
      if (Math.abs(gamepad.axes[1]) > 0.7) {
        const direction = gamepad.axes[1] > 0 ? 'dpadDown' : 'dpadUp';
        const axisKey = `axis1_${direction}`;
        
        if (!buttonStates[axisKey]) {
          this.handleDirectionalInput(direction);
          buttonStates[axisKey] = true;
        }
      } else {
        // Reset axis state when returned to center
        buttonStates['axis1_dpadUp'] = false;
        buttonStates['axis1_dpadDown'] = false;
      }
    }
    
    // Save updated button states
    this.buttonStates[gamepad.index] = buttonStates;
  }
  
  // Handle a button press
  handleButtonPress(buttonIndex) {
    // Get the mapped function for this button
    const action = this.buttonMappings[buttonIndex];
    
    // If no mapping exists, ignore
    if (!action) return;
    
    console.log(`Button ${buttonIndex} pressed, mapped to ${action}`);
    
    // Handle different actions
    switch (action) {
      case 'next':
        if (this.buttonHandlers.next) {
          this.buttonHandlers.next();
        }
        break;
        
      case 'listen':
        if (this.buttonHandlers.listen) {
          this.buttonHandlers.listen();
        }
        break;
        
      case 'previous':
        if (this.buttonHandlers.previous) {
          this.buttonHandlers.previous();
        }
        break;
        
      case 'beginningOfBook':
        if (this.buttonHandlers.beginningOfBook) {
          this.buttonHandlers.beginningOfBook();
        }
        break;
        
      case 'endOfBook':
        if (this.buttonHandlers.endOfBook) {
          this.buttonHandlers.endOfBook();
        }
        break;
        
      case 'primary':
        // If an element is focused, click it
        this.clickCurrentFocusedElement();
        break;
        
      case 'dpadUp':
      case 'dpadDown':
      case 'dpadLeft':
      case 'dpadRight':
        this.handleDirectionalInput(action);
        break;
    }
  }
  
  // Handle directional input for focus navigation
  handleDirectionalInput(direction) {
    if (!this.isWeb || typeof document === 'undefined') return;
    
    // Get all focusable elements
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;
    
    // If no element is currently focused, focus the first one
    if (this.currentFocusIndex === -1) {
      this.currentFocusIndex = 0;
      focusableElements[0].focus();
      return;
    }
    
    // Current focused element position
    const current = this.currentFocusIndex;
    let next = current;
    
    // Get the position and dimensions of all elements
    const elementRects = focusableElements.map(el => el.getBoundingClientRect());
    const currentRect = elementRects[current];
    
    // Special logic for speed controls
    if (direction === 'dpadLeft' || direction === 'dpadRight') {
      // Check if current element is a speed control
      const currentElement = focusableElements[current];
      if (currentElement && currentElement.id && currentElement.id.startsWith('speed-')) {
        const speedNum = parseInt(currentElement.id.split('-')[1], 10);
        
        if (direction === 'dpadLeft' && speedNum > 1) {
          // Find the previous speed element
          const prevSpeedId = `speed-${speedNum - 1}`;
          const prevIndex = focusableElements.findIndex(el => el.id === prevSpeedId);
          if (prevIndex !== -1) {
            next = prevIndex;
          }
        } else if (direction === 'dpadRight' && speedNum < 5) {
          // Find the next speed element
          const nextSpeedId = `speed-${speedNum + 1}`;
          const nextIndex = focusableElements.findIndex(el => el.id === nextSpeedId);
          if (nextIndex !== -1) {
            next = nextIndex;
          }
        }
        
        if (next !== current) {
          this.currentFocusIndex = next;
          focusableElements[next].focus();
          return;
        }
      }
    }
    
    // General spatial navigation
    switch (direction) {
      case 'dpadUp': {
        // Find elements that are above the current element
        const aboveElements = focusableElements.filter((el, index) => {
          if (index === current) return false;
          const rect = elementRects[index];
          return rect.bottom <= currentRect.top + 5 && // Is above
                 (rect.right >= currentRect.left && rect.left <= currentRect.right); // Horizontally overlapping
        });
        
        if (aboveElements.length > 0) {
          // Find the closest element above
          let closestIndex = -1;
          let closestDistance = Infinity;
          
          aboveElements.forEach((el, i) => {
            const index = focusableElements.indexOf(el);
            const rect = elementRects[index];
            const verticalDistance = currentRect.top - rect.bottom;
            const horizontalMidpoint = rect.left + (rect.width / 2);
            const currentMidpoint = currentRect.left + (currentRect.width / 2);
            const horizontalDistance = Math.abs(horizontalMidpoint - currentMidpoint);
            
            // Prioritize elements that are directly above
            const totalDistance = verticalDistance + (horizontalDistance * 0.5);
            
            if (totalDistance < closestDistance) {
              closestDistance = totalDistance;
              closestIndex = index;
            }
          });
          
          if (closestIndex !== -1) {
            next = closestIndex;
          } else {
            // Simple fallback - go to previous element
            next = Math.max(0, current - 1);
          }
        } else {
          // No elements above, just go to previous element
          next = Math.max(0, current - 1);
        }
        break;
      }
      
      case 'dpadDown': {
        // Find elements that are below the current element
        const belowElements = focusableElements.filter((el, index) => {
          if (index === current) return false;
          const rect = elementRects[index];
          return rect.top >= currentRect.bottom - 5 && // Is below
                 (rect.right >= currentRect.left && rect.left <= currentRect.right); // Horizontally overlapping
        });
        
        if (belowElements.length > 0) {
          // Find the closest element below
          let closestIndex = -1;
          let closestDistance = Infinity;
          
          belowElements.forEach((el, i) => {
            const index = focusableElements.indexOf(el);
            const rect = elementRects[index];
            const verticalDistance = rect.top - currentRect.bottom;
            const horizontalMidpoint = rect.left + (rect.width / 2);
            const currentMidpoint = currentRect.left + (currentRect.width / 2);
            const horizontalDistance = Math.abs(horizontalMidpoint - currentMidpoint);
            
            // Prioritize elements that are directly below
            const totalDistance = verticalDistance + (horizontalDistance * 0.5);
            
            if (totalDistance < closestDistance) {
              closestDistance = totalDistance;
              closestIndex = index;
            }
          });
          
          if (closestIndex !== -1) {
            next = closestIndex;
          } else {
            // Simple fallback - go to next element
            next = Math.min(focusableElements.length - 1, current + 1);
          }
        } else {
          // No elements below, just go to next element
          next = Math.min(focusableElements.length - 1, current + 1);
        }
        break;
      }
      
      case 'dpadLeft': {
        // Find elements that are to the left of the current element
        const leftElements = focusableElements.filter((el, index) => {
          if (index === current) return false;
          const rect = elementRects[index];
          return rect.right <= currentRect.left + 5 && // Is to the left
                 (rect.bottom >= currentRect.top && rect.top <= currentRect.bottom); // Vertically overlapping
        });
        
        if (leftElements.length > 0) {
          // Find the closest element to the left
          let closestIndex = -1;
          let closestDistance = Infinity;
          
          leftElements.forEach((el, i) => {
            const index = focusableElements.indexOf(el);
            const rect = elementRects[index];
            const horizontalDistance = currentRect.left - rect.right;
            const verticalMidpoint = rect.top + (rect.height / 2);
            const currentMidpoint = currentRect.top + (currentRect.height / 2);
            const verticalDistance = Math.abs(verticalMidpoint - currentMidpoint);
            
            // Prioritize elements that are directly to the left
            const totalDistance = horizontalDistance + (verticalDistance * 0.5);
            
            if (totalDistance < closestDistance) {
              closestDistance = totalDistance;
              closestIndex = index;
            }
          });
          
          if (closestIndex !== -1) {
            next = closestIndex;
          } else {
            // Simple fallback - go to previous element
            next = Math.max(0, current - 1);
          }
        } else {
          // No elements to the left, just go to previous element
          next = Math.max(0, current - 1);
        }
        break;
      }
      
      case 'dpadRight': {
        // Find elements that are to the right of the current element
        const rightElements = focusableElements.filter((el, index) => {
          if (index === current) return false;
          const rect = elementRects[index];
          return rect.left >= currentRect.right - 5 && // Is to the right
                 (rect.bottom >= currentRect.top && rect.top <= currentRect.bottom); // Vertically overlapping
        });
        
        if (rightElements.length > 0) {
          // Find the closest element to the right
          let closestIndex = -1;
          let closestDistance = Infinity;
          
          rightElements.forEach((el, i) => {
            const index = focusableElements.indexOf(el);
            const rect = elementRects[index];
            const horizontalDistance = rect.left - currentRect.right;
            const verticalMidpoint = rect.top + (rect.height / 2);
            const currentMidpoint = currentRect.top + (currentRect.height / 2);
            const verticalDistance = Math.abs(verticalMidpoint - currentMidpoint);
            
            // Prioritize elements that are directly to the right
            const totalDistance = horizontalDistance + (verticalDistance * 0.5);
            
            if (totalDistance < closestDistance) {
              closestDistance = totalDistance;
              closestIndex = index;
            }
          });
          
          if (closestIndex !== -1) {
            next = closestIndex;
          } else {
            // Simple fallback - go to next element
            next = Math.min(focusableElements.length - 1, current + 1);
          }
        } else {
          // No elements to the right, just go to next element
          next = Math.min(focusableElements.length - 1, current + 1);
        }
        break;
      }
    }
    
    // If we have a new focus target
    if (next !== current && focusableElements[next]) {
      this.currentFocusIndex = next;
      focusableElements[next].focus();
      
      // Ensure the element is visible by scrolling to it if needed
      focusableElements[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  
  // Get all focusable elements
  getFocusableElements() {
    if (!this.isWeb || typeof document === 'undefined') return [];
    
    // Get elements matching our selectors
    const elements = [];
    
    // First try to get elements by ID
    this.focusableSelectors.forEach(selector => {
      if (selector.startsWith('#')) {
        const element = document.querySelector(selector);
        if (element) {
          elements.push(element);
        }
      }
    });
    
    // Then try class selectors
    this.focusableSelectors.forEach(selector => {
      if (selector.startsWith('.')) {
        const matchingElements = document.querySelectorAll(selector);
        if (matchingElements.length > 0) {
          matchingElements.forEach(el => {
            // Only add if we don't already have this element
            if (!elements.includes(el)) {
              elements.push(el);
            }
          });
        }
      }
    });
    
    // Then try tag and attribute selectors
    this.focusableSelectors.forEach(selector => {
      if (!selector.startsWith('#') && !selector.startsWith('.')) {
        const matchingElements = document.querySelectorAll(selector);
        if (matchingElements.length > 0) {
          matchingElements.forEach(el => {
            // Only add if we don't already have this element
            if (!elements.includes(el)) {
              elements.push(el);
            }
          });
        }
      }
    });
    
    // Add custom selectors for elements that might not have explicit IDs
    // For example, finding all buttons
    const allButtons = document.querySelectorAll('button, [role="button"]');
    allButtons.forEach(button => {
      if (!elements.includes(button) && 
          getComputedStyle(button).display !== 'none' && 
          getComputedStyle(button).visibility !== 'hidden') {
        elements.push(button);
      }
    });
    
    // Get selects and inputs that are visible
    const inputs = document.querySelectorAll('select, input[type="text"], input[type="search"]');
    inputs.forEach(input => {
      if (!elements.includes(input) && 
          getComputedStyle(input).display !== 'none' && 
          getComputedStyle(input).visibility !== 'hidden') {
        elements.push(input);
      }
    });
    
    // Filter out hidden elements
    return elements.filter(el => {
      // Check if element is visible in DOM
      return el.offsetParent !== null || 
             getComputedStyle(el).position === 'fixed' ||
             getComputedStyle(el).position === 'sticky';
    });
  }
  
  // Click the currently focused element
  clickCurrentFocusedElement() {
    if (!this.isWeb || typeof document === 'undefined') return;
    
    // If nothing is focused, do nothing
    if (this.currentFocusIndex === -1) return;
    
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length <= this.currentFocusIndex) return;
    
    // Get the focused element
    const focusedElement = focusableElements[this.currentFocusIndex];
    
    // Special handling for Switch elements
    if (focusedElement.id && (
        focusedElement.id === 'articulation-toggle' ||
        focusedElement.id === 'autoplay-toggle' ||
        focusedElement.id === 'showtext-toggle' ||
        focusedElement.id === 'showtranslation-toggle'
    )) {
      // Find the actual switch input (which should be a child or within the element)
      const switchInput = focusedElement.querySelector('input[type="checkbox"]') || 
                         document.getElementById(focusedElement.id + '-input');
      
      if (switchInput) {
        // Toggle the checkbox state
        const newValue = !switchInput.checked;
        
        // Simulate a change event - React Native Web uses synthetic events
        const event = new Event('change', { bubbles: true });
        
        // Set the new checked value in the event target
        Object.defineProperty(event, 'target', { 
          writable: false,
          value: { checked: newValue }
        });
        
        // Dispatch the event
        switchInput.dispatchEvent(event);
        
        console.log(`Toggled switch ${focusedElement.id} to ${newValue}`);
        return;
      } else {
        // If we couldn't find the actual input, try clicking the parent element
        focusedElement.click();
        return;
      }
    }
    
    // Click the element for regular buttons
    focusedElement.click();
  }
  
  // Enable gamepad support
  enable() {
    if (this.isWeb) {
      this.enabled = true;
      this.init();
    }
  }
  
  // Disable gamepad support
  disable() {
    this.enabled = false;
    this.stopPolling();
  }
}

// Export a singleton instance
const gamepadManager = new GamepadManager();
export default gamepadManager;
