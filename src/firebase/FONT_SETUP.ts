// ─────────────────────────────────────────────────────────────────────────────
// FONT SETUP — Read this before using login.tsx and signup.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// Step 1 — Install expo-font and @expo-google-fonts/sora
//
//   npx expo install expo-font @expo-google-fonts/sora
//
// Step 2 — Update your app/_layout.tsx (or app/index.tsx root)
//   Add the font loader at the top level so fonts are ready before any screen.
//   Copy the snippet below into your _layout.tsx:


/*
import { useFonts } from 'expo-font';
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
*/


// Step 3 — Drop login.tsx and signup.tsx into your app/ folder
//   Replace the existing files. All logic is unchanged.
//
// That's it! The Sora font will load on app start and apply to both pages.
// ─────────────────────────────────────────────────────────────────────────────