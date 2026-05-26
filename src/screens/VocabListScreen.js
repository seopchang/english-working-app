import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPassageById } from '../utils/storage';

export default function VocabListScreen({ route, navigation }) {
  const { passageId } = route.params;
  const [vocab, setVocab] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPassageById(passageId).then((p) => {
      if (p) setVocab(p.vocabulary || []);
    });
  }, [passageId]);

  const filtered = search.trim()
    ? vocab.filter(
        (v) =>
          v.word.toLowerCase().includes(search.toLowerCase()) ||
          v.meaning.includes(search)
      )
    : vocab;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>단어장</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#AAAAAA" />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="단어 검색..."
          placeholderTextColor="#BBBBBB"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#BBBBBB" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{filtered.length}개 단어</Text>
        <View style={s.card}>
          {filtered.map((item, i) => (
            <View key={i} style={[s.row, i > 0 && s.rowBorder]}>
              <Text style={s.word}>{item.word}</Text>
              <Text style={s.meaning}>{item.meaning}</Text>
            </View>
          ))}
          {filtered.length === 0 && (
            <Text style={s.empty}>검색 결과가 없습니다.</Text>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#000000' },

  content: { paddingHorizontal: 16, paddingBottom: 40 },
  count: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  word: {
    width: 150,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  meaning: {
    flex: 1,
    fontSize: 13,
    color: '#555555',
    lineHeight: 19,
  },
  empty: {
    textAlign: 'center',
    padding: 24,
    color: '#BBBBBB',
    fontSize: 13,
  },
});
