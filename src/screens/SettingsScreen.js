import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings, resetAllData } from '../utils/storage';
import { testApiKey } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { user, userRole, signOut, enterAdminMode, changeAdminPin, reauthAndResetPin } = useAuth();

  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [saved, setSaved] = useState(false);

  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiResult, setGeminiResult] = useState(null);
  const [geminiError, setGeminiError] = useState('');

  const [groqTesting, setGroqTesting] = useState(false);
  const [groqResult, setGroqResult] = useState(null);
  const [groqError, setGroqError] = useState('');

  // 관리자 모드 진입 (일반 사용자용)
  const [adminPinModal, setAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinLoading, setAdminPinLoading] = useState(false);

  // PIN 변경 (현재 PIN 알 때)
  const [changePinModal, setChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [changePinLoading, setChangePinLoading] = useState(false);

  // PIN 초기화 (Google 재인증)
  const [resetPinModal, setResetPinModal] = useState(false);
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetPinLoading, setResetPinLoading] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s.aiProvider) setAiProvider(s.aiProvider);
      if (s.apiKey) setGeminiKey(s.apiKey);
      if (s.groqApiKey) setGroqKey(s.groqApiKey);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings({
      aiProvider,
      apiKey: geminiKey.trim(),
      groqApiKey: groqKey.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestGemini = async () => {
    if (!geminiKey.trim()) {
      Alert.alert('API 키 없음', 'Gemini API 키를 먼저 입력해주세요.');
      return;
    }
    setGeminiTesting(true);
    setGeminiResult(null);
    setGeminiError('');
    const result = await testApiKey({ aiProvider: 'gemini', apiKey: geminiKey.trim(), groqApiKey: '' });
    setGeminiResult(result.ok ? 'ok' : 'fail');
    if (!result.ok) setGeminiError(result.message || '');
    setGeminiTesting(false);
  };

  const handleTestGroq = async () => {
    if (!groqKey.trim()) {
      Alert.alert('API 키 없음', 'Groq API 키를 먼저 입력해주세요.');
      return;
    }
    setGroqTesting(true);
    setGroqResult(null);
    setGroqError('');
    const result = await testApiKey({ aiProvider: 'groq', apiKey: '', groqApiKey: groqKey.trim() });
    setGroqResult(result.ok ? 'ok' : 'fail');
    if (!result.ok) setGroqError(result.message || '');
    setGroqTesting(false);
  };

  const handleReset = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 학습 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('완료', '모든 데이터가 삭제되었습니다.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleEnterAdmin = async () => {
    if (adminPinInput.length < 4) { Alert.alert('오류', 'PIN은 4자리 이상 입력해주세요.'); return; }
    setAdminPinLoading(true);
    const result = await enterAdminMode(adminPinInput);
    setAdminPinLoading(false);
    if (result.success) {
      setAdminPinModal(false);
      setAdminPinInput('');
      Alert.alert('완료', result.isFirstSetup ? '관리자 PIN이 설정되었습니다.' : '관리자 모드로 전환되었습니다.');
    } else {
      Alert.alert('오류', '비밀번호가 올바르지 않습니다.');
    }
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) { Alert.alert('오류', '새 PIN은 4자리 이상 입력해주세요.'); return; }
    setChangePinLoading(true);
    const result = await changeAdminPin(currentPin, newPin);
    setChangePinLoading(false);
    if (result.success) {
      setChangePinModal(false);
      setCurrentPin(''); setNewPin('');
      Alert.alert('완료', '관리자 PIN이 변경되었습니다.');
    } else {
      Alert.alert('오류', result.message || '오류가 발생했습니다.');
    }
  };

  const handleResetPin = async () => {
    if (resetNewPin.length < 4) { Alert.alert('오류', '새 PIN은 4자리 이상 입력해주세요.'); return; }
    setResetPinLoading(true);
    const result = await reauthAndResetPin(resetNewPin);
    setResetPinLoading(false);
    if (result.success) {
      setResetPinModal(false);
      setResetNewPin('');
      Alert.alert('완료', 'PIN이 초기화되었습니다.');
    } else {
      Alert.alert('오류', result.message || 'Google 재인증에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>설정</Text>

        {/* ── 계정 섹션 ── */}
        {user && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>계정</Text>
            <View style={s.card}>
              <View style={s.accountRow}>
                <View style={s.avatarBox}>
                  <Text style={s.avatarText}>
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.accountName} numberOfLines={1}>
                      {user.displayName || '사용자'}
                    </Text>
                    <View style={[s.roleBadge, userRole === 'admin' && s.roleBadgeAdmin]}>
                      <Text style={s.roleBadgeText}>
                        {userRole === 'admin' ? '관리자' : '사용자'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.accountEmail} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>

              {/* 관리자: PIN 변경 + PIN 초기화 */}
              {userRole === 'admin' && (
                <View style={s.pinActions}>
                  <TouchableOpacity style={s.pinBtn} onPress={() => setChangePinModal(true)} activeOpacity={0.75}>
                    <Ionicons name="key-outline" size={15} color="#333333" />
                    <Text style={s.pinBtnText}>관리자 PIN 변경</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.pinBtn} onPress={() => setResetPinModal(true)} activeOpacity={0.75}>
                    <Ionicons name="refresh-outline" size={15} color="#333333" />
                    <Text style={s.pinBtnText}>PIN 분실 시 초기화</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 일반 사용자: 관리자 모드 진입 */}
              {userRole === 'user' && (
                <TouchableOpacity
                  style={s.adminEntryBtn}
                  onPress={() => setAdminPinModal(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="shield-outline" size={15} color="#555555" />
                  <Text style={s.adminEntryBtnText}>관리자 모드로 전환</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.logoutBtn} onPress={handleSignOut} activeOpacity={0.75}>
                <Ionicons name="log-out-outline" size={15} color="#EF4444" />
                <Text style={s.logoutBtnText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Provider Toggle */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>사용할 AI 제공자</Text>
          <Text style={s.sectionDesc}>학습 자료 생성 시 사용할 AI를 선택합니다.</Text>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, aiProvider === 'gemini' && s.toggleActive]}
              onPress={() => setAiProvider('gemini')}
              activeOpacity={0.8}
            >
              {aiProvider === 'gemini' && (
                <View style={s.activeIndicator}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
              <Text style={[s.toggleText, aiProvider === 'gemini' && s.toggleTextActive]}>
                Gemini
              </Text>
              <Text style={[s.toggleSub, aiProvider === 'gemini' && s.toggleSubActive]}>
                Google AI Studio
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, aiProvider === 'groq' && s.toggleActive]}
              onPress={() => setAiProvider('groq')}
              activeOpacity={0.8}
            >
              {aiProvider === 'groq' && (
                <View style={s.activeIndicator}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
              <Text style={[s.toggleText, aiProvider === 'groq' && s.toggleTextActive]}>
                Groq
              </Text>
              <Text style={[s.toggleSub, aiProvider === 'groq' && s.toggleSubActive]}>
                console.groq.com
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gemini API Key */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Gemini API 키</Text>
            {aiProvider === 'gemini' && (
              <View style={s.activeBadge}><Text style={s.activeBadgeText}>현재 사용 중</Text></View>
            )}
          </View>
          <View style={s.card}>
            <View style={s.cardRow}>
              <Ionicons name="key-outline" size={16} color="#555555" />
              <Text style={s.cardLabel}>Google AI Studio API 키</Text>
            </View>
            <TextInput
              style={s.input}
              value={geminiKey}
              onChangeText={(t) => { setGeminiKey(t); setGeminiResult(null); }}
              placeholder="여기에 Gemini API 키를 입력하세요"
              placeholderTextColor="#BBBBBB"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.apiHint}>aistudio.google.com 에서 무료 API 키를 발급받을 수 있습니다.</Text>

            {geminiResult === 'ok' && (
              <View style={s.testOk}>
                <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                <Text style={s.testOkText}>API 키가 정상 작동합니다.</Text>
              </View>
            )}
            {geminiResult === 'fail' && (
              <View style={s.testFail}>
                <Ionicons name="close-circle" size={15} color="#EF4444" />
                <Text style={s.testFailText}>{geminiError || 'API 키가 유효하지 않습니다.'}</Text>
              </View>
            )}

            <TouchableOpacity
              style={s.testBtn}
              onPress={handleTestGemini}
              disabled={geminiTesting}
              activeOpacity={0.8}
            >
              {geminiTesting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={s.testBtnText}>연결 테스트</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Groq API Key */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Groq API 키</Text>
            {aiProvider === 'groq' && (
              <View style={s.activeBadge}><Text style={s.activeBadgeText}>현재 사용 중</Text></View>
            )}
          </View>
          <View style={s.card}>
            <View style={s.cardRow}>
              <Ionicons name="key-outline" size={16} color="#555555" />
              <Text style={s.cardLabel}>Groq API 키 (Llama 3.3 70B)</Text>
            </View>
            <TextInput
              style={s.input}
              value={groqKey}
              onChangeText={(t) => { setGroqKey(t); setGroqResult(null); }}
              placeholder="여기에 Groq API 키를 입력하세요"
              placeholderTextColor="#BBBBBB"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.apiHint}>console.groq.com 에서 무료 API 키를 발급받을 수 있습니다.</Text>

            {groqResult === 'ok' && (
              <View style={s.testOk}>
                <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                <Text style={s.testOkText}>API 키가 정상 작동합니다.</Text>
              </View>
            )}
            {groqResult === 'fail' && (
              <View style={s.testFail}>
                <Ionicons name="close-circle" size={15} color="#EF4444" />
                <Text style={s.testFailText}>{groqError || 'API 키가 유효하지 않습니다.'}</Text>
              </View>
            )}

            <TouchableOpacity
              style={s.testBtn}
              onPress={handleTestGroq}
              disabled={groqTesting}
              activeOpacity={0.8}
            >
              {groqTesting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={s.testBtnText}>연결 테스트</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Save button */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.saveBtn, saved && s.saveBtnDone]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            {saved ? (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={s.saveBtnText}>저장됨</Text>
              </>
            ) : (
              <Text style={s.saveBtnText}>설정 저장</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Guide */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>사용 가이드</Text>
          <View style={s.card}>
            {[
              { icon: 'add-circle-outline', title: '지문 등록', desc: '홈 탭에서 영어 지문을 추가하면 AI가 자동으로 학습 자료를 생성합니다.' },
              { icon: 'layers-outline', title: '워크북 (3가지 유형)', desc: '유형 1: 단어 순서 배열 / 유형 2: 문단 순서 배열 / 유형 3: 동사 빈칸 채우기' },
              { icon: 'school-outline', title: '단어 퀴즈', desc: '한국어 뜻을 보고 영어 단어를 직접 입력하는 방식으로 단어를 암기합니다.' },
              { icon: 'bar-chart-outline', title: '진도율 확인', desc: '진도율 탭에서 각 지문별 학습 완료 현황과 정확도를 확인할 수 있습니다.' },
            ].map((item, i) => (
              <View key={i} style={[s.guideItem, i > 0 && s.guideItemBorder]}>
                <View style={s.guideIcon}>
                  <Ionicons name={item.icon} size={18} color="#000000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.guideTitle}>{item.title}</Text>
                  <Text style={s.guideDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Data */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>데이터 관리</Text>
          <TouchableOpacity style={s.dangerCard} onPress={handleReset} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={s.dangerTitle}>전체 데이터 초기화</Text>
              <Text style={s.dangerDesc}>모든 지문과 학습 기록이 삭제됩니다.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFAAAA" />
          </TouchableOpacity>
        </View>

        <View style={s.versionRow}>
          <Text style={s.versionText}>지문냠냠</Text>
          <Text style={s.versionNum}>v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      {/* ── 관리자 모드 진입 모달 ── */}
      <PinModal
        visible={adminPinModal}
        title="관리자 모드 진입"
        sub="관리자 비밀번호를 입력하세요."
        fields={[{ label: '관리자 PIN', value: adminPinInput, onChange: setAdminPinInput }]}
        loading={adminPinLoading}
        onCancel={() => { setAdminPinModal(false); setAdminPinInput(''); }}
        onConfirm={handleEnterAdmin}
      />

      {/* ── PIN 변경 모달 ── */}
      <PinModal
        visible={changePinModal}
        title="관리자 PIN 변경"
        sub="현재 PIN과 새 PIN을 입력하세요."
        fields={[
          { label: '현재 PIN', value: currentPin, onChange: setCurrentPin },
          { label: '새 PIN', value: newPin, onChange: setNewPin },
        ]}
        loading={changePinLoading}
        onCancel={() => { setChangePinModal(false); setCurrentPin(''); setNewPin(''); }}
        onConfirm={handleChangePin}
      />

      {/* ── PIN 초기화 모달 (Google 재인증) ── */}
      <PinModal
        visible={resetPinModal}
        title="PIN 초기화 (Google 재인증)"
        sub="새 PIN을 입력하면 Google 로그인으로 본인 확인 후 초기화됩니다."
        fields={[{ label: '새 PIN', value: resetNewPin, onChange: setResetNewPin }]}
        loading={resetPinLoading}
        onCancel={() => { setResetPinModal(false); setResetNewPin(''); }}
        onConfirm={handleResetPin}
        confirmLabel="Google 재인증 후 초기화"
      />
    </SafeAreaView>
  );
}

// 공용 PIN 입력 모달
function PinModal({ visible, title, sub, fields, loading, onCancel, onConfirm, confirmLabel }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>{title}</Text>
          {sub ? <Text style={s.modalSub}>{sub}</Text> : null}
          {fields.map((f, i) => (
            <TextInput
              key={i}
              style={s.modalInput}
              value={f.value}
              onChangeText={f.onChange}
              placeholder={f.label}
              placeholderTextColor="#BBBBBB"
              secureTextEntry
              autoFocus={i === 0}
            />
          ))}
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={onCancel} disabled={loading}>
              <Text style={s.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalConfirm, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.modalConfirmText}>{confirmLabel || '확인'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#000000', letterSpacing: -0.6, marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888888', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionDesc: { fontSize: 12, color: '#AAAAAA', marginBottom: 10 },

  activeBadge: {
    backgroundColor: '#000000',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  toggleActive: { borderColor: '#000000', backgroundColor: '#000000' },
  activeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  toggleText: { fontSize: 15, fontWeight: '700', color: '#888888' },
  toggleTextActive: { color: '#FFFFFF' },
  toggleSub: { fontSize: 11, color: '#BBBBBB', marginTop: 2 },
  toggleSubActive: { color: 'rgba(255,255,255,0.5)' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#333333' },

  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#000000',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  apiHint: { fontSize: 12, color: '#AAAAAA', lineHeight: 18, marginBottom: 10 },

  testOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  testOkText: { fontSize: 13, color: '#16A34A', fontWeight: '500', flex: 1 },
  testFail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  testFailText: { fontSize: 13, color: '#DC2626', fontWeight: '500', flex: 1 },

  testBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    minHeight: 42,
  },
  testBtnText: { fontSize: 14, fontWeight: '600', color: '#333333' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 6,
  },
  saveBtnDone: { backgroundColor: '#22C55E' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  guideItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  guideItemBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  guideIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTitle: { fontSize: 13, fontWeight: '700', color: '#000000', marginBottom: 3 },
  guideDesc: { fontSize: 12, color: '#777777', lineHeight: 18 },

  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 12,
  },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  dangerDesc: { fontSize: 12, color: '#F87171', marginTop: 2 },

  versionRow: { alignItems: 'center', paddingVertical: 12, gap: 4 },
  versionText: { fontSize: 13, fontWeight: '600', color: '#AAAAAA' },
  versionNum: { fontSize: 12, color: '#CCCCCC' },

  // 계정 섹션
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarBox: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  accountName: { fontSize: 15, fontWeight: '700', color: '#000000', flex: 1 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  roleBadgeAdmin: { backgroundColor: '#000000' },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#AAAAAA' },
  accountEmail: { fontSize: 12, color: '#AAAAAA' },

  pinActions: { gap: 8, marginBottom: 10 },
  pinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
  },
  pinBtnText: { fontSize: 13, fontWeight: '600', color: '#333333' },

  adminEntryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA', marginBottom: 10,
  },
  adminEntryBtnText: { fontSize: 13, fontWeight: '600', color: '#555555' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  logoutBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  // PIN 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 24, width: '100%', gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#000000', letterSpacing: -0.4 },
  modalSub: { fontSize: 12, color: '#888888', lineHeight: 18 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#000000', backgroundColor: '#FAFAFA',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#555555' },
  modalConfirm: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#000000', alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
