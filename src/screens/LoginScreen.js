import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, enterAdminMode, userRole, user, loading, request } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  // 관리자 PIN 모달
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const handleAdminPin = async () => {
    if (pin.length < 4) {
      Alert.alert('오류', 'PIN은 4자리 이상 입력해주세요.');
      return;
    }
    setPinLoading(true);
    const result = await enterAdminMode(pin);
    setPinLoading(false);
    if (result.success) {
      setPinModalVisible(false);
      setPin('');
      if (result.isFirstSetup) {
        Alert.alert('관리자 설정 완료', '이 PIN이 관리자 비밀번호로 저장되었습니다.');
      }
    } else {
      Alert.alert('오류', '비밀번호가 올바르지 않습니다.');
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // 로그인은 됐지만 PIN 입력 전 (일반 사용자 상태) — 바로 통과
  // 이 화면은 user === null 일 때만 보임 (RootNavigator에서 제어)

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>
        {/* 로고 영역 */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Ionicons name="book" size={48} color="#FFFFFF" />
          </View>
          <Text style={s.appName}>지문냠냠</Text>
          <Text style={s.appSub}>영어 지문 학습 도우미</Text>
        </View>

        {/* 로그인 버튼 */}
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

          <Text style={s.hint}>로그인 후 관리자라면 하단에서 관리자 모드로 전환하세요.</Text>
        </View>
      </View>

      {/* 관리자 PIN 모달 */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>관리자 비밀번호 입력</Text>
            <Text style={s.modalSub}>
              처음 입력하는 경우 이 비밀번호가 관리자 PIN으로 설정됩니다.
            </Text>
            <TextInput
              style={s.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="비밀번호 입력"
              placeholderTextColor="#BBBBBB"
              secureTextEntry
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setPinModalVisible(false); setPin(''); }}
              >
                <Text style={s.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, pinLoading && s.btnDisabled]}
                onPress={handleAdminPin}
                disabled={pinLoading}
              >
                {pinLoading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={s.modalConfirmText}>확인</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },

  logoArea: { alignItems: 'center', gap: 16 },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: { fontSize: 32, fontWeight: '900', color: '#000000', letterSpacing: -1 },
  appSub: { fontSize: 15, color: '#888888', fontWeight: '500' },

  btnArea: { gap: 16 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  btnDisabled: { opacity: 0.5 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
  hint: { fontSize: 12, color: '#AAAAAA', textAlign: 'center', lineHeight: 18 },

  // PIN 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#000000', letterSpacing: -0.5 },
  modalSub: { fontSize: 12, color: '#888888', lineHeight: 18 },
  pinInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FAFAFA',
    marginTop: 4,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#555555' },
  modalConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
