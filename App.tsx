import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import { Syne_700Bold, useFonts } from '@expo-google-fonts/syne';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppNavigation } from './src/navigation/useAppNavigation';
import { PrivyAppProvider } from './src/providers/PrivyAppProvider';
import { BountyScreen } from './src/screens/BountyScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { colors } from './src/theme';
import { preventIosInputZoom } from './src/utils/preventIosInputZoom';

function AppShell() {
  const { selected, openBounty, goToFeed } = useAppNavigation();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {selected ? (
        <BountyScreen bounty={selected} onBack={goToFeed} />
      ) : (
        <FeedScreen onSelect={openBounty} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    preventIosInputZoom();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <PrivyAppProvider>
        <AppShell />
      </PrivyAppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
