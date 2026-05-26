import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '1079200503777-hqft8s1uhopci510327cgbmsmomfrqho.apps.googleusercontent.com';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'user'
  const [loading, setLoading] = useState(true);

  // Google 재인증 콜백 (PIN 초기화에 사용)
  const pendingReauthCallback = useRef(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Google OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      if (pendingReauthCallback.current) {
        // 재인증 모드: PIN 초기화용
        const callback = pendingReauthCallback.current;
        pendingReauthCallback.current = null;
        reauthenticateWithCredential(auth.currentUser, credential)
          .then(() => callback(true))
          .catch(() => callback(false));
      } else {
        // 일반 로그인
        signInWithCredential(auth, credential).catch((e) => {
          Alert.alert('로그인 오류', e.message);
        });
      }
    }
  }, [response]);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadOrCreateUserProfile(firebaseUser);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadOrCreateUserProfile = async (firebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserRole(snap.data().role || 'user');
      } else {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '사용자',
          photoURL: firebaseUser.photoURL || null,
          role: 'user',
          createdAt: serverTimestamp(),
        });
        setUserRole('user');
      }
    } catch (e) {
      console.error('loadOrCreateUserProfile error:', e);
      setUserRole('user');
    }
  };

  // 관리자 PIN으로 관리자 모드 진입
  const enterAdminMode = async (pin) => {
    try {
      const settingsRef = doc(db, 'settings', 'admin');
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) {
        // 최초 설정: 이 PIN이 관리자 PIN으로 저장됨
        await setDoc(settingsRef, { adminPin: pin });
        await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
        setUserRole('admin');
        return { success: true, isFirstSetup: true };
      }
      if (snap.data().adminPin === pin) {
        await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
        setUserRole('admin');
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.error('enterAdminMode error:', e);
      return { success: false };
    }
  };

  // 관리자 PIN 변경 (현재 PIN 알 때)
  const changeAdminPin = async (currentPin, newPin) => {
    try {
      const settingsRef = doc(db, 'settings', 'admin');
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) return { success: false, message: '관리자 정보가 없습니다.' };
      if (snap.data().adminPin !== currentPin) return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
      await setDoc(settingsRef, { adminPin: newPin }, { merge: true });
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  // Google 재인증 후 PIN 초기화 (PIN 잊어버렸을 때)
  const reauthAndResetPin = (newPin) => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        reauthenticateWithPopup(auth.currentUser, provider)
          .then(async () => {
            await setDoc(doc(db, 'settings', 'admin'), { adminPin: newPin }, { merge: true });
            resolve({ success: true });
          })
          .catch((e) => resolve({ success: false, message: e.message }));
      } else {
        // 재인증 콜백 등록 후 Google 로그인 트리거
        pendingReauthCallback.current = async (ok) => {
          if (!ok) {
            resolve({ success: false, message: 'Google 재인증에 실패했습니다.' });
            return;
          }
          try {
            await setDoc(doc(db, 'settings', 'admin'), { adminPin: newPin }, { merge: true });
            resolve({ success: true });
          } catch (e) {
            resolve({ success: false, message: e.message });
          }
        };
        promptAsync();
      }
    });
  };

  // 구글 로그인
  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        Alert.alert('로그인 오류', e.message);
      }
    } else {
      promptAsync();
    }
  };

  // 로그아웃
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      request,
      signInWithGoogle,
      signOut,
      enterAdminMode,
      changeAdminPin,
      reauthAndResetPin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
