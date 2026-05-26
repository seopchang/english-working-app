import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPassages, savePassages } from '../utils/storage';

const ACTIVITY_META = [
  { key: 'type1', label: '워크북 1', sub: '단어 순서' },
  { key: 'type2', label: '워크북 2', sub: '어절 순서' },
  { key: 'type3', label: '워크북 3', sub: '문단 순서' },
  { key: 'vocab', label: '단어 퀴즈', sub: '영작 입력' },
];

function MiniBar({ value, maxValue }) {
  const pct = maxValue > 0 ? Math.min(100, Math.round((value / maxValue) * 100)) : 0;
  return (
    <View style={s.miniBarWrap}>
      <View style={s.miniBarBg}>
        <View style={[s.miniBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.miniBarPct}>{pct}%</Text>
    </View>
  );
}

function ActivityRow({ meta, prog }) {
  const done = prog?.completed;
  const correct = prog?.correctCount ?? 0;
  const total = prog?.totalCount ?? 0;

  return (
    <View style={s.actRow}>
      <View style={s.actLeft}>
        <View style={[s.actDot, done ? s.actDotOn : s.actDotOff]} />
        <View>
          <Text style={s.actLabel}>{meta.label}</Text>
          <Text style={s.actSub}>{meta.sub}</Text>
        </View>
      </View>
      <View style={s.actRight}>
        {done ? (
          <View style={s.actBarArea}>
            <MiniBar value={correct} maxValue={total || 1} />
            <Text style={s.actScore}>{correct}/{total}</Text>
          </View>
        ) : (
          <Text style={s.actPending}>미완료</Text>
        )}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const [passages, setPassages] = useState([]);
  const [search, setSearch] = useState('');
  const [isReordering, setIsReordering] = useState(false);

  const scrollRef = useRef(null);
  // 각 카드의 y 오프셋을 저장
  const cardOffsets = useRef({});

  useFocusEffect(
    useCallback(() => {
      getPassages().then(setPassages);
    }, [])
  );

  const handleMove = async (index, direction) => {
    const next = [...passages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPassages(next);
    await savePassages(next);
  };

  // 검색어로 필터된 지문 (순서는 passages 배열 그대로)
  const filtered = search.trim()
    ? passages.filter((p) =>
        p.title.toLowerCase().includes(search.trim().toLowerCase())
      )
    : passages;

  // 검색 후 첫 번째 매칭 지문으로 스크롤 (전체 목록 기준 offset 사용)
  const handleSearch = (text) => {
    setSearch(text);
    // 검색어 지울 때 순서 편집 모드도 함께 종료
    if (!text.trim()) {
      setIsReordering(false);
      return;
    }
    const match = passages.find((p) =>
      p.title.toLowerCase().includes(text.trim().toLowerCase())
    );
    if (match && cardOffsets.current[match.id] !== undefined) {
      scrollRef.current?.scrollTo({ y: cardOffsets.current[match.id] - 16, animated: true });
    }
  };

  // Overall stats (전체 기준)
  const totalActivities = passages.length * 4;
  let completedActivities = 0;
  passages.forEach((p) => {
    if (p.progress?.type1?.completed) completedActivities++;
    if (p.progress?.type2?.completed) completedActivities++;
    if (p.progress?.type3?.completed) completedActivities++;
    if (p.progress?.vocab?.completed) completedActivities++;
  });
  const overallPct =
    totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>진도율</Text>

        {/* Summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{overallPct}%</Text>
              <Text style={s.summaryLabel}>전체 달성률</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{completedActivities}</Text>
              <Text style={s.summaryLabel}>완료 활동</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{passages.length}</Text>
              <Text style={s.summaryLabel}>총 지문</Text>
            </View>
          </View>
          <View style={s.overallBarBg}>
            <View style={[s.overallBarFill, { width: `${overallPct}%` }]} />
          </View>
        </View>

        {/* 검색창 */}
        {passages.length > 0 && (
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={16} color="#AAAAAA" style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="지문 이름 검색"
              placeholderTextColor="#BBBBBB"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#CCCCCC" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 리스트 헤더 */}
        {passages.length > 0 && (
          <View style={s.listHeader}>
            <Text style={s.listTitle}>
              {search.trim() ? `검색 결과 ${filtered.length}개` : `전체 ${passages.length}개`}
            </Text>
            {passages.length > 1 && !search.trim() && (
              <TouchableOpacity
                style={[s.reorderBtn, isReordering && s.reorderBtnActive]}
                onPress={() => setIsReordering((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={[s.reorderBtnText, isReordering && s.reorderBtnTextActive]}>
                  {isReordering ? '완료' : '순서 편집'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {passages.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>학습 데이터가 없습니다</Text>
            <Text style={s.emptySub}>홈 탭에서 지문을 추가하고 학습을 시작하세요.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>검색 결과가 없습니다</Text>
            <Text style={s.emptySub}>다른 검색어를 입력해보세요.</Text>
          </View>
        ) : (
          passages.map((passage, index) => {
            const isVisible = filtered.some((p) => p.id === passage.id);
            const realIndex = index;
            const compCount = ACTIVITY_META.filter(
              (m) => passage.progress?.[m.key]?.completed
            ).length;

            return (
              <View
                key={passage.id}
                style={!isVisible && { height: 0, overflow: 'hidden' }}
                onLayout={(e) => {
                  cardOffsets.current[passage.id] = e.nativeEvent.layout.y;
                }}
              >
                <View style={s.passageCard}>
                  {/* 순서 편집 버튼 */}
                  {isReordering && (
                    <View style={s.reorderRow}>
                      <TouchableOpacity
                        onPress={() => handleMove(realIndex, -1)}
                        disabled={realIndex === 0}
                        style={s.reorderArrowBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-up" size={20} color={realIndex === 0 ? '#DDDDDD' : '#000000'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMove(realIndex, 1)}
                        disabled={realIndex === passages.length - 1}
                        style={s.reorderArrowBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-down" size={20} color={realIndex === passages.length - 1 ? '#DDDDDD' : '#000000'} />
                      </TouchableOpacity>
                      <Text style={s.reorderIndex}>{index + 1}</Text>
                    </View>
                  )}

                  {/* Card header */}
                  <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.passageTitle} numberOfLines={1}>
                        {passage.title}
                      </Text>
                      <Text style={s.passageDate}>
                        {new Date(passage.createdAt).toLocaleDateString('ko-KR')}
                      </Text>
                    </View>
                    <View style={s.completionBadge}>
                      <Text style={s.completionText}>{compCount}/4</Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={s.innerDivider} />

                  {/* Activity rows */}
                  {ACTIVITY_META.map((meta, i) => (
                    <React.Fragment key={meta.key}>
                      <ActivityRow meta={meta} prog={passage.progress?.[meta.key]} />
                      {i < ACTIVITY_META.length - 1 && <View style={s.rowDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 100 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 16,
  },

  summaryCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  overallBarBg: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  overallBarFill: { height: 2.5, backgroundColor: '#FFFFFF', borderRadius: 2 },

  // 검색
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  searchIcon: { marginRight: 0 },
  searchInput: { flex: 1, fontSize: 14, color: '#000000', padding: 0 },

  // 리스트 헤더
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#AAAAAA' },
  reorderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  reorderBtnActive: { backgroundColor: '#000000', borderColor: '#000000' },
  reorderBtnText: { fontSize: 12, fontWeight: '600', color: '#555555' },
  reorderBtnTextActive: { color: '#FFFFFF' },

  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#AAAAAA' },
  emptySub: { fontSize: 13, color: '#CCCCCC', textAlign: 'center', lineHeight: 20 },

  passageCard: {
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
  },

  // 순서 편집
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reorderArrowBtn: {
    padding: 4,
  },
  reorderIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AAAAAA',
    marginLeft: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  passageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  passageDate: { fontSize: 11, color: '#BBBBBB', marginTop: 2 },
  completionBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  completionText: { fontSize: 13, fontWeight: '700', color: '#555555' },
  innerDivider: { height: 1, backgroundColor: '#F5F5F5', marginBottom: 12 },
  rowDivider: { height: 1, backgroundColor: '#F9F9F9', marginVertical: 10 },

  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actDot: { width: 7, height: 7, borderRadius: 3.5 },
  actDotOn: { backgroundColor: '#000000' },
  actDotOff: { backgroundColor: '#E0E0E0' },
  actLabel: { fontSize: 13, fontWeight: '600', color: '#000000' },
  actSub: { fontSize: 11, color: '#AAAAAA', marginTop: 1 },
  actRight: {},
  actBarArea: { alignItems: 'flex-end', gap: 4 },
  actPending: { fontSize: 12, color: '#CCCCCC', fontWeight: '500' },
  actScore: { fontSize: 11, color: '#888888' },

  miniBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBarBg: { width: 80, height: 3, backgroundColor: '#EEEEEE', borderRadius: 2 },
  miniBarFill: { height: 3, backgroundColor: '#000000', borderRadius: 2 },
  miniBarPct: { fontSize: 12, fontWeight: '600', color: '#555555', minWidth: 32, textAlign: 'right' },
});
