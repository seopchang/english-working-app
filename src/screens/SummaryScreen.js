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

function parseSummary(text) {
  if (!text) return [{ type: 'body', content: '' }];
  const sectionRegex = /\[([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = sectionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index).trim();
      if (before) parts.push({ type: 'body', content: before });
    }
    parts.push({ type: 'heading', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) parts.push({ type: 'body', content: remaining });
  }

  if (parts.length === 0) parts.push({ type: 'body', content: text });
  return parts;
}

export default function SummaryScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [passage, setPassage] = useState(null);

  useEffect(() => {
    getPassageById(passageId).then(setPassage);
  }, [passageId]);

  if (!passage) return null;

  const sections = parseSummary(passage.summary);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>내용 요약</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title banner */}
        <View style={s.titleBanner}>
          <Text style={s.bannerEyebrow}>ANALYSIS</Text>
          <Text style={s.bannerTitle}>{passage.title}</Text>
        </View>

        {/* Summary content */}
        <View style={s.summaryCard}>
          {sections.map((part, i) => {
            if (part.type === 'heading') {
              return (
                <View key={i} style={i > 0 ? s.sectionBreak : null}>
                  {i > 0 && <View style={s.divider} />}
                  <Text style={s.sectionHeading}>{part.content}</Text>
                </View>
              );
            }
            // Split body by bullet points
            const lines = part.content.split('\n').filter((l) => l.trim());
            return (
              <View key={i}>
                {lines.map((line, j) => {
                  const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                  return (
                    <View key={j} style={isBullet ? s.bulletRow : null}>
                      {isBullet ? (
                        <>
                          <Text style={s.bulletDot}>•</Text>
                          <Text style={s.bulletText}>
                            {line.replace(/^[•\-]\s*/, '')}
                          </Text>
                        </>
                      ) : (
                        <Text style={s.bodyText}>{line}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Flow section */}
        {passage.flow?.length > 0 && (
          <View style={s.flowSection}>
            <Text style={s.flowTitle}>문장별 흐름</Text>
            {passage.flow.map((sentence, i) => (
              <View key={i} style={s.flowBlock}>
                <View style={s.flowCard}>
                  <View style={s.flowNumBadge}>
                    <Text style={s.flowNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.flowText}>{sentence}</Text>
                </View>
                {i < passage.flow.length - 1 && (
                  <View style={s.flowArrowWrap}>
                    <View style={s.flowArrowLine} />
                    <Text style={s.flowArrowHead}>▼</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
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

  titleBanner: {
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 14,
  },
  sectionBreak: { marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: { fontSize: 14, color: '#000000', marginRight: 8, lineHeight: 22, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 14, color: '#333333', lineHeight: 22 },
  bodyText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 23,
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  flowSection: {
    marginBottom: 14,
  },
  flowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  flowBlock: {
    alignItems: 'center',
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    padding: 14,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  flowNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  flowNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  flowText: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
    lineHeight: 22,
    fontWeight: '500',
  },
  flowArrowWrap: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  flowArrowLine: {
    width: 1.5,
    height: 8,
    backgroundColor: '#CCCCCC',
  },
  flowArrowHead: {
    fontSize: 10,
    color: '#CCCCCC',
    lineHeight: 12,
  },
});
