import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById, updatePassageProgress } from '../utils/storage';

export default function WorkbookVerbScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    getPassageById(passageId).then((p) => {
      if (p) setQuestions(p.workbook?.type4 || []);
      setLoading(false);
    });
  }, [passageId]);

  const handleSubmit = () => {
    if (!answer.trim() || feedback) return;
    const q = questions[current];
    const isCorrect = answer.trim().toLowerCase() === q.answer.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = async () => {
    const next = current + 1;
    if (next >= questions.length) {
      const finalCorrect = score.correct + (feedback === 'correct' ? 1 : 0);
      await updatePassageProgress(passageId, 'type4', {
        completed: true,
        correctCount: finalCorrect,
        totalCount: questions.length,
      });
      setFinished(true);
    } else {
      setCurrent(next);
      setAnswer('');
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>동사 빈칸 채우기</Text>
        <View style={{ width: 36 }} />
      </View>
    </SafeAreaView>
  );

  if (!questions.length) return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>동사 빈칸 채우기</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={s.emptyWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#DDDDDD" />
        <Text style={s.emptyTitle}>데이터가 없습니다</Text>
        <Text style={s.emptySub}>이 지문은 업데이트 전에 저장된 지문입니다.{'\n'}지문을 삭제하고 다시 추가해주세요.</Text>
      </View>
    </SafeAreaView>
  );

  if (finished) {
    const finalCorrect = score.correct;
    const pct = Math.round((finalCorrect / questions.length) * 100);
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>완료</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.finishWrap}>
          <View style={s.finishCard}>
            <Text style={s.finishLabel}>RESULT</Text>
            <Text style={s.finishPct}>{pct}%</Text>
            <Text style={s.finishSub}>{questions.length}문제 중 {finalCorrect}개 정답</Text>
            <View style={s.finishBarBg}>
              <View style={[s.finishBarFill, { width: `${pct}%` }]} />
            </View>
          </View>
          <TouchableOpacity style={s.darkBtn} onPress={() => navigation.goBack()}>
            <Text style={s.darkBtnText}>워크북으로 돌아가기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => {
              setCurrent(0);
              setAnswer('');
              setFeedback(null);
              setScore({ correct: 0, total: 0 });
              setFinished(false);
            }}
          >
            <Text style={s.outlineBtnText}>다시 풀기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const q = questions[current];
  const pct = Math.round((current / questions.length) * 100);
  const parts = (q.blanked || '').split(/_{3,}/);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>동사 빈칸 채우기</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.progressBarBg}>
        <View style={[s.progressBarFill, { width: `${pct}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.counter}>{current + 1} / {questions.length}</Text>

          <View style={s.hintBox}>
            <Text style={s.hintLabel}>동사 자리에 알맞은 단어를 입력하세요</Text>
          </View>

          {/* Sentence with blank */}
          <View style={s.sentenceCard}>
            <View style={s.sentenceRow}>
              <Text style={s.sentenceText}>
                {parts[0]}
              </Text>
              <View style={[
                s.blankBox,
                feedback === 'correct' && s.blankCorrect,
                feedback === 'wrong' && s.blankWrong,
              ]}>
                <Text style={[
                  s.blankText,
                  feedback === 'correct' && s.blankTextCorrect,
                  feedback === 'wrong' && s.blankTextWrong,
                ]}>
                  {feedback ? q.answer : (answer.trim() || '     ')}
                </Text>
              </View>
              <Text style={s.sentenceText}>
                {parts[1] || ''}
              </Text>
            </View>
          </View>

          {/* Input */}
          {!feedback && (
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>동사 입력</Text>
              <TextInput
                ref={inputRef}
                style={s.input}
                value={answer}
                onChangeText={setAnswer}
                placeholder="동사를 입력하세요..."
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!feedback}
              />
            </View>
          )}

          {/* Feedback */}
          {feedback === 'correct' && (
            <View style={s.feedbackCorrect}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={s.feedbackCorrectText}>정답입니다!</Text>
            </View>
          )}
          {feedback === 'wrong' && (
            <View style={s.feedbackWrong}>
              <View style={s.feedbackWrongTop}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={s.feedbackWrongTitle}>틀렸습니다</Text>
              </View>
              <Text style={s.feedbackAnswer}>정답: {q.answer}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.bottomBtn}>
          {!feedback ? (
            <TouchableOpacity
              style={[s.darkBtn, !answer.trim() && s.darkBtnDisabled]}
              onPress={handleSubmit}
              disabled={!answer.trim()}
            >
              <Text style={s.darkBtnText}>정답 확인</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.darkBtn} onPress={handleNext}>
              <Text style={s.darkBtnText}>
                {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  progressBarBg: { height: 3, backgroundColor: '#F0F0F0' },
  progressBarFill: { height: 3, backgroundColor: '#000000' },

  content: { padding: 16, paddingBottom: 40 },

  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },

  hintBox: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  hintLabel: { fontSize: 13, fontWeight: '600', color: '#444444' },

  sentenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  sentenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  sentenceText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 26,
    fontWeight: '500',
  },
  blankBox: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingHorizontal: 6,
    paddingBottom: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  blankCorrect: { borderBottomColor: '#22C55E' },
  blankWrong: { borderBottomColor: '#EF4444' },
  blankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  blankTextCorrect: { color: '#22C55E' },
  blankTextWrong: { color: '#EF4444' },

  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#888888', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FAFAFA',
    fontWeight: '500',
  },

  feedbackCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  feedbackCorrectText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  feedbackWrong: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  feedbackWrongTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  feedbackWrongTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  feedbackAnswer: { fontSize: 14, fontWeight: '600', color: '#EF4444', paddingLeft: 26 },

  bottomBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  darkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  darkBtnDisabled: { backgroundColor: '#CCCCCC' },
  darkBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: '#333333' },

  finishWrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  finishCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 8,
  },
  finishLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 12 },
  finishPct: { fontSize: 64, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  finishSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 20 },
  finishBarBg: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  finishBarFill: { height: 3, backgroundColor: '#FFFFFF', borderRadius: 2 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#AAAAAA' },
  emptySub: { fontSize: 13, color: '#CCCCCC', textAlign: 'center', lineHeight: 20 },
});
