import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, loading, request } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Ionicons name="book" size={48} color="#FFFFFF" />
          </View>
          <Text style={s.appName}>지문냠냠</Text>
          <Text style={s.appSub}>영어 지문 학습 도우미</Text>
        </View>

        <View style={s.btnArea}>
          <TouchableOpacity
            style={[s.googleBtn, (signingIn || (Platform.OS !== 'web' && !request)) && s.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={signingIn || (Platform.OS !== 'web' && !request)}
            activeOpacity={0.85}
          >
            {signingIn ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#000000" />
            )}
            <Text style={s.googleBtnText}>
              {signingIn ? '로그인 중...' : 'Google로 로그인'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between', paddingVertical: 60 },
  logoArea: { alignItems: 'center', gap: 16 },
  logoBox: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  appName: { fontSize: 32, fontWeight: '900', color: '#000000', letterSpacing: -1 },
  appSub: { fontSize: 15, color: '#888888', fontWeight: '500' },
  btnArea: { gap: 16 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  btnDisabled: { opacity: 0.5 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
});
