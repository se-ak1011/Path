import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PCard, StatCard } from '@/components';
import { useTaxPot, deductibleAmount } from '@/contexts/TaxPotContext';
import { useAlert } from '@/template/ui';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, DISCLAIMERS, MILEAGE_RATE_GBP } from '@/constants/config';

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function TaxPotScreen() {
  const router = useRouter();
  const { summary, allIncome, expenses, taxRate, loading, refresh, addManualIncome, addExpense } = useTaxPot();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'income' | 'expenses'>('income');
  const [incomeModal, setIncomeModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  // income form
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');

  // expense form
  const [expAmount, setExpAmount] = useState('');
  const [expCat, setExpCat] = useState<string>('clinical_supervision');
  const [expVendor, setExpVendor] = useState('');
  const [miles, setMiles] = useState('');

  const submitIncome = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { showAlert('Amount required', 'Enter a valid amount.'); return; }
    await addManualIncome({ amount: val, date: new Date().toISOString().slice(0, 10), source_label: label, tax_rate: taxRate });
    setAmount(''); setLabel(''); setIncomeModal(false);
  };

  const submitExpense = async () => {
    const isMileage = expCat === 'mileage';
    const val = isMileage ? 0 : parseFloat(expAmount);
    const mi = isMileage ? parseFloat(miles) : null;
    if (isMileage ? (!mi || mi <= 0) : (!val || val <= 0)) {
      showAlert('Amount required', isMileage ? 'Enter the miles driven.' : 'Enter a valid amount.');
      return;
    }
    const { error } = await addExpense({ amount: val || 0, category: expCat, vendor: expVendor || undefined, mileage_miles: mi });
    if (error) { showAlert('Could not save', error); return; }
    setExpAmount(''); setExpVendor(''); setMiles(''); setExpenseModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primaryGlow} />}
      >
        <Text style={styles.title}>Tax Pot</Text>

        <PCard variant="highlight" style={styles.potCard}>
          <Text style={styles.potLabel}>SET ASIDE FOR TAX</Text>
          <Text style={styles.potValue}>{gbp(summary.totalSetAside)}</Text>
          <Text style={styles.potSub}>Self-Assessment estimate at {taxRate}% · UK sole trader</Text>
        </PCard>

        <View style={styles.statsRow}>
          <StatCard label="Earnings" value={gbp(summary.totalEarnings)} color={Colors.income} />
          <StatCard label="Expenses" value={gbp(summary.totalExpenses)} color={Colors.expense} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Net profit" value={gbp(summary.netProfit)} />
          <StatCard label="Est. yearly tax" value={gbp(summary.estimatedTax)} sub="projected" />
        </View>

        <View style={styles.retentionNote}>
          <MaterialIcons name="info-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.retentionText}>{DISCLAIMERS.RETENTION}</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'income' && styles.tabActive]} onPress={() => setTab('income')}>
            <Text style={[styles.tabText, tab === 'income' && styles.tabTextActive]}>Income</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'expenses' && styles.tabActive]} onPress={() => setTab('expenses')}>
            <Text style={[styles.tabText, tab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
          </Pressable>
        </View>

        {tab === 'income' ? (
          <>
            <PButton label="Add income" onPress={() => setIncomeModal(true)} variant="secondary" />
            {allIncome.length === 0 ? (
              <Text style={styles.emptyText}>No income recorded. Paid invoices appear here automatically.</Text>
            ) : allIncome.map(i => (
              <View key={i.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {i.source === 'invoice' ? 'Invoice payment' : (('source_label' in i && i.source_label) || 'Manual income')}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {new Date('date_paid' in i ? i.date_paid : i.date).toLocaleDateString('en-GB')} · set aside {gbp(i.tax_set_aside)}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: Colors.income }]}>{gbp(i.amount)}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <PButton label="Add expense" onPress={() => setExpenseModal(true)} variant="secondary" />
            {expenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses recorded. Track deductibles to lower your tax.</Text>
            ) : expenses.map(e => (
              <View key={e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{EXPENSE_CATEGORY_LABELS[e.category] || e.category}</Text>
                  <Text style={styles.rowMeta}>
                    {e.vendor ? `${e.vendor} · ` : ''}{e.spent_on ? new Date(e.spent_on).toLocaleDateString('en-GB') : ''}
                    {e.category === 'mileage' && e.mileage_miles ? ` · ${e.mileage_miles} mi @ ${MILEAGE_RATE_GBP * 100}p` : ''}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: Colors.expense }]}>{gbp(deductibleAmount(e))}</Text>
              </View>
            ))}
          </>
        )}

        <Pressable style={styles.linkRow} onPress={() => router.push('/supervision')}>
          <MaterialIcons name="supervisor-account" size={20} color={Colors.primaryGlow} />
          <Text style={styles.linkText}>Supervision log</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </Pressable>
      </ScrollView>

      {/* Income modal */}
      <Modal visible={incomeModal} transparent animationType="slide" onRequestClose={() => setIncomeModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add income</Text>
            <TextInput style={styles.modalInput} placeholder="Amount (£)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.modalInput} placeholder="Source (optional)" placeholderTextColor={Colors.textMuted} value={label} onChangeText={setLabel} />
            <View style={styles.modalRow}>
              <PButton label="Cancel" variant="ghost" onPress={() => setIncomeModal(false)} style={{ flex: 1 }} />
              <PButton label="Save" onPress={submitIncome} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expense modal */}
      <Modal visible={expenseModal} transparent animationType="slide" onRequestClose={() => setExpenseModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add expense</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {EXPENSE_CATEGORIES.map(c => (
                <Pressable key={c} style={[styles.catChip, expCat === c && styles.catChipActive]} onPress={() => setExpCat(c)}>
                  <Text style={[styles.catText, expCat === c && styles.catTextActive]}>{EXPENSE_CATEGORY_LABELS[c]}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {expCat === 'mileage' ? (
              <TextInput style={styles.modalInput} placeholder="Miles driven" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={miles} onChangeText={setMiles} />
            ) : (
              <TextInput style={styles.modalInput} placeholder="Amount (£)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={expAmount} onChangeText={setExpAmount} />
            )}
            <TextInput style={styles.modalInput} placeholder="Vendor / note (optional)" placeholderTextColor={Colors.textMuted} value={expVendor} onChangeText={setExpVendor} />
            <View style={styles.modalRow}>
              <PButton label="Cancel" variant="ghost" onPress={() => setExpenseModal(false)} style={{ flex: 1 }} />
              <PButton label="Save" onPress={submitExpense} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  title: { ...Typography.brandLG },
  potCard: { alignItems: 'center', gap: 4, paddingVertical: Spacing.lg },
  potLabel: { ...Typography.labelXS, color: Colors.primaryGlow },
  potValue: { ...Typography.dataXL, color: Colors.textPrimary },
  potSub: { ...Typography.labelSM, color: Colors.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  retentionNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  retentionText: { ...Typography.labelSM, color: Colors.textMuted, flex: 1, lineHeight: 17 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.cardAlt, borderRadius: Radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.btnSM, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  emptyText: { ...Typography.bodySM, color: Colors.textMuted, paddingVertical: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  rowTitle: { ...Typography.dataMD, fontSize: 14 },
  rowMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  rowAmount: { ...Typography.dataMD },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 16, marginTop: Spacing.sm },
  linkText: { ...Typography.dataMD, flex: 1, fontSize: 14 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1, borderColor: Colors.border },
  modalTitle: { ...Typography.brandSM, marginBottom: 4 },
  modalInput: { backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, ...Typography.bodyMD, color: Colors.textPrimary },
  modalRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  catChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { ...Typography.labelSM, color: Colors.textSecondary },
  catTextActive: { color: Colors.textInverse, fontWeight: '600' },
});
