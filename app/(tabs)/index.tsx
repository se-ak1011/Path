import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PCard, PBadge, StatCard } from '@/components';
import { useAuth, getTrialDaysLeft, isTrialActive } from '@/hooks/useAuth';
import { useClients } from '@/contexts/ClientsContext';
import { useSessions } from '@/contexts/SessionsContext';
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/constants/config';

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { clients, activeClients, refresh: refreshClients, loading: cl } = useClients();
  const { todaysSessions, upcomingSessions, refresh: refreshSessions, loading: sl } = useSessions();

  const refByClient = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach(c => { m[c.id] = c.alias || c.client_ref; });
    return m;
  }, [clients]);

  const today = todaysSessions
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const nextUp = upcomingSessions.filter(s => !today.includes(s)).slice(0, 3);

  const trialDays = getTrialDaysLeft(user);
  const showTrial = isTrialActive(user);

  const onRefresh = () => { refreshClients(); refreshSessions(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={cl || sl} onRefresh={onRefresh} tintColor={Colors.primaryGlow} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{user?.full_name || 'Therapist'}</Text>
        </View>

        {showTrial ? (
          <View style={styles.trialBanner}>
            <MaterialIcons name="schedule" size={16} color={Colors.primaryGlow} />
            <Text style={styles.trialText}>{trialDays} days left in your free trial</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label="Active clients" value={String(activeClients.length)} />
          <StatCard label="Today" value={String(today.length)} sub="sessions" />
          <StatCard label="Upcoming" value={String(upcomingSessions.length)} color={Colors.primaryGlow} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s sessions</Text>
          <Pressable onPress={() => router.push('/session/new')} hitSlop={8}>
            <MaterialIcons name="add" size={22} color={Colors.primaryGlow} />
          </Pressable>
        </View>

        {today.length === 0 ? (
          <PCard>
            <Text style={styles.emptyText}>No sessions scheduled today.</Text>
          </PCard>
        ) : (
          today.map(s => (
            <PCard key={s.id} style={styles.sessionCard} onPress={() => router.push(`/session/${s.id}`)}>
              <View style={styles.sessionRow}>
                <Text style={styles.sessionTime}>{timeLabel(s.scheduled_at)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionClient}>{refByClient[s.client_id] || 'Client'}</Text>
                  <Text style={styles.sessionMeta}>
                    {SESSION_TYPE_LABELS[s.session_type]} · {s.duration_min} min
                  </Text>
                </View>
                <PBadge
                  label={SESSION_STATUS_LABELS[s.status]}
                  variant={s.status === 'completed' ? 'completed' : s.status === 'cancelled' || s.status === 'dna' ? 'cancelled' : 'active'}
                />
              </View>
            </PCard>
          ))
        )}

        {nextUp.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Next up</Text>
            {nextUp.map(s => (
              <PCard key={s.id} style={styles.sessionCard} onPress={() => router.push(`/session/${s.id}`)}>
                <View style={styles.sessionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionClient}>{refByClient[s.client_id] || 'Client'}</Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(s.scheduled_at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · {timeLabel(s.scheduled_at)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
                </View>
              </PCard>
            ))}
          </>
        ) : null}

        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/client/new')}>
            <MaterialIcons name="person-add" size={20} color={Colors.primaryGlow} />
            <Text style={styles.quickText}>New client</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/invoice/new')}>
            <MaterialIcons name="receipt-long" size={20} color={Colors.primaryGlow} />
            <Text style={styles.quickText}>New invoice</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: { gap: 2 },
  greeting: { ...Typography.bodyMD, color: Colors.textSecondary },
  name: { ...Typography.brandLG },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryDim, borderColor: Colors.primary, borderWidth: 1,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10,
  },
  trialText: { ...Typography.labelMD, color: Colors.primaryGlow },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  sectionTitle: { ...Typography.headingMD },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
  sessionCard: { padding: 14 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionTime: { ...Typography.dataMD, color: Colors.primaryGlow, width: 56 },
  sessionClient: { ...Typography.dataMD },
  sessionMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1,
    borderRadius: Radius.md, paddingVertical: 14,
  },
  quickText: { ...Typography.btnSM, color: Colors.textPrimary },
});
