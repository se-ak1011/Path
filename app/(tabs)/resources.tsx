import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PCard, PBadge } from '@/components';
import { RESOURCES, CATEGORY_LABELS, TYPE_LABELS, TYPE_ICON, type ResourceCategory } from '@/lib/resources';

type Filter = 'all' | ResourceCategory;

export default function ResourcesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = filter === 'all' ? RESOURCES : RESOURCES.filter(r => r.category === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Resources</Text>
      </View>
      <Text style={styles.subtitle}>Session guides, approaches & exercises for chronic illness and alcohol.</Text>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Search resources"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filters}>
        {(['all', 'chronic_illness', 'alcohol'] as Filter[]).map(f => (
          <Pressable key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : CATEGORY_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map(r => (
          <PCard key={r.id} style={styles.card} onPress={() => router.push(`/resources/${r.id}`)}>
            <View style={styles.cardRow}>
              <View style={styles.icon}>
                <MaterialIcons name={TYPE_ICON[r.type] as any} size={20} color={Colors.primaryGlow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardSummary} numberOfLines={2}>{r.summary}</Text>
                <View style={styles.badges}>
                  <PBadge label={TYPE_LABELS[r.type]} variant="active" />
                  <Text style={styles.meta}>{CATEGORY_LABELS[r.category]}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
            </View>
          </PCard>
        ))}

        <View style={styles.disclaimer}>
          <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Evidence-informed guidance to adapt to the individual client — not a protocol, and not a substitute
            for your training, supervision or clinical judgement.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  title: { ...Typography.brandLG },
  subtitle: { ...Typography.bodySM, color: Colors.textSecondary, paddingHorizontal: Spacing.md, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 46,
  },
  search: { flex: 1, ...Typography.bodyMD, color: Colors.textPrimary },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { ...Typography.labelSM, color: Colors.textSecondary },
  filterTextActive: { color: Colors.textInverse, fontWeight: '600' },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...Typography.dataMD, fontSize: 15 },
  cardSummary: { ...Typography.bodySM, color: Colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  meta: { ...Typography.labelSM, color: Colors.textMuted },
  disclaimer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: Spacing.md, paddingHorizontal: 2 },
  disclaimerText: { ...Typography.labelSM, color: Colors.textMuted, flex: 1, lineHeight: 16 },
});
