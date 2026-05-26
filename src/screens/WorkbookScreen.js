import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById } from '../utils/storage';

const TYPES = [
  {
    key: 'type1',
    number: '01',
    title: '단어 순서 배열',
    desc: '한국어 해석을 보고 영어 단어들을 올바른 문장 순서로 배열합니다.',
    detail: '단어 → 문장',
    icon: 'reorder-four-outline',
  },
  {
    key: 'type3',
    number: '02',
    title: '문장 순서 배열',
    desc: '지문의 모든 문장을 올바른 순서로 배열합니다.',
    detail: '문장 → 지문',
    icon: 'list-outline',
  },
  {
    key: 'type4',
    number: '03',
    title: '동사 빈칸 채우기',
    desc: '문장에서 빠진 동사를 원문 그대로 입력합니다.',
    detail: '동사형 → 문장',
    icon: 'create-outline',
  },
];

export default function WorkbookScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [passage, setPassage] = useState(null);

  useEffect(() => {
    getPassageById(passageId).then(setPassage);
  }, [passageId]);

  if (!passage) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>워크북</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.titleBlock}>
          <Text style={s.titleLabel}>WORKBOOK</Text>
          <Text style={s.titleText}>{passage.title}</Text>
          <Text style={s.titleSub}>유형을 선택하여 학습을 시작하세요.</Text>
        </View>

        {TYPES.map((type) => {
          const done = passage.progress?.[type.key]?.completed;
          const prog = passage.progress?.[type.key];
          const pct =
            prog?.totalCount > 0
              ? Math.round((prog.correctCount / prog.totalCount) * 100)
              : 0;

          return (
            <TouchableOpacity
              key={type.key}
              style={s.typeCard}
              onPress={() =>
                type.key === 'type4'
                ? navigation.navigate('WorkbookVerb', { passageId })
                : navigation.navigate('WorkbookType', { passageId, workbookType: type.key })
              }
              activeOpacity={0.75}
            >
              <View style={s.cardLeft}>
                <Text style={s.typeNumber}>{type.number}</Text>
                <View style={s.typeIcon}>
                  <Ionicons name={type.icon} size={20} color="#000000" />
                </View>
              </View>

              <View style={s.cardBody}>
                <View style={s.cardTitleRow}>
                  <Text style={s.typeTitle}>{type.title}</Text>
                  {done && (
                    <View style={s.doneBadge}>
                      <Text style={s.doneText}>완료</Text>
                    </View>
                  )}
                </View>
                <Text style={s.typeDesc}>{type.desc}</Text>
                <View style={s.detailRow}>
                  <Text style={s.detailTag}>{type.detail}</Text>
                  {done && <Text style={s.scoreText}>{pct}% 정확도</Text>}
                </View>
                {done && (
                  <View style={s.miniBarBg}>
                    <View style={[s.miniBarFill, { width: `${pct}%` }]} />
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
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
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },

  content: { padding: 16, paddingBottom: 40 },

  titleBlock: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 2,
    marginBottom: 6,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  titleSub: { fontSize: 13, color: '#888888' },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  cardLeft: { alignItems: 'center', gap: 6, width: 36 },
  typeNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeTitle: { fontSize: 15, fontWeight: '700', color: '#000000', letterSpacing: -0.3 },
  doneBadge: {
    backgroundColor: '#000000',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  doneText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  typeDesc: { fontSize: 12, color: '#888888', lineHeight: 18, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  scoreText: { fontSize: 11, color: '#888888' },
  miniBarBg: { height: 2, backgroundColor: '#EEEEEE', borderRadius: 2, marginTop: 8 },
  miniBarFill: { height: 2, backgroundColor: '#000000', borderRadius: 2 },
});
