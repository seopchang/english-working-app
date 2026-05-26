import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDnHJEynV8JXqZBvhgWU_OPYCyrMDvp8kY',
  authDomain: 'english-working-app.firebaseapp.com',
  projectId: 'english-working-app',
  storageBucket: 'english-working-app.firebasestorage.app',
  messagingSenderId: '1079200503777',
  appId: '1:1079200503777:web:a0a711e283e55d461de4a0',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// 웹과 네이티브 환경에서 Auth 초기화 방식이 다름
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
