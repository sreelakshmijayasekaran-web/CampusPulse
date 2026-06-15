import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);