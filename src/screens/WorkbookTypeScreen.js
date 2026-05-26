import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById, updatePassageProgress } from '../utils/storage';

// Shuffle array using Fisher-Yates
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build question list from passage data
function buildQuestions(passage, workbookType) {
  if (workbookType === 'type1') {
    return (passage.workbook.type1 || [])
      .map((item, qi) => {
        const sentence = typeof item === 'string' ? item : (item?.sentence || '');
        const meaning = typeof item === 'string' ? null : (item?.meaning || null);
        if (!sentence.trim()) return null;
        const words = sentence.trim().split(/\s+/).filter(Boolean);
        const chips = words.map((w, i) => ({ id: `${qi}-${i}`, text: w, originalIndex: i }));
        return {
          id: qi,
          chips,
          correctOrder: words,
          hint: meaning,
          isMultiItem: false,
        };
      })
      .filter(Boolean);
  }

  if (workbookType === 'type2') {
    return (passage.workbook.type2 || []).map((item, qi) => {
      const chips = (item.chunks || []).map((chunk, i) => ({
        id: `${qi}-${i}`,
        text: chunk,
        originalIndex: i,
      }));
      return {
        id: qi,
        chips,
        correctOrder: item.chunks || [],
        hint: item.meaning,
        isMultiItem: false,
      };
    });
  }

  if (workbookType === 'type3') {
    // 문장 순서 배열: 각 문장이 개별 chip이 되는 단일 문제
    const sentences = passage.workbook.type3 || [];
    const chips = sentences.map((s, i) => ({ id: `sent-${i}`, text: s, originalIndex: i }));
    return [
      {
        id: 0,
        chips,
        correctOrder: sentences,
        hint: null,
        isMultiItem: true,
      },
    ];
  }

  return [];
}

const TYPE_LABELS = {
  type1: '유형 1 — 단어 순서 배열',
  type2: '유형 2 — 어절 순서 배열',
  type3: '유형 3 — 문장 순서 배열',
};

