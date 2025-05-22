// index.js - Web Only version
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that the app loads correctly for web
if (__DEV__) console.log("MODULE 0083: index.registerRootComponent");
registerRootComponent(App);