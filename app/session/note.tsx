import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PBadge } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';
import { structureSessionNote } from '@/services/aiService';
import { NOTE_TEMPLATE_FIELDS, NOTE_TEMPLATE_LABELS, DISCLAIMERS } from '@/constants/config';

type Template = 'soap' | 'dap' | 'free';

interface Version { id: string; version: number; template: Template; content: Record<string, string>; status: string; created_at: string; }

export default function SessionNoteScreen() {
  const router = useRouter();
  const { sessionId, clientId } = useLocalSearchParams<{ sessionId?: string; clientId?: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [template, setTemplate] = useState<Template>('soap');
  const [content, setContent] = useState<Record<string, string>>({});
  const [rawText, setRawText] = useState('');
  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [structuring, setStructuring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('session_notes').select('*').eq('session_id', sessionId).maybeSingle();
    if (data) {
      setNoteId(data.id);
      setTemplate(data.template);
      setContent(data.content || {});
      setStatus(data.status);
      setAiGenerated(data.ai_generated ?? false);
      const { data: vs } = await supabase.from('session_note_versions').select('*').eq('note_id', data.id).order('version', { ascending: false });
      if (vs) setVersions(vs as Version[]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: string, value: string) => setContent(prev => ({ ...prev, [key]: value }));

  const runAI = async () => {
    if (!rawText.trim()) { showAlert('Add your notes', 'Type or paste your rough session notes first — AI will structure them.'); return; }
    setStructuring(true);
    const { data, error } = await structureSessionNote({ template, rawText: rawText.trim() });
    setStructuring(false);
    if (error || !data) { showAlert('AI unavailable', error || 'Could not structure the note. You can still write it manually.'); return; }
    setContent(prev => ({ ...prev, ...data.fields }));
    setAiGenerated(true);
    setStatus('draft');
    if (data.risk_flags?.length) {
      showAlert('Review flagged', `The draft surfaced language to review:\n\n${data.risk_flags.join('\n')}`);
    }
  };

  const save = async (markFinal: boolean) => {
    if (!user || !sessionId || !clientId) { showAlert('Missing context', 'This note is not linked to a session.'); return; }
    setSaving(true);
    const supabase = getSupabaseClient();
    const nextStatus = markFinal ? 'final' : 'draft';

    const payload = {
      therapist_id: user.id,
      session_id: sessionId,
      client_id: clientId,
      template,
      content,
      status: nextStatus,
      ai_generated: aiGenerated,
      ai_confirmed: markFinal ? true : false,
      updated_at: new Date().toISOString(),
    };

    let currentNoteId = noteId;
    if (currentNoteId) {
      const { error } = await supabase.from('session_notes').update(payload).eq('id', currentNoteId);
      if (error) { setSaving(false); showAlert('Could not save', error.message); return; }
    } else {
      const { data, error } = await supabase.from('session_notes').insert(payload).select().single();
      if (error || !data) { setSaving(false); showAlert('Could not save', error?.message || 'Unknown error'); return; }
      currentNoteId = data.id;
      setNoteId(data.id);
    }

    // Append a version snapshot (append-only history).
    const nextVersion = (versions[0]?.version ?? 0) + 1;
    await supabase.from('session_note_versions').insert({
      note_id: currentNoteId, therapist_id: user.id, template, content, status: nextStatus, version: nextVersion,
    });

    setStatus(nextStatus);
    setSaving(false);
    await load();
    showAlert(markFinal ? 'Note finalised' : 'Draft saved', markFinal ? 'The note is now part of the clinical record.' : 'Your draft is saved.');
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator color={Colors.primaryGlow} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  const fields = NOTE_TEMPLATE_FIELDS[template];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
          <Text style={styles.title}>Session note</Text>
          <PBadge label={status} variant={status === 'final' ? 'completed' : 'draft'} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Template selector */}
          <View style={styles.templateRow}>
            {(['soap', 'dap', 'free'] as Template[]).map(t => (
              <Pressable key={t} style={[styles.segment, template === t && styles.segmentActive]} onPress={() => setTemplate(t)} disabled={status === 'final'}>
                <Text style={[styles.segmentText, template === t && styles.segmentTextActive]}>{NOTE_TEMPLATE_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>

          {/* AI structuring */}
          {status !== 'final' ? (
            <View style={styles.aiBox}>
              <Text style={styles.aiLabel}>ROUGH NOTES → AI DRAFT</Text>
              <TextInput
                style={styles.rawInput}
                placeholder="Type or paste your rough notes. Keep them pseudonymised — no names or contact details."
                placeholderTextColor={Colors.textMuted}
                value={rawText}
                onChangeText={setRawText}
                multiline
              />
              <PButton label={structuring ? 'Structuring…' : 'Structure with AI'} onPress={runAI} loading={structuring} variant="secondary" />
              <Text style={styles.aiHint}>{DISCLAIMERS.AI_DRAFT}</Text>
            </View>
          ) : null}

          {/* Structured fields */}
          {fields.map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldHint}>{f.hint}</Text>
              <TextInput
                style={styles.fieldInput}
                value={content[f.key] || ''}
                onChangeText={(v) => setField(f.key, v)}
                multiline
                editable={status !== 'final'}
                placeholder={status === 'final' ? '' : `${f.label}…`}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          ))}

          {/* Versions */}
          {versions.length > 0 ? (
            <Pressable style={styles.versionsToggle} onPress={() => setShowVersions(v => !v)}>
              <MaterialIcons name="history" size={18} color={Colors.textSecondary} />
              <Text style={styles.versionsText}>Version history ({versions.length})</Text>
              <MaterialIcons name={showVersions ? 'expand-less' : 'expand-more'} size={20} color={Colors.textMuted} />
            </Pressable>
          ) : null}
          {showVersions ? versions.map(v => (
            <View key={v.id} style={styles.versionRow}>
              <Text style={styles.versionNum}>v{v.version}</Text>
              <Text style={styles.versionMeta}>{v.status} · {new Date(v.created_at).toLocaleString('en-GB')}</Text>
            </View>
          )) : null}

          {status !== 'final' ? (
            <View style={styles.actions}>
              <PButton label="Save draft" variant="secondary" onPress={() => save(false)} loading={saving} style={{ flex: 1 }} />
              <PButton label="Finalise" onPress={() => save(true)} loading={saving} style={{ flex: 1 }} />
            </View>
          ) : (
            <View style={styles.finalNote}>
              <MaterialIcons name="lock" size={16} color={Colors.textMuted} />
              <Text style={styles.finalText}>Finalised notes are part of the record. Editing creates a new version.</Text>
              <PButton label="Reopen for editing" variant="ghost" onPress={() => setStatus('draft')} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  templateRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { ...Typography.btnSM, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  aiBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.primary },
  aiLabel: { ...Typography.labelXS, color: Colors.primaryGlow },
  rawInput: { backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 12, minHeight: 90, ...Typography.bodyMD, color: Colors.textPrimary, textAlignVertical: 'top' },
  aiHint: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 17 },
  field: { gap: 4 },
  fieldLabel: { ...Typography.dataMD, fontSize: 14 },
  fieldHint: { ...Typography.labelSM, color: Colors.textMuted },
  fieldInput: { backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 12, minHeight: 80, ...Typography.bodyMD, color: Colors.textPrimary, textAlignVertical: 'top', marginTop: 4 },
  versionsToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  versionsText: { ...Typography.labelMD, color: Colors.textSecondary, flex: 1 },
  versionRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  versionNum: { ...Typography.dataMD, fontSize: 13, color: Colors.primaryGlow },
  versionMeta: { ...Typography.labelSM, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  finalNote: { gap: Spacing.sm, marginTop: Spacing.sm },
  finalText: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 17 },
});
