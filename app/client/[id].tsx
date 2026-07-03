import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PCard, PBadge, PButton } from '@/components';
import { useClients, type ClientContact } from '@/contexts/ClientsContext';
import { useSessions } from '@/contexts/SessionsContext';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { INSTRUMENTS, type Instrument } from '@/lib/outcomes';
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, CLIENT_STATUS_LABELS } from '@/constants/config';

interface MeasureRow {
  id: string;
  instrument: Instrument;
  total_score: number;
  severity: string;
  taken_on: string;
}

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients, updateClient, getContact } = useClients();
  const { sessionsForClient } = useSessions();
  const { showAlert } = useAlert();

  const client = clients.find(c => c.id === id);
  const sessions = id ? sessionsForClient(id) : [];

  const [measures, setMeasures] = useState<MeasureRow[]>([]);
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [contactShown, setContactShown] = useState(false);

  const loadMeasures = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('outcome_measures')
      .select('id, instrument, total_score, severity, taken_on')
      .eq('client_id', id)
      .order('taken_on', { ascending: true });
    if (data) setMeasures(data as MeasureRow[]);
  }, [id]);

  useFocusEffect(useCallback(() => { loadMeasures(); }, [loadMeasures]));

  const revealContact = async () => {
    if (!id) return;
    const c = await getContact(id);
    setContact(c);
    setContactShown(true);
  };

  const changeStatus = () => {
    if (!client) return;
    const options: { text: string; value: 'active' | 'paused' | 'ended' }[] = [
      { text: 'Active', value: 'active' },
      { text: 'Paused', value: 'paused' },
      { text: 'Ended', value: 'ended' },
    ];
    showAlert('Set status', 'Change this client’s status.', [
      ...options.map(o => ({
        text: o.text,
        onPress: async () => {
          await updateClient(client.id, { status: o.value, end_date: o.value === 'ended' ? new Date().toISOString().slice(0, 10) : null });
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (!client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable></View>
        <Text style={styles.emptyText}>Client not found.</Text>
      </SafeAreaView>
    );
  }

  // Build the outcome chart from the most-recorded instrument.
  const byInstrument: Record<string, MeasureRow[]> = {};
  measures.forEach(m => { (byInstrument[m.instrument] ??= []).push(m); });
  const chartInstrument = (Object.keys(byInstrument).sort((a, b) => byInstrument[b].length - byInstrument[a].length)[0]) as Instrument | undefined;
  const chartData = chartInstrument ? byInstrument[chartInstrument] : [];
  const width = Dimensions.get('window').width - Spacing.md * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <Pressable onPress={changeStatus} hitSlop={8}><MaterialIcons name="more-horiz" size={24} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{client.client_ref.slice(0, 2).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{client.alias || client.client_ref}</Text>
            <Text style={styles.ref}>Ref: {client.client_ref}</Text>
          </View>
          <PBadge label={CLIENT_STATUS_LABELS[client.status]} variant={client.status === 'active' ? 'active' : client.status === 'ended' ? 'cancelled' : 'draft'} />
        </View>

        {client.presenting_issue ? <Text style={styles.presenting}>{client.presenting_issue}</Text> : null}
        {client.risk_flag ? (
          <View style={styles.riskBanner}>
            <MaterialIcons name="flag" size={16} color={Colors.warning} />
            <Text style={styles.riskText}>Safeguarding flag set — review risk considerations.</Text>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.actionRow}>
          <Action icon="event" label="Schedule" onPress={() => router.push(`/session/new?clientId=${client.id}`)} />
          <Action icon="assignment" label="Measure" onPress={() => router.push(`/session/measure?clientId=${client.id}`)} />
          <Action icon="lock" label="Message" onPress={() => router.push(`/messages/${client.id}`)} disabled={client.status !== 'active'} />
        </View>

        {/* Outcome progress */}
        <Text style={styles.sectionTitle}>Outcome measures</Text>
        {chartData.length >= 2 && chartInstrument ? (
          <PCard>
            <Text style={styles.chartTitle}>{INSTRUMENTS[chartInstrument].name} · {INSTRUMENTS[chartInstrument].subtitle}</Text>
            <LineChart
              data={{ labels: chartData.map(d => new Date(d.taken_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })), datasets: [{ data: chartData.map(d => d.total_score) }] }}
              width={width - 32}
              height={180}
              chartConfig={{
                backgroundGradientFrom: Colors.card,
                backgroundGradientTo: Colors.card,
                decimalPlaces: 0,
                color: () => Colors.primaryGlow,
                labelColor: () => Colors.textMuted,
                propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
              }}
              bezier
              style={{ marginLeft: -8, marginTop: 8 }}
            />
          </PCard>
        ) : measures.length > 0 ? (
          measures.slice().reverse().map(m => (
            <View key={m.id} style={styles.measureRow}>
              <Text style={styles.measureName}>{INSTRUMENTS[m.instrument].name}</Text>
              <Text style={styles.measureScore}>{m.total_score}/{INSTRUMENTS[m.instrument].max} · {m.severity}</Text>
              <Text style={styles.measureDate}>{new Date(m.taken_on).toLocaleDateString('en-GB')}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No measures recorded yet. Add PHQ-9, GAD-7 or CORE-10 to track progress.</Text>
        )}

        {/* Sessions */}
        <Text style={styles.sectionTitle}>Sessions ({sessions.length})</Text>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet.</Text>
        ) : sessions.map(s => (
          <PCard key={s.id} style={styles.sessionCard} onPress={() => router.push(`/session/${s.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionDate}>{new Date(s.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.sessionMeta}>{SESSION_TYPE_LABELS[s.session_type]} · {s.duration_min} min</Text>
            </View>
            <PBadge label={SESSION_STATUS_LABELS[s.status]} variant={s.status === 'completed' ? 'completed' : s.status === 'cancelled' || s.status === 'dna' ? 'cancelled' : 'active'} />
          </PCard>
        ))}

        {/* Contact — kept separate, revealed on demand */}
        <Text style={styles.sectionTitle}>Contact details</Text>
        {!contactShown ? (
          <PButton label="Reveal contact details" variant="secondary" onPress={revealContact} />
        ) : contact ? (
          <PCard>
            <ContactRow label="Name" value={contact.full_name} />
            <ContactRow label="Phone" value={contact.phone} />
            <ContactRow label="Email" value={contact.email} />
            <ContactRow label="Emergency" value={contact.emergency_contact_name ? `${contact.emergency_contact_name}${contact.emergency_contact_phone ? ` · ${contact.emergency_contact_phone}` : ''}` : null} last />
          </PCard>
        ) : (
          <Text style={styles.emptyText}>No contact details recorded.</Text>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress, disabled }: { icon: any; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.action, disabled && { opacity: 0.4 }]} onPress={disabled ? undefined : onPress}>
      <MaterialIcons name={icon} size={22} color={Colors.primaryGlow} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function ContactRow({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: Radius.lg, backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.dataMD, color: Colors.primaryGlow },
  name: { ...Typography.brandMD },
  ref: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  presenting: { ...Typography.bodyMD, color: Colors.textSecondary },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningDim, borderColor: Colors.warning, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  riskText: { ...Typography.labelSM, color: Colors.warning, flex: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 14 },
  actionText: { ...Typography.labelSM, color: Colors.textSecondary },
  sectionTitle: { ...Typography.headingMD, marginTop: Spacing.sm },
  chartTitle: { ...Typography.dataMD, fontSize: 14 },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  measureName: { ...Typography.dataMD, fontSize: 14, width: 70 },
  measureScore: { ...Typography.labelSM, color: Colors.textSecondary, flex: 1 },
  measureDate: { ...Typography.labelSM, color: Colors.textMuted },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sessionDate: { ...Typography.dataMD, fontSize: 14 },
  sessionMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  infoLabel: { ...Typography.labelMD, color: Colors.textMuted },
  infoValue: { ...Typography.dataMD, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
});
