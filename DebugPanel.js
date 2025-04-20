// DebugPanel.js - Completely disabled for all environments
import React from 'react';

// Return null to render nothing in any environment
const DebugPanel = () => {
  if (__DEV__) console.log("MODULE 0012: DebugPanel");
  return null;
};

export default DebugPanel;