import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PInput } from '@/components';
import { useClients } from '@/contexts/ClientsContext';
import { useSessions, type SessionType } from '@/contexts/SessionsContext';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { SESSION_TYPES, SESSION_TYPE_LABELS, SESSION_DURATIONS, DELIVERY_LABELS } from '@/constants/config';

export default function NewSessionScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { activeClients, clients } = useClients();
  const { addSession } = useSessions();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [selectedClient, setSelectedClient] = useState<string | undefined>(clientId);
  const [when, setWhen] = useState(() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [type, setType] = useState<SessionType>('session');
  const [duration, setDuration] = useState(50);
  const [delivery, setDelivery] = useState<'in_person' | 'online'>('in_person');
  const [fee, setFee] = useState(user?.session_fee ? String(user.session_fee) : '');
  const [saving, setSaving] = useState(false);

  const clientList = activeClients.length ? activeClients : clients;

  const openPicker = (mode: 'date' | 'time') => { setPickerMode(mode); setShowPicker(true); };
  const onPicked = (_e: any, date?: Date) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (date) setWhen(date);
  };

  const save = async () => {
    if (!selectedClient) { showAlert('Client required', 'Choose which client this session is for.'); return; }
    setSaving(true);
    const { data, error } = await addSession({
      client_id: selectedClient,
      scheduled_at: when.toISOString(),
      duration_min: duration,
      session_type: type,
      delivery,
      fee: parseFloat(fee) || 0,
    });
    setSaving(false);
    if (error || !data) { showAlert('Could not schedule', error || 'Unknown error'); return; }
    router.replace(`/session/${data.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="close" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>Schedule session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>CLIENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {clientList.map(c => (
            <Pressable key={c.id} style={[styles.chip, selectedClient === c.id && styles.chipActive]} onPress={() => setSelectedClient(c.id)}>
              <Text style={[styles.chipText, selectedClient === c.id && styles.chipTextActive]}>{c.alias || c.client_ref}</Text>
            </Pressable>
          ))}
          {clientList.length === 0 ? <Text style={styles.emptyText}>Add a client first.</Text> : null}
        </ScrollView>

        <Text style={styles.label}>WHEN</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateBtn} onPress={() => openPicker('date')}>
            <MaterialIcons name="calendar-today" size={18} color={Colors.primaryGlow} />
            <Text style={styles.dateText}>{when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </Pressable>
          <Pressable style={styles.dateBtn} onPress={() => openPicker('time')}>
            <MaterialIcons name="schedule" size={18} color={Colors.primaryGlow} />
            <Text style={styles.dateText}>{when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </Pressable>
        </View>
        {showPicker ? <DateTimePicker value={when} mode={pickerMode} onChange={onPicked} themeVariant="dark" /> : null}

        <Text style={styles.label}>TYPE</Text>
        <View style={styles.row}>
          {SESSION_TYPES.map(t => (
            <Pressable key={t} style={[styles.segment, type === t && styles.segmentActive]} onPress={() => setType(t)}>
              <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>{SESSION_TYPE_LABELS[t]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>DURATION</Text>
        <View style={styles.wrapRow}>
          {SESSION_DURATIONS.map(d => (
            <Pressable key={d} style={[styles.pill, duration === d && styles.pillActive]} onPress={() => setDuration(d)}>
              <Text style={[styles.pillText, duration === d && styles.pillTextActive]}>{d}m</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>DELIVERY</Text>
        <View style={styles.row}>
          {(['in_person', 'online'] as const).map(d => (
            <Pressable key={d} style={[styles.segment, delivery === d && styles.segmentActive]} onPress={() => setDelivery(d)}>
              <Text style={[styles.segmentText, delivery === d && styles.segmentTextActive]}>{DELIVERY_LABELS[d]}</Text>
            </Pressable>
          ))}
        </View>

        <PInput label="Fee (£)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" placeholder="60" />

        <PButton label="Schedule session" onPress={save} loading={saving} style={{ marginTop: Spacing.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  label: { ...Typography.labelXS, marginTop: Spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.labelMD, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse, fontWeight: '600' },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 14 },
  dateText: { ...Typography.dataMD, fontSize: 14 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { ...Typography.btnSM, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { ...Typography.labelMD, color: Colors.textSecondary },
  pillTextActive: { color: Colors.textInverse, fontWeight: '600' },
});
