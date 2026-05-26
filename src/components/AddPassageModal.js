import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, savePassage } from '../utils/storage';
import { generateStudyMaterials, splitPassageIntoSentences } from '../services/geminiService';

function isTitleGibberish(title) {
  if (!title || title.length < 2) return true;
  return /(.)\1{2,}/.test(title);
}

export default function AddPassageModal({ visible, onClose, onSuccess }) {
  const [step, setStep] = useState('input'); // 'input' | 'review' | 'generating'
  const [text, setText] = useState('');
  const [useTranslation, setUseTranslation] = useState(false);
  const [userTranslation, setUserTranslation] = useState('');
  const [sentencePairs, setSentencePairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setText('');
      setUserTranslation('');
      setUseTranslation(false);
      setSentencePairs([]);
      setStep('input');
      setLoading(false);
      setLoadingMsg('');
    }
  }, [visible]);

  const canProceed =
    text.trim().length >= 50 && (!useTranslation || userTranslation.trim().length >= 10);

  const checkApiKey = async () => {
    const settings = await getSettings();
    const activeKey = settings.aiProvider === 'groq' ? settings.groqApiKey : settings.apiKey;
    if (!activeKey) {
      const name = settings.aiProvider === 'groq' ? 'Groq' : 'Gemini';
      Alert.alert('API 키 없음', `설정 탭에서 ${name} API 키를 먼저 입력해주세요.`, [{ text: '확인' }]);
      return null;
    }
    return settings;
  };

  // Step 1 → Step 2: 지문을 문장별로 분리
  const handleNext = async () => {
    const settings = await checkApiKey();
    if (!settings) return;
    setLoading(true);
    setLoadingMsg('문장을 분석하고 있습니다...');
    try {
      const translation = useTranslation ? userTranslation.trim() : undefined;
      const pairs = await splitPassageIntoSentences(settings, text.trim(), translation);
      if (!pairs.length) throw new Error('문장을 추출할 수 없습니다. 지문을 확인해주세요.');
      setSentencePairs(pairs);
      setStep('review');
    } catch (e) {
      Alert.alert('오류', e.message || '문장 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // 문장 쌍 수정
  const updatePair = (index, field, value) => {
    setSentencePairs(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  // Step 2 → Step 3: 확정된 문장으로 학습 자료 생성
  const handleGenerate = async () => {
    const settings = await checkApiKey();
    if (!settings) return;
    setLoading(true);
    setStep('generating');
    setLoadingMsg('AI가 학습 자료를 생성하고 있습니다...');
    try {
      const translation = useTranslation ? userTranslation.trim() : undefined;
      const result = await generateStudyMaterials(settings, text.trim(), translation, sentencePairs);
      const rawTitle = result.title || '';
      const title = isTitleGibberish(rawTitle) ? '제목 없음' : rawTitle;
      const passage = {
        id: `passage_${Date.now()}`,
        title,
        originalText: text.trim(),
        createdAt: Date.now(),
        summary: result.summary || '',
        vocabulary: result.vocabulary || [],
        flow: result.flow || [],
        workbook: {
          type1: result.workbook?.type1 || [],
          type3: result.workbook?.type3 || [],
          type4: result.workbook?.type4 || [],
        },
        progress: {
          type1: { completed: false, correctCount: 0, totalCount: 0 },
          type3: { completed: false, correctCount: 0, totalCount: 0 },
          type4: { completed: false, correctCount: 0, totalCount: 0 },
          vocab: { completed: false, correctCount: 0, totalCount: 0 },
          reviewCount: 0,
        },
      };
      await savePassage(passage);
      onSuccess();
    } catch (e) {
      Alert.alert('오류 발생', e.message || '알 수 없는 오류가 발생했습니다.');
      setStep('review');
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // 공통 헤더
  const Header = ({ title, onBack }) => (
    <View style={s.header}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={loading ? '#CCCCCC' : '#000000'} />
        </TouchableOpacity>
      ) : (
        <View style={s.backBtn} />
      )}
      <Text style={s.headerTitle}>{title}</Text>
      <TouchableOpacity
        onPress={onClose}
        disabled={loading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color={loading ? '#CCCCCC' : '#000000'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >

          {/* ── Step 1: 지문 입력 ── */}
          {step === 'input' && (
            <>
              <Header title="지문 추가" onBack={null} />
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                <View style={s.body}>
                  <View style={s.infoBox}>
                    <Ionicons name="information-circle-outline" size={15} color="#666666" />
                    <Text style={s.infoText}>
                      지문을 입력하면 AI가 문장별로 분리하여 확인 화면을 보여줍니다.
                      확인 후 학습 자료가 생성됩니다.
                    </Text>
                  </View>

                  <Text style={s.inputLabel}>영어 지문</Text>
                  <TextInput
                    style={s.input}
                    multiline
                    value={text}
                    onChangeText={setText}
                    placeholder="여기에 영어 지문을 붙여넣거나 직접 입력하세요."
                    placeholderTextColor="#BBBBBB"
                    editable={!loading}
                    textAlignVertical="top"
                  />
                  <Text style={s.charCount}>{text.length}자</Text>

                  <TouchableOpacity
                    style={s.toggleRow}
                    onPress={() => setUseTranslation(v => !v)}
                    disabled={loading}
                    activeOpacity={0.75}
                  >
                    <View style={[s.toggleBox, useTranslation && s.toggleBoxOn]}>
                      {useTranslation && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.toggleLabel}>해석 직접 입력하기</Text>
                      <Text style={s.toggleSub}>
                        {useTranslation
                          ? '입력한 해석이 그대로 워크북에 반영됩니다.'
                          : '체크하면 직접 입력한 해석을 기반으로 자료를 생성합니다.'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {useTranslation && (
                    <>
                      <Text style={[s.inputLabel, { marginTop: 16 }]}>한국어 해석</Text>
                      <TextInput
                        style={s.input}
                        multiline
                        value={userTranslation}
                        onChangeText={setUserTranslation}
                        placeholder="지문의 한국어 해석을 입력하세요."
                        placeholderTextColor="#BBBBBB"
                        editable={!loading}
                        textAlignVertical="top"
                      />
                      <Text style={s.charCount}>{userTranslation.length}자</Text>
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={s.footer}>
                {loading ? (
                  <View style={s.loadingBox}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={s.loadingText}>{loadingMsg}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.btn, !canProceed && s.btnDisabled]}
                    onPress={handleNext}
                    disabled={!canProceed}
                    activeOpacity={0.85}
                  >
                    <Text style={s.btnText}>다음 — 문장 확인</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* ── Step 2: 문장 확인 및 수정 ── */}
          {step === 'review' && (
            <>
              <Header title="문장 확인 및 수정" onBack={() => setStep('input')} />
              <View style={s.reviewBanner}>
                <Ionicons name="create-outline" size={13} color="#555555" />
                <Text style={s.reviewBannerText}>
                  각 문장과 해석을 확인하세요. 틀린 부분은 직접 수정 가능합니다.
                  확정 후에는 AI가 임의로 수정하지 않습니다.
                </Text>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.reviewContent}
              >
                {sentencePairs.map((pair, i) => (
                  <View key={i} style={s.pairCard}>
                    <View style={s.pairNumBadge}>
                      <Text style={s.pairNumText}>{i + 1}</Text>
                    </View>
                    <View style={s.pairFields}>
                      <TextInput
                        style={s.pairEnInput}
                        value={pair.en}
                        onChangeText={t => updatePair(i, 'en', t)}
                        multiline
                        textAlignVertical="top"
                        placeholder="English sentence"
                        placeholderTextColor="#BBBBBB"
                      />
                      <View style={s.pairDivider} />
                      <TextInput
                        style={s.pairKoInput}
                        value={pair.ko}
                        onChangeText={t => updatePair(i, 'ko', t)}
                        multiline
                        textAlignVertical="top"
                        placeholder="한국어 해석"
                        placeholderTextColor="#BBBBBB"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={s.footer}>
                <TouchableOpacity style={s.btn} onPress={handleGenerate} activeOpacity={0.85}>
                  <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
                  <Text style={s.btnText}>확정하고 학습 자료 생성</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 3: 생성 중 ── */}
          {step === 'generating' && (
            <>
              <Header title="학습 자료 생성 중" onBack={null} />
              <View style={s.generatingWrap}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={s.generatingText}>{loadingMsg}</Text>
              </View>
            </>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#000000', letterSpacing: -0.5 },

  body: { padding: 20 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: { fontSize: 12, color: '#666666', flex: 1, lineHeight: 18 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#000000',
    minHeight: 200,
    lineHeight: 22,
    backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 11, color: '#BBBBBB', textAlign: 'right', marginTop: 6 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  toggleBoxOn: { backgroundColor: '#000000', borderColor: '#000000' },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: '#000000', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#888888', lineHeight: 16 },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  btnDisabled: { backgroundColor: '#CCCCCC' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },

  // Review step
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F7F7F7',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  reviewBannerText: { fontSize: 12, color: '#555555', flex: 1, lineHeight: 18 },
  reviewContent: { padding: 16, paddingBottom: 24 },

  pairCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    padding: 12,
  },
  pairNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    flexShrink: 0,
  },
  pairNumText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  pairFields: { flex: 1 },
  pairEnInput: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 21,
    minHeight: 42,
    padding: 0,
  },
  pairDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },
  pairKoInput: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    minHeight: 36,
    padding: 0,
  },

  // Generating step
  generatingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  generatingText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
    textAlign: 'center',
  },
});
