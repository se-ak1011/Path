import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { INSTRUMENTS, scoreInstrument, type Instrument } from '@/lib/outcomes';

const SEVERITY_COLOR: Record<string, string> = {
  low: Colors.success,
  mild: Colors.info,
  moderate: Colors.warning,
  high: Colors.error,
};

export default function MeasureScreen() {
  const router = useRouter();
  const { clientId, sessionId } = useLocalSearchParams<{ clientId?: string; sessionId?: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const def = instrument ? INSTRUMENTS[instrument] : null;
  const answered = def ? Object.keys(responses).length : 0;
  const complete = def ? answered === def.items.length : false;
  const orderedResponses = def ? def.items.map((_, i) => responses[i] ?? 0) : [];
  const score = def ? scoreInstrument(def.id, orderedResponses) : 0;
  const band = def ? def.band(score) : null;

  const pick = (idx: number, value: number) => setResponses(prev => ({ ...prev, [idx]: value }));

  const save = async () => {
    if (!user || !clientId || !def) { showAlert('Missing context', 'This measure is not linked to a client.'); return; }
    if (!complete) { showAlert('Incomplete', 'Please answer every item before saving.'); return; }
    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('outcome_measures').insert({
      therapist_id: user.id,
      client_id: clientId,
      session_id: sessionId || null,
      instrument: def.id,
      responses: orderedResponses,
      total_score: score,
      severity: band?.label,
      taken_on: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (error) { showAlert('Could not save', error.message); return; }
    showAlert(
      'Measure saved',
      `${def.name}: ${score}/${def.max} (${band?.label}).\n\nRecorded as guidance to support your clinical judgement — not a diagnosis.`
    );
    router.back();
  };

  if (!def) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="close" size={24} color={Colors.textSecondary} /></Pressable>
          <Text style={styles.title}>Outcome measure</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.pickWrap}>
          {(Object.keys(INSTRUMENTS) as Instrument[]).map(k => (
            <Pressable key={k} style={styles.instrumentCard} onPress={() => setInstrument(k)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.instrumentName}>{INSTRUMENTS[k].name}</Text>
                <Text style={styles.instrumentSub}>{INSTRUMENTS[k].subtitle} · {INSTRUMENTS[k].items.length} items</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
            </Pressable>
          ))}
          <Text style={styles.disclaimer}>
            These are screening aids to support your clinical judgement — a score is never a diagnosis
            on its own. As the practitioner, the assessment is yours to make.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => setInstrument(null)} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>{def.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.prompt}>{def.prompt}</Text>
        {def.note ? <Text style={styles.note}>{def.note}</Text> : null}
        {def.items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <Text style={styles.itemText}>{idx + 1}. {item}</Text>
            <View style={styles.optionsRow}>
              {def.options.map(opt => (
                <Pressable key={opt.value} style={[styles.option, responses[idx] === opt.value && styles.optionActive]} onPress={() => pick(idx, opt.value)}>
                  <Text style={[styles.optionValue, responses[idx] === opt.value && styles.optionValueActive]}>{opt.value}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footerNote}>
        <MaterialIcons name="info-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.footerNoteText}>
          Guidance only. Any diagnosis is your clinical decision as the practitioner — not the result of this test.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}<Text style={styles.scoreMax}>/{def.max}</Text></Text>
          {band ? <Text style={[styles.scoreBand, { color: SEVERITY_COLOR[band.severity] }]}>{band.label}</Text> : null}
        </View>
        <PButton label={complete ? 'Save measure' : `${answered}/${def.items.length} answered`} onPress={save} loading={saving} disabled={!complete} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  pickWrap: { padding: Spacing.md, gap: Spacing.sm },
  instrumentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.lg, padding: 18 },
  instrumentName: { ...Typography.dataLG, fontSize: 18 },
  instrumentSub: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  disclaimer: { ...Typography.labelSM, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xl, gap: Spacing.sm },
  prompt: { ...Typography.bodySM, color: Colors.textSecondary, marginBottom: Spacing.sm },
  note: { ...Typography.labelSM, color: Colors.textMuted, marginBottom: Spacing.sm, lineHeight: 16 },
  itemCard: { backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 12 },
  itemText: { ...Typography.bodyMD, lineHeight: 20 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionValue: { ...Typography.dataMD, color: Colors.textSecondary },
  optionValueActive: { color: Colors.textInverse },
  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  footerNoteText: { ...Typography.labelSM, color: Colors.textMuted, flex: 1, lineHeight: 16 },
  footer: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  scoreBox: { alignItems: 'center', minWidth: 76 },
  scoreLabel: { ...Typography.labelXS },
  scoreValue: { ...Typography.dataLG },
  scoreMax: { ...Typography.labelMD, color: Colors.textMuted },
  scoreBand: { ...Typography.labelSM, fontWeight: '600' },
});
