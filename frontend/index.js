import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Web hover effects — injected as CSS for all platforms
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Hover effects for all interactive elements */
    [data-focusable="true"]:hover,
    button:hover { opacity: 0.85; transition: opacity 0.15s; }

    /* TouchableOpacity hover */
    div[tabindex]:hover { cursor: pointer; }

    /* Evidence cards hover */
    .evidence-card:hover { 
      border-color: #1A56DB !important;
      transform: translateY(-1px);
      transition: all 0.15s ease;
    }

    /* Nav items hover */
    .nav-item:hover {
      background: rgba(255,255,255,0.06) !important;
      transform: translateX(2px);
      transition: all 0.12s ease;
    }

    /* All RNW views that are pressable */
    .css-view-1dbjc4n[tabindex="0"]:hover {
      cursor: pointer;
    }

    /* Smooth transitions globally */
    * { transition-property: background-color, border-color, opacity, transform; transition-duration: 0.15s; transition-timing-function: ease; }
    input, textarea, select { transition: none; }
  `;
  document.head.appendChild(style);
}
