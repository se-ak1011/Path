import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PBadge } from '@/components';
import { useSessions, type TherapySession } from '@/contexts/SessionsContext';
import { useClients } from '@/contexts/ClientsContext';
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/constants/config';

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions, loading, refresh } = useSessions();
  const { clients } = useClients();

  const refByClient = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach(c => { m[c.id] = c.alias || c.client_ref; });
    return m;
  }, [clients]);

  const sections = useMemo(() => {
    const now = new Date();
    const upcoming = sessions.filter(s => new Date(s.scheduled_at) >= now).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const past = sessions.filter(s => new Date(s.scheduled_at) < now).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    const out: { title: string; data: TherapySession[] }[] = [];
    if (upcoming.length) out.push({ title: 'Upcoming', data: upcoming });
    if (past.length) out.push({ title: 'Past', data: past });
    return out;
  }, [sessions]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Sessions</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/session/new')} hitSlop={8}>
          <MaterialIcons name="add" size={20} color={Colors.textInverse} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primaryGlow} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No sessions scheduled yet.</Text></View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const showDay = index === 0 || dayKey(section.data[index - 1].scheduled_at) !== dayKey(item.scheduled_at);
          return (
            <>
              {showDay ? <Text style={styles.dayHeader}>{dayKey(item.scheduled_at)}</Text> : null}
              <Pressable style={styles.card} onPress={() => router.push(`/session/${item.id}`)}>
                <Text style={styles.time}>{timeLabel(item.scheduled_at)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.client}>{refByClient[item.client_id] || 'Client'}</Text>
                  <Text style={styles.meta}>{SESSION_TYPE_LABELS[item.session_type]} · {item.duration_min} min · £{item.fee}</Text>
                </View>
                <PBadge
                  label={SESSION_STATUS_LABELS[item.status]}
                  variant={item.status === 'completed' ? 'completed' : item.status === 'cancelled' || item.status === 'dna' ? 'cancelled' : 'active'}
                />
              </Pressable>
            </>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
  title: { ...Typography.brandLG },
  addBtn: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl },
  sectionTitle: { ...Typography.labelXS, marginTop: Spacing.md, marginBottom: Spacing.sm },
  dayHeader: { ...Typography.labelSM, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm,
    backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.lg, padding: 14,
  },
  time: { ...Typography.dataMD, color: Colors.primaryGlow, width: 56 },
  client: { ...Typography.dataMD },
  meta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: Spacing.md },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
});
