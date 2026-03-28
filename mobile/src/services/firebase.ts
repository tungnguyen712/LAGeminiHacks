import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBIkut_eN4NbyeKbpIqKzUPgI_BDwVpHJE',
  authDomain: 'pathsense-677d5.firebaseapp.com',
  projectId: 'pathsense-677d5',
  storageBucket: 'pathsense-677d5.firebasestorage.app',
  messagingSenderId: '325202564891',
  appId: '1:325202564891:web:8dc26883dd6fbb5c6a25be',
  measurementId: 'G-QB0R5ESRKX',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
