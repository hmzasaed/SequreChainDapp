import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './src/context/AppContext';
import CustomDrawer from './src/components/CustomDrawer';
import LandingScreen         from './src/screens/LandingScreen';
import DashboardScreen       from './src/screens/DashboardScreen';
import UploadEvidenceScreen  from './src/screens/UploadEvidenceScreen';
import EvidenceHistoryScreen from './src/screens/EvidenceHistoryScreen';
import BrowseEvidenceScreen  from './src/screens/BrowseEvidenceScreen';
import EvidenceDetailScreen  from './src/screens/EvidenceDetailScreen';
import SearchScreen          from './src/screens/SearchScreen';
import IntegrityVerifyScreen from './src/screens/IntegrityVerifyScreen';
import SettingsScreen        from './src/screens/SettingsScreen';
import { COLORS, GOOGLE_FONTS_URL } from './src/utils/theme';

const Drawer = createDrawerNavigator();
const Stack  = createNativeStackNavigator();

// Deep linking configuration for browser history support
const linking = {
  prefixes: ['https://sequrechain.app', 'http://localhost:19006', 'http://localhost:3000', 'http://localhost:8081', 'http://127.0.0.1:8081', 'exp://localhost:19006'],
  config: {
    screens: {
      Landing: 'landing',
      Main: {
        screens: {
          Dashboard: 'dashboard',
          UploadEvidence: 'upload',
          EvidenceHistory: 'history',
          BrowseEvidence: 'browse',
          Search: 'search',
          IntegrityVerify: 'verify',
          Settings: 'settings',
        },
      },
      EvidenceDetail: 'evidence/:evidenceId',
    },
  },
};

function DrawerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{ headerShown:false, drawerStyle:{ backgroundColor:COLORS.drawerBg, width:280 }, overlayColor:'rgba(0,0,0,0.6)' }}>
      <Drawer.Screen name="Dashboard"       component={DashboardScreen} />
      <Drawer.Screen name="UploadEvidence"  component={UploadEvidenceScreen} />
      <Drawer.Screen name="EvidenceHistory" component={EvidenceHistoryScreen} />
      <Drawer.Screen name="BrowseEvidence"  component={BrowseEvidenceScreen} />
      <Drawer.Screen name="Search"          component={SearchScreen} />
      <Drawer.Screen name="IntegrityVerify" component={IntegrityVerifyScreen} />
      <Drawer.Screen name="Settings"        component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
export default function App() {
  const [initialRoute, setInitialRoute] = React.useState('Landing');
  const navigationRef = React.useRef();

  React.useEffect(() => {
    // Load Google Fonts on web
    if (typeof window !== 'undefined' && !document.querySelector('link[href*="fonts.googleapis.com"]')) {
      const link = document.createElement('link');
      link.href = GOOGLE_FONTS_URL;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  React.useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      if (navigationRef.current) {
        navigationRef.current.goBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex:1 }}>
      <SafeAreaProvider><AppProvider>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          fallback={<LandingScreen />}
          onReady={() => {
            // Enable history state when ready
            if (typeof window !== 'undefined' && window.history) {
              const unsubscribe = navigationRef.current?.addListener('state', ({ data }) => {
                try {
                  window.history.pushState({ navState: data }, '');
                } catch (e) {
                  // Silently fail if history state unavailable
                }
              });
              return unsubscribe;
            }
          }}
        >
          <StatusBar style="light" backgroundColor={COLORS.darkBg} />
          <Stack.Navigator screenOptions={{ headerShown:false, animation:'fade' }}>
            <Stack.Screen name="Landing"        component={LandingScreen} />
            <Stack.Screen name="Main"           component={DrawerNavigator} />
            <Stack.Screen name="EvidenceDetail" component={EvidenceDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider></SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
