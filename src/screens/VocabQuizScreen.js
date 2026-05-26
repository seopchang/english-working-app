import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById, updatePassageProgress, incrementReviewCount } from '../utils/storage';

export default function VocabQuizScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [vocab, setVocab] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [passage, setPassage] = useState(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    getPassageById(passageId).then((p) => {
      if (p) {
        setPassage(p);
        setVocab(p.vocabulary || []);
      }
    });
  }, [passageId]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = () => {
    if (!answer.trim() || feedback) return;
    const correct = vocab[current]?.word.toLowerCase().trim();
    const isCorrect = answer.toLowerCase().trim() === correct;

    const newScore = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(newScore);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) shake();
  };

  const handleNext = async () => {
    const next = current + 1;
    if (next >= vocab.length) {
      setFinished(true);
      await updatePassageProgress(passageId, 'vocab', {
        completed: true,
        correctCount: score.correct + (feedback === 'correct' ? 1 : 0),
        totalCount: vocab.length,
      });
      await incrementReviewCount(passageId);
    } else {
      setCurrent(next);
      setAnswer('');
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (!vocab.length) return null;

  if (finished) {
    const finalScore = score.correct;
    const pct = Math.round((finalScore / vocab.length) * 100);
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>단어 퀴즈 완료</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.finishContainer}>
          <View style={s.finishCard}>
            <Text style={s.finishEyebrow}>RESULT</Text>
            <Text style={s.finishScore}>{pct}%</Text>
            <Text style={s.finishSub}>{vocab.length}개 중 {finalScore}개 정답</Text>
            <View style={s.finishBar}>
              <View style={[s.finishBarFill, { width: `${pct}%` }]} />
            </View>
          </View>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.primaryBtnText}>학습 완료</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => {
              setCurrent(0);
              setAnswer('');
              setFeedback(null);
              setScore({ correct: 0, total: 0 });
              setFinished(false);
            }}
          >
            <Text style={s.secondaryBtnText}>다시 풀기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const item = vocab[current];
  const pct = Math.round((current / vocab.length) * 100);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>단어 암기 퀴즈</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Counter */}
          <Text style={s.counter}>
            {current + 1} / {vocab.length}
          </Text>

          {/* Meaning card */}
          <View style={s.meaningCard}>
            <Text style={s.meaningEyebrow}>한국어 뜻</Text>
            <Text style={s.meaningText}>{item.meaning}</Text>
          </View>

          {/* Input */}
          <Text style={s.inputLabel}>영어 단어를 입력하세요</Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TextInput
              ref={inputRef}
              style={[
                s.input,
                feedback === 'correct' && s.inputCorrect,
                feedback === 'wrong' && s.inputWrong,
              ]}
              value={answer}
              onChangeText={setAnswer}
              placeholder="영어 단어 입력..."
              placeholderTextColor="#BBBBBB"
              editable={!feedback}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </Animated.View>

          {/* Feedback */}
          {feedback && (
            <View style={[s.feedbackBox, feedback === 'correct' ? s.feedbackCorrect : s.feedbackWrong]}>
              {feedback === 'correct' ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={s.feedbackText}>정답입니다!</Text>
                </>
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  <View>
                    <Text style={s.feedbackText}>틀렸습니다</Text>
                    <Text style={s.feedbackAnswer}>정답: {item.word}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom button */}
        <View style={s.bottomBtn}>
          {!feedback ? (
            <TouchableOpacity
              style={[s.primaryBtn, !answer.trim() && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={!answer.trim()}
            >
              <Text style={s.primaryBtnText}>정답 확인</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.primaryBtn} onPress={handleNext}>
              <Text style={s.primaryBtnText}>
                {current + 1 >= vocab.length ? '결과 보기' : '다음 단어'}
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
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },

  progressBar: { height: 3, backgroundColor: '#F0F0F0' },
  progressFill: { height: 3, backgroundColor: '#000000' },

  content: { padding: 20, paddingBottom: 20 },
  counter: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  meaningCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    minHeight: 120,
    justifyContent: 'center',
  },
  meaningEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  meaningText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#444444', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    backgroundColor: '#FAFAFA',
  },
  inputCorrect: { borderColor: '#22C55E', backgroundColor: '#F0FFF4' },
  inputWrong: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },

  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  feedbackCorrect: { backgroundColor: '#22C55E' },
  feedbackWrong: { backgroundColor: '#EF4444' },
  feedbackText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  feedbackAnswer: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  bottomBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  btnDisabled: { backgroundColor: '#CCCCCC' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  finishContainer: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  finishCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 8,
  },
  finishEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  finishScore: { fontSize: 64, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  finishSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 20 },
  finishBar: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  finishBarFill: { height: 3, backgroundColor: '#FFFFFF', borderRadius: 2 },

  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#333333' },
});
