import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { PCard, PBadge, PButton } from '@/components';
import { useSessions, type SessionStatus } from '@/contexts/SessionsContext';
import { useClients } from '@/contexts/ClientsContext';
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, DELIVERY_LABELS } from '@/constants/config';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, setStatus } = useSessions();
  const { clients } = useClients();

  const session = sessions.find(s => s.id === id);
  const client = session ? clients.find(c => c.id === session.client_id) : undefined;

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable></View>
        <Text style={styles.emptyText}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const when = new Date(session.scheduled_at);
  const setSt = (s: SessionStatus) => setStatus(session.id, s);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <PBadge label={SESSION_STATUS_LABELS[session.status]} variant={session.status === 'completed' ? 'completed' : session.status === 'cancelled' || session.status === 'dna' ? 'cancelled' : 'active'} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => client && router.push(`/client/${client.id}`)}>
          <Text style={styles.client}>{client?.alias || client?.client_ref || 'Client'}</Text>
        </Pressable>
        <Text style={styles.dateBig}>{when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        <Text style={styles.timeBig}>{when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>

        <PCard>
          <Detail label="Type" value={SESSION_TYPE_LABELS[session.session_type]} />
          <Detail label="Duration" value={`${session.duration_min} minutes`} />
          <Detail label="Delivery" value={DELIVERY_LABELS[session.delivery]} />
          <Detail label="Fee" value={`£${session.fee}`} last />
        </PCard>

        <Text style={styles.sectionTitle}>Clinical record</Text>
        <PCard onPress={() => router.push(`/session/note?sessionId=${session.id}&clientId=${session.client_id}`)} style={styles.linkCard}>
          <MaterialIcons name="edit-note" size={22} color={Colors.primaryGlow} />
          <View style={{ flex: 1 }}><Text style={styles.linkTitle}>Session note</Text><Text style={styles.linkMeta}>SOAP / DAP / free — AI-assisted</Text></View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </PCard>
        <PCard onPress={() => router.push(`/session/measure?sessionId=${session.id}&clientId=${session.client_id}`)} style={styles.linkCard}>
          <MaterialIcons name="assignment" size={22} color={Colors.primaryGlow} />
          <View style={{ flex: 1 }}><Text style={styles.linkTitle}>Outcome measure</Text><Text style={styles.linkMeta}>PHQ-9 · GAD-7 · CORE-10</Text></View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </PCard>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.actionsWrap}>
          <PButton label="Mark completed" onPress={() => setSt('completed')} variant={session.status === 'completed' ? 'primary' : 'secondary'} />
          <View style={styles.actionRow}>
            <PButton label="Cancelled" variant="ghost" onPress={() => setSt('cancelled')} style={{ flex: 1 }} />
            <PButton label="DNA" variant="ghost" onPress={() => setSt('dna')} style={{ flex: 1 }} />
          </View>
          {session.status !== 'scheduled' ? <PButton label="Reset to scheduled" variant="ghost" onPress={() => setSt('scheduled')} /> : null}
        </View>
        <Text style={styles.hint}>DNA = Did Not Attend (no notice given). Cancelled = notice given in advance.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  client: { ...Typography.brandMD, color: Colors.primaryGlow },
  dateBig: { ...Typography.dataLG, marginTop: 4 },
  timeBig: { ...Typography.bodyMD, color: Colors.textSecondary },
  sectionTitle: { ...Typography.headingMD, marginTop: Spacing.sm },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  linkTitle: { ...Typography.dataMD, fontSize: 14 },
  linkMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  detailLabel: { ...Typography.labelMD, color: Colors.textMuted },
  detailValue: { ...Typography.dataMD, fontSize: 14 },
  actionsWrap: { gap: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  hint: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 17 },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted, padding: Spacing.md },
});
