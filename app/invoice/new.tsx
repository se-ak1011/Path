import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton } from '@/components';
import { useClients } from '@/contexts/ClientsContext';
import { useSessions } from '@/contexts/SessionsContext';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { SESSION_TYPE_LABELS } from '@/constants/config';

interface LineItem { description: string; date: string | null; qty: number; unit_fee: number; amount: number; }

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { clients } = useClients();
  const { sessionsForClient } = useSessions();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [selectedClient, setSelectedClient] = useState<string | undefined>(clientId);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extras, setExtras] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  const completedSessions = useMemo(() => {
    if (!selectedClient) return [];
    return sessionsForClient(selectedClient).filter(s => s.status === 'completed');
  }, [selectedClient, sessionsForClient]);

  const sessionLines: LineItem[] = completedSessions
    .filter(s => picked[s.id])
    .map(s => ({
      description: `${SESSION_TYPE_LABELS[s.session_type]} — ${new Date(s.scheduled_at).toLocaleDateString('en-GB')}`,
      date: s.scheduled_at.slice(0, 10),
      qty: 1,
      unit_fee: s.fee,
      amount: s.fee,
    }));

  const allLines = [...sessionLines, ...extras];
  const total = allLines.reduce((s, l) => s + l.amount, 0);

  const addExtra = () => {
    const amt = parseFloat(extraAmount);
    if (!extraDesc.trim() || !amt) { showAlert('Incomplete line', 'Add a description and amount.'); return; }
    setExtras(prev => [...prev, { description: extraDesc.trim(), date: null, qty: 1, unit_fee: amt, amount: amt }]);
    setExtraDesc(''); setExtraAmount('');
  };

  const save = async () => {
    if (!user || !selectedClient) { showAlert('Client required', 'Choose a client for this invoice.'); return; }
    if (allLines.length === 0) { showAlert('No items', 'Add at least one line item or session.'); return; }
    setSaving(true);
    const supabase = getSupabaseClient();
    const number = `INV-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase.from('invoices').insert({
      therapist_id: user.id,
      client_id: selectedClient,
      number,
      line_items: allLines,
      subtotal: total,
      total,
      status: 'draft',
      issued_at: new Date().toISOString(),
    }).select().single();
    setSaving(false);
    if (error || !data) { showAlert('Could not save', error?.message || 'Unknown error'); return; }
    router.replace(`/invoice/${data.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="close" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>New invoice</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>CLIENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {clients.map(c => (
            <Pressable key={c.id} style={[styles.chip, selectedClient === c.id && styles.chipActive]} onPress={() => setSelectedClient(c.id)}>
              <Text style={[styles.chipText, selectedClient === c.id && styles.chipTextActive]}>{c.alias || c.client_ref}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedClient ? (
          <>
            <Text style={styles.label}>COMPLETED SESSIONS</Text>
            {completedSessions.length === 0 ? (
              <Text style={styles.emptyText}>No completed sessions to bill. Add custom lines below.</Text>
            ) : completedSessions.map(s => (
              <Pressable key={s.id} style={[styles.lineRow, picked[s.id] && styles.lineRowActive]} onPress={() => setPicked(p => ({ ...p, [s.id]: !p[s.id] }))}>
                <MaterialIcons name={picked[s.id] ? 'check-box' : 'check-box-outline-blank'} size={22} color={picked[s.id] ? Colors.primaryGlow : Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineDesc}>{SESSION_TYPE_LABELS[s.session_type]}</Text>
                  <Text style={styles.lineMeta}>{new Date(s.scheduled_at).toLocaleDateString('en-GB')}</Text>
                </View>
                <Text style={styles.lineAmount}>£{s.fee}</Text>
              </Pressable>
            ))}

            <Text style={styles.label}>CUSTOM LINE (e.g. block package)</Text>
            <View style={styles.extraRow}>
              <TextInput style={[styles.extraInput, { flex: 2 }]} placeholder="Description" placeholderTextColor={Colors.textMuted} value={extraDesc} onChangeText={setExtraDesc} />
              <TextInput style={[styles.extraInput, { flex: 1 }]} placeholder="£" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={extraAmount} onChangeText={setExtraAmount} />
              <Pressable style={styles.addLineBtn} onPress={addExtra}><MaterialIcons name="add" size={22} color={Colors.textInverse} /></Pressable>
            </View>
            {extras.map((l, i) => (
              <View key={i} style={styles.lineRow}>
                <MaterialIcons name="drag-handle" size={20} color={Colors.textMuted} />
                <Text style={[styles.lineDesc, { flex: 1 }]}>{l.description}</Text>
                <Text style={styles.lineAmount}>£{l.amount}</Text>
                <Pressable onPress={() => setExtras(prev => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
            </View>

            <PButton label="Create invoice" onPress={save} loading={saving} />
          </>
        ) : null}
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
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  lineRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  lineDesc: { ...Typography.dataMD, fontSize: 14 },
  lineMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  lineAmount: { ...Typography.dataMD, fontSize: 14 },
  extraRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  extraInput: { backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, height: 46, ...Typography.bodyMD, color: Colors.textPrimary },
  addLineBtn: { width: 46, height: 46, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  totalLabel: { ...Typography.headingMD },
  totalValue: { ...Typography.dataLG },
});
