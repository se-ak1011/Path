import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PCard, PBadge } from '@/components';
import { useClients } from '@/contexts/ClientsContext';
import { CLIENT_STATUS_LABELS } from '@/constants/config';

type Filter = 'active' | 'paused' | 'ended' | 'all';

export default function ClientsScreen() {
  const router = useRouter();
  const { clients, loading, refresh } = useClients();
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = filter === 'all' ? clients : clients.filter(c => c.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(c =>
        c.client_ref.toLowerCase().includes(q) ||
        (c.alias || '').toLowerCase().includes(q) ||
        (c.presenting_issue || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, filter, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Caseload</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/client/new')} hitSlop={8}>
          <MaterialIcons name="add" size={20} color={Colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Search by reference or issue"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filters}>
        {(['active', 'paused', 'ended', 'all'] as Filter[]).map(f => (
          <Pressable key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : CLIENT_STATUS_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primaryGlow} />}
      >
        {filtered.length === 0 ? (
          <PCard>
            <Text style={styles.emptyText}>
              {clients.length === 0 ? 'No clients yet. Add your first client to begin.' : 'No clients match this filter.'}
            </Text>
          </PCard>
        ) : (
          filtered.map(c => (
            <PCard key={c.id} style={styles.clientCard} onPress={() => router.push(`/client/${c.id}`)}>
              <View style={styles.clientRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.client_ref.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientRef}>{c.alias || c.client_ref}</Text>
                  <Text style={styles.clientMeta} numberOfLines={1}>
                    {c.presenting_issue || 'No presenting issue recorded'}
                  </Text>
                </View>
                {c.risk_flag ? <MaterialIcons name="flag" size={18} color={Colors.warning} /> : null}
                <PBadge
                  label={CLIENT_STATUS_LABELS[c.status]}
                  variant={c.status === 'active' ? 'active' : c.status === 'ended' ? 'cancelled' : 'draft'}
                />
              </View>
            </PCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
  title: { ...Typography.brandLG },
  addBtn: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md,
    backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1,
    borderRadius: Radius.md, paddingHorizontal: 14, height: 46,
  },
  search: { flex: 1, ...Typography.bodyMD, color: Colors.textPrimary },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { ...Typography.labelSM, color: Colors.textSecondary },
  filterTextActive: { color: Colors.textInverse, fontWeight: '600' },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
  clientCard: { padding: 14 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.dataMD, color: Colors.primaryGlow, fontSize: 13 },
  clientRef: { ...Typography.dataMD },
  clientMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
});
