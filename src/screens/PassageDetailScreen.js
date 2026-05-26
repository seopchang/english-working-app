import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById } from '../utils/storage';

const ACTIVITIES = [
  {
    key: 'summary',
    title: '내용 요약',
    subtitle: '한국어 요약 및 분석 노트',
    icon: 'document-text-outline',
    progressKey: null,
  },
  {
    key: 'workbook',
    title: '워크북',
    subtitle: '단어 · 어절 · 문단 순서 배열 (영어)',
    icon: 'layers-outline',
    progressKey: null,
  },
  {
    key: 'vocabList',
    title: '단어장',
    subtitle: '지문 전체 단어 목록 및 뜻',
    icon: 'book-outline',
    progressKey: null,
  },
  {
    key: 'vocab',
    title: '단어 암기 퀴즈',
    subtitle: '한국어 뜻 보고 영어 단어 입력',
    icon: 'school-outline',
    progressKey: 'vocab',
  },
];

export default function PassageDetailScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [passage, setPassage] = useState(null);
  const [excerptExpanded, setExcerptExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPassageById(passageId).then(setPassage);
    }, [passageId])
  );

  if (!passage) return null;

  const handlePress = (key) => {
    if (key === 'summary') {
      navigation.navigate('Summary', { passageId });
    } else if (key === 'workbook') {
      navigation.navigate('Workbook', { passageId });
    } else if (key === 'vocabList') {
      navigation.navigate('VocabList', { passageId });
    } else if (key === 'vocab') {
      navigation.navigate('VocabQuiz', { passageId });
    }
  };

  const wb = passage.progress;
  const workbookAllDone = wb?.type1?.completed && wb?.type3?.completed && wb?.type4?.completed;
  const reviewCount = wb?.reviewCount || 0;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{passage.title}</Text>
        <View style={s.reviewWrap}>
          {reviewCount > 0 ? (
            <View style={s.reviewBadge}>
              <Text style={s.reviewText}>{reviewCount}회독</Text>
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Passage excerpt */}
        <TouchableOpacity style={s.excerptCard} onPress={() => setExcerptExpanded(v => !v)} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={s.excerptLabel}>원문 지문</Text>
            <Ionicons name={excerptExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#AAAAAA" />
          </View>
          <Text style={s.excerptText} numberOfLines={excerptExpanded ? undefined : 6}>
            {passage.originalText}
          </Text>
          <Text style={s.excerptDate}>
            등록일 {new Date(passage.createdAt).toLocaleDateString('ko-KR')}
          </Text>
        </TouchableOpacity>

        {/* Progress overview */}
        <View style={s.progressRow}>
          {[
            { label: 'WB 1', key: 'type1' },
            { label: 'WB 2', key: 'type3' },
            { label: 'WB 3', key: 'type4' },
            { label: 'VOC', key: 'vocab' },
          ].map(({ label, key }) => {
            const done = passage.progress?.[key]?.completed;
            return (
              <View key={key} style={s.progItem}>
                <View style={[s.progDot, done ? s.progDotOn : s.progDotOff]} />
                <Text style={s.progLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Activity buttons */}
        <Text style={s.sectionTitle}>학습 활동</Text>
        {ACTIVITIES.map((act) => {
          let isDone = false;
          if (act.progressKey) {
            isDone = passage.progress?.[act.progressKey]?.completed;
          } else if (act.key === 'workbook') {
            isDone = workbookAllDone;
          }

          return (
            <TouchableOpacity
              key={act.key}
              style={s.actCard}
              onPress={() => handlePress(act.key)}
              activeOpacity={0.75}
            >
              <View style={s.actIcon}>
                <Ionicons name={act.icon} size={22} color="#000000" />
              </View>
              <View style={s.actInfo}>
                <Text style={s.actTitle}>{act.title}</Text>
                <Text style={s.actSub}>{act.subtitle}</Text>
              </View>
              <View style={s.actRight}>
                {isDone && (
                  <View style={s.doneBadge}>
                    <Text style={s.doneText}>완료</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
              </View>
            </TouchableOpacity>
          );
        })}
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
  reviewWrap: { width: 52, alignItems: 'flex-end' },
  reviewBadge: {
    backgroundColor: '#000000',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  content: { padding: 16, paddingBottom: 40 },

  excerptCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  excerptLabel: { fontSize: 11, fontWeight: '600', color: '#AAAAAA', letterSpacing: 0.5, marginBottom: 8 },
  excerptText: { fontSize: 14, color: '#333333', lineHeight: 22 },
  excerptDate: { fontSize: 11, color: '#BBBBBB', marginTop: 10 },

  progressRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  progItem: { flex: 1, alignItems: 'center', gap: 6 },
  progDot: { width: 8, height: 8, borderRadius: 4 },
  progDotOn: { backgroundColor: '#000000' },
  progDotOff: { backgroundColor: '#E0E0E0' },
  progLabel: { fontSize: 11, fontWeight: '600', color: '#888888' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 10,
  },

  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actInfo: { flex: 1 },
  actTitle: { fontSize: 15, fontWeight: '700', color: '#000000', letterSpacing: -0.3, marginBottom: 2 },
  actSub: { fontSize: 12, color: '#888888' },
  actRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBadge: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doneText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
