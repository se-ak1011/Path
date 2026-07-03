import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { PButton, PBadge, PCard } from '@/components';
import { useClients } from '@/contexts/ClientsContext';
import { useTaxPot } from '@/contexts/TaxPotContext';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { INVOICE_STATUS_LABELS } from '@/constants/config';

interface Invoice {
  id: string; number: string; client_id: string; status: 'draft' | 'sent' | 'paid';
  line_items: { description: string; amount: number }[]; total: number;
  issued_at: string | null; paid_at: string | null;
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients } = useClients();
  const { refresh: refreshTaxPot } = useTaxPot();
  const { showAlert } = useAlert();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
    if (data) setInvoice(data as Invoice);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const client = invoice ? clients.find(c => c.id === invoice.client_id) : undefined;

  const setStatus = async (status: 'draft' | 'sent' | 'paid') => {
    if (!invoice) return;
    setBusy(true);
    const supabase = getSupabaseClient();
    const patch: any = { status };
    if (status === 'paid') patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(patch).eq('id', invoice.id);
    setBusy(false);
    if (error) { showAlert('Could not update', error.message); return; }
    setInvoice({ ...invoice, ...patch });
    if (status === 'paid') { refreshTaxPot(); showAlert('Marked paid', 'This payment now feeds your Tax Pot.'); }
  };

  const emailInvoice = async () => {
    if (!invoice) return;
    const available = await MailComposer.isAvailableAsync();
    const body = [
      `Invoice ${invoice.number}`,
      '',
      ...invoice.line_items.map(l => `• ${l.description} — £${l.amount.toFixed(2)}`),
      '',
      `Total: £${invoice.total.toFixed(2)}`,
    ].join('\n');
    if (!available) { showAlert('Invoice', body); return; }
    await MailComposer.composeAsync({ subject: `Invoice ${invoice.number}`, body });
  };

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator color={Colors.primaryGlow} style={{ marginTop: 60 }} /></SafeAreaView>;
  if (!invoice) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable></View><Text style={styles.empty}>Invoice not found.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <PBadge label={INVOICE_STATUS_LABELS[invoice.status]} variant={invoice.status === 'paid' ? 'paid' : invoice.status === 'sent' ? 'active' : 'draft'} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.number}>{invoice.number}</Text>
        <Text style={styles.client}>{client?.alias || client?.client_ref || 'Client'}</Text>

        <PCard>
          {invoice.line_items.map((l, i) => (
            <View key={i} style={[styles.lineRow, i < invoice.line_items.length - 1 && styles.lineBorder]}>
              <Text style={styles.lineDesc}>{l.description}</Text>
              <Text style={styles.lineAmount}>£{l.amount.toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>£{invoice.total.toFixed(2)}</Text>
          </View>
        </PCard>

        <View style={styles.actions}>
          <PButton label="Email invoice" variant="secondary" onPress={emailInvoice} />
          {invoice.status === 'draft' ? <PButton label="Mark as sent" onPress={() => setStatus('sent')} loading={busy} /> : null}
          {invoice.status !== 'paid' ? <PButton label="Mark as paid" onPress={() => setStatus('paid')} loading={busy} /> : (
            <Text style={styles.paidNote}>Paid {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-GB') : ''} · feeding Tax Pot.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  number: { ...Typography.brandMD },
  client: { ...Typography.bodyMD, color: Colors.textSecondary },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  lineBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  lineDesc: { ...Typography.bodyMD, flex: 1 },
  lineAmount: { ...Typography.dataMD, fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { ...Typography.headingMD },
  totalValue: { ...Typography.dataLG },
  actions: { gap: Spacing.sm },
  paidNote: { ...Typography.labelMD, color: Colors.success, textAlign: 'center' },
  empty: { ...Typography.bodySM, color: Colors.textMuted, padding: Spacing.md },
});