export default function WorkbookTypeScreen({ route, navigation }) {
  const { passageId, workbookType } = route.params;
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allChips, setAllChips] = useState([]);
  const [selectedChips, setSelectedChips] = useState([]);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [wrongAnswer, setWrongAnswer] = useState([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const initQuestion = useCallback((qs, idx) => {
    const q = qs[idx];
    if (!q) return;
    setAllChips(shuffle([...q.chips]));
    setSelectedChips([]);
    setFeedback(null);
    setWrongAnswer([]);
  }, []);

  useEffect(() => {
    getPassageById(passageId).then((p) => {
      if (!p) return;
      const qs = buildQuestions(p, workbookType);
      setQuestions(qs);
      initQuestion(qs, 0);
    });
  }, [passageId, workbookType, initQuestion]);

  const selectChip = (chip) => {
    if (feedback || selectedChips.some((c) => c.id === chip.id)) return;
    setSelectedChips((prev) => [...prev, chip]);
  };

  const deselectChip = (chip) => {
    if (feedback) return;
    setSelectedChips((prev) => prev.filter((c) => c.id !== chip.id));
  };

  const handleSubmit = () => {
    if (!selectedChips.length || feedback) return;
    const q = questions[currentIndex];
    const userOrder = selectedChips.map((c) => c.text);
    const isCorrect =
      JSON.stringify(userOrder) === JSON.stringify(q.correctOrder);

    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) setWrongAnswer(q.correctOrder);

    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      const finalCorrect = score.correct + (feedback === 'correct' ? 1 : 0);
      await updatePassageProgress(passageId, workbookType, {
        completed: true,
        correctCount: finalCorrect,
        totalCount: questions.length,
      });
      setFinished(true);
    } else {
      setCurrentIndex(nextIdx);
      initQuestion(questions, nextIdx);
    }
  };

  if (!questions.length) return null;

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
            <Text style={s.finishSub}>
              {questions.length}문제 중 {finalCorrect}개 정답
            </Text>
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
              setCurrentIndex(0);
              setScore({ correct: 0, total: 0 });
              setFinished(false);
              const qs = questions.map((q) => q);
              initQuestion(qs, 0);
            }}
          >
            <Text style={s.outlineBtnText}>다시 풀기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const q = questions[currentIndex];
  const progressPct = Math.round((currentIndex / questions.length) * 100);
  const allPlaced = selectedChips.length === allChips.length;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {TYPE_LABELS[workbookType]}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressBarBg}>
        <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Counter & hint */}
        <View style={s.topInfo}>
          <Text style={s.counter}>
            {currentIndex + 1} / {questions.length}
          </Text>
          {q.hint && (
            <View style={s.hintBox}>
              <Text style={s.hintLabel}>한국어 뜻</Text>
              <Text style={s.hintText}>{q.hint}</Text>
            </View>
          )}
          {workbookType === 'type3' && (
            <View style={s.hintBox}>
              <Text style={s.hintLabel}>모든 문장을 올바른 순서로 배열하세요</Text>
            </View>
          )}
          {workbookType === 'type1' && !q.hint && (
            <View style={s.hintBox}>
              <Text style={s.hintLabel}>단어를 올바른 문장 순서로 배열하세요</Text>
            </View>
          )}
        </View>

        {/* Answer area */}
        <View style={s.answerSection}>
          <Text style={s.areaLabel}>정답 입력</Text>
          <View style={s.answerBox}>
            {selectedChips.length === 0 ? (
              <Text style={s.placeholderText}>
                {workbookType === 'type3'
                  ? '아래 문장을 눌러 순서대로 배치하세요'
                  : '아래 단어를 눌러 배치하세요'}
              </Text>
            ) : (
              <View style={workbookType === 'type3' ? s.sentenceColumn : s.chipRow}>
                {selectedChips.map((chip) => (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      workbookType === 'type3' ? s.sentenceChipSelected : s.chip,
                      workbookType !== 'type3' && s.chipSelected,
                    ]}
                    onPress={() => deselectChip(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={workbookType === 'type3' ? s.sentenceChipSelectedText : s.chipSelectedText}>
                      {chip.text}
                    </Text>
                    <Ionicons
                      name="close-circle"
                      size={workbookType === 'type3' ? 16 : 12}
                      color="rgba(255,255,255,0.6)"
                      style={s.chipClose}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

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
            <View style={s.correctAnswerBox}>
              <Text style={s.correctAnswerLabel}>올바른 정답</Text>
              {workbookType === 'type3' ? (
                <View style={s.sentenceAnswerColumn}>
                  {wrongAnswer.map((text, i) => (
                    <View key={i} style={s.correctSentenceChip}>
                      <Text style={s.correctSentenceChipNum}>{i + 1}.</Text>
                      <Text style={s.correctSentenceChipText}>{text}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.correctChipRow}>
                  {wrongAnswer.map((text, i) => (
                    <View key={i} style={s.correctChip}>
                      <Text style={s.correctChipText}>{text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Available chips */}
        {!feedback && (
          <View style={s.availableSection}>
            <Text style={s.areaLabel}>
              {workbookType === 'type3' ? '선택 가능한 문장' : '선택 가능한 단어'}
            </Text>
            <View style={workbookType === 'type3' ? s.sentenceColumn : s.chipRow}>
              {allChips.map((chip) => {
                const isSelected = selectedChips.some((c) => c.id === chip.id);
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      workbookType === 'type3' ? s.sentenceChip : s.chip,
                      isSelected && (workbookType === 'type3' ? s.sentenceChipGhost : s.chipGhost),
                    ]}
                    onPress={() => selectChip(chip)}
                    activeOpacity={isSelected ? 1 : 0.7}
                    disabled={isSelected}
                  >
                    <Text
                      style={[
                        workbookType === 'type3' ? s.sentenceChipText : s.chipText,
                        isSelected && (workbookType === 'type3' ? s.sentenceChipGhostText : s.chipGhostText),
                      ]}
                    >
                      {chip.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Submit / Next button */}
        <View style={s.btnArea}>
          {!feedback ? (
            <TouchableOpacity
              style={[s.darkBtn, !allPlaced && s.darkBtnDisabled]}
              onPress={handleSubmit}
              disabled={!allPlaced}
              activeOpacity={0.85}
            >
              <Text style={s.darkBtnText}>정답 제출</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.darkBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={s.darkBtnText}>
                {currentIndex + 1 >= questions.length ? '결과 보기' : '다음 문제'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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

  scrollContent: { padding: 16, paddingBottom: 40 },

  topInfo: { marginBottom: 16 },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  hintBox: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  hintLabel: { fontSize: 10, fontWeight: '700', color: '#AAAAAA', letterSpacing: 0.5, marginBottom: 4 },
  hintText: { fontSize: 15, fontWeight: '600', color: '#000000', lineHeight: 22 },

  areaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  answerSection: { marginBottom: 12 },
  answerBox: {
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 13, color: '#CCCCCC', textAlign: 'center' },

  availableSection: { marginBottom: 16 },

  // ── 단어 칩 (type1/type2) ──────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    maxWidth: '100%',
  },
  chipText: { fontSize: 14, fontWeight: '500', color: '#000000' },
  chipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelectedText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', flexShrink: 1 },
  chipClose: { marginLeft: 2 },
  chipGhost: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
  },
  chipGhostText: { color: '#CCCCCC' },

  // ── 문장 칩 (type3) ──────────────────────────────
  sentenceColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  sentenceChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    width: '100%',
  },
  sentenceChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 21,
  },
  sentenceChipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sentenceChipSelectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 21,
    flex: 1,
  },
  sentenceChipGhost: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
  },
  sentenceChipGhostText: { color: '#CCCCCC' },

  feedbackCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  feedbackCorrectText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },

  feedbackWrong: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  feedbackWrongTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  feedbackWrongTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  correctAnswerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
  },
  correctAnswerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  correctChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  correctChip: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  correctChipText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // 정답 문장 표시 (type3 오답일 때)
  sentenceAnswerColumn: { flexDirection: 'column', gap: 6 },
  correctSentenceChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  correctSentenceChipNum: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    minWidth: 20,
    marginTop: 2,
  },
  correctSentenceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    flex: 1,
  },

  btnArea: { marginTop: 8 },
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

  // Finish screen
  finishWrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  finishCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 8,
  },
  finishLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  finishPct: { fontSize: 64, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  finishSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 20 },
  finishBarBg: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  finishBarFill: { height: 3, backgroundColor: '#FFFFFF', borderRadius: 2 },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: '#333333' },
});
