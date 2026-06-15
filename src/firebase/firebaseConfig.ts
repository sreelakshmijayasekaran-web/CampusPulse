import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence exists at runtime but is missing from current type defs
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB-rnz8R1lFpQez3TA6NANWvlwIS0F4y38",
  authDomain: "campuspulse-20a4c.firebaseapp.com",
  projectId: "campuspulse-20a4c",
  storageBucket: "campuspulse-20a4c.firebasestorage.app",
  messagingSenderId: "1011509951006",
  appId: "1:1011509951006:web:dbf6f7a6f2d9918ebf4c0f",
  measurementId: "G-JWK51FVNLV"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);