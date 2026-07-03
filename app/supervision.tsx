import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PCard, StatCard } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { SUPERVISION_TYPES, SUPERVISION_TYPE_LABELS } from '@/constants/config';

interface SupervisionEntry {
  id: string; supervisor_name: string; session_date: string; hours: number;
  type: 'individual' | 'group'; cost: number | null; notes: string | null;
}

export default function SupervisionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [entries, setEntries] = useState<SupervisionEntry[]>([]);
  const [modal, setModal] = useState(false);
  const [supervisor, setSupervisor] = useState('');
  const [hours, setHours] = useState('');
  const [type, setType] = useState<'individual' | 'group'>('individual');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('supervision_log').select('*').eq('therapist_id', user.id).order('session_date', { ascending: false });
    if (data) setEntries(data as SupervisionEntry[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user) return;
    const h = parseFloat(hours);
    if (!supervisor.trim() || !h) { showAlert('Required', 'Add supervisor name and hours.'); return; }
    setSaving(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('supervision_log').insert({
      therapist_id: user.id,
      supervisor_name: supervisor.trim(),
      session_date: new Date().toISOString().slice(0, 10),
      hours: h,
      type,
      cost: parseFloat(cost) || null,
      notes: notes.trim() || null,
    }).select().single();
    setSaving(false);
    if (error || !data) { showAlert('Could not save', error?.message || 'Unknown error'); return; }
    setEntries(prev => [data as SupervisionEntry, ...prev]);
    setSupervisor(''); setHours(''); setCost(''); setNotes(''); setModal(false);
  };

  // Hours logged in the current calendar year.
  const yearHours = entries
    .filter(e => new Date(e.session_date).getFullYear() === new Date().getFullYear())
    .reduce((s, e) => s + Number(e.hours), 0);
  const totalCost = entries.reduce((s, e) => s + (Number(e.cost) || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>Supervision log</Text>
        <Pressable onPress={() => setModal(true)} hitSlop={8}><MaterialIcons name="add" size={24} color={Colors.primaryGlow} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard label="Hours this year" value={String(yearHours)} color={Colors.primaryGlow} />
          <StatCard label="Total spend" value={`£${totalCost.toFixed(0)}`} sub="deductible" />
        </View>
        <Text style={styles.note}>Clinical supervision is a professional requirement and an allowable expense. Cost entries also appear in your Tax Pot when added there.</Text>

        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No supervision recorded yet.</Text>
        ) : entries.map(e => (
          <PCard key={e.id} style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName}>{e.supervisor_name}</Text>
                <Text style={styles.entryMeta}>{new Date(e.session_date).toLocaleDateString('en-GB')} · {SUPERVISION_TYPE_LABELS[e.type]}</Text>
                {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.entryHours}>{e.hours}h</Text>
                {e.cost ? <Text style={styles.entryCost}>£{Number(e.cost).toFixed(0)}</Text> : null}
              </View>
            </View>
          </PCard>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log supervision</Text>
            <TextInput style={styles.input} placeholder="Supervisor name" placeholderTextColor={Colors.textMuted} value={supervisor} onChangeText={setSupervisor} />
            <View style={styles.row}>
              {SUPERVISION_TYPES.map(t => (
                <Pressable key={t} style={[styles.segment, type === t && styles.segmentActive]} onPress={() => setType(t)}>
                  <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>{SUPERVISION_TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Hours" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={hours} onChangeText={setHours} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Cost £ (optional)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={cost} onChangeText={setCost} />
            </View>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Notes (optional)" placeholderTextColor={Colors.textMuted} value={notes} onChangeText={setNotes} multiline />
            <View style={styles.row}>
              <PButton label="Cancel" variant="ghost" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <PButton label="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  note: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 17 },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted },
  entryCard: { padding: 14 },
  entryRow: { flexDirection: 'row', gap: 12 },
  entryName: { ...Typography.dataMD, fontSize: 14 },
  entryMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  entryNotes: { ...Typography.bodySM, color: Colors.textSecondary, marginTop: 6 },
  entryHours: { ...Typography.dataMD, color: Colors.primaryGlow },
  entryCost: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1, borderColor: Colors.border },
  modalTitle: { ...Typography.brandSM, marginBottom: 4 },
  input: { backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, ...Typography.bodyMD, color: Colors.textPrimary },
  row: { flexDirection: 'row', gap: Spacing.sm },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { ...Typography.btnSM, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
});
