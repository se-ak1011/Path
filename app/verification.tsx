import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PInput, PBadge } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { pickAndUploadDoc } from '@/services/uploadService';
import { PROFESSIONAL_BODIES } from '@/constants/config';

const VERIFY_VARIANT: Record<string, 'active' | 'paid' | 'draft' | 'cancelled'> = {
  verified: 'paid', pending: 'active', rejected: 'cancelled', unverified: 'draft',
};

export default function VerificationScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { showAlert } = useAlert();

  const [body, setBody] = useState(user?.professional_body || '');
  const [membership, setMembership] = useState(user?.membership_number || '');
  const [insurer, setInsurer] = useState(user?.insurance_provider || '');
  const [dbs, setDbs] = useState(user?.dbs_checked ?? false);
  const [docs, setDocs] = useState<string[]>(user?.verification_docs || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const status = user?.verification_status || 'unverified';
  const isPending = status === 'pending';

  const upload = async () => {
    if (!user) return;
    setUploading(true);
    const { path, error, cancelled } = await pickAndUploadDoc('verification-docs', user.id);
    setUploading(false);
    if (cancelled) return;
    if (error || !path) { showAlert('Upload failed', error || 'Could not upload the document.'); return; }
    setDocs(prev => [...prev, path]);
    showAlert('Uploaded', 'Document added. Submit to send for review.');
  };

  const submit = async () => {
    if (!body.trim() || !membership.trim()) { showAlert('Details required', 'Add your professional body and membership number.'); return; }
    if (docs.length === 0) { showAlert('Document required', 'Upload at least one proof document (membership, insurance or DBS).'); return; }
    setSaving(true);
    const { error } = await updateProfile({
      professional_body: body.trim(),
      membership_number: membership.trim(),
      insurance_provider: insurer.trim() || undefined,
      dbs_checked: dbs,
      verification_docs: docs,
      verification_status: 'pending',
      verification_submitted_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { showAlert('Could not submit', error); return; }
    showAlert('Submitted for review', 'An admin will review your documents. You’ll see a verified badge once approved.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>Verification</Text>
        <PBadge label={status} variant={VERIFY_VARIANT[status]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Verify your professional standing to display a trust badge. Documents upload to a private,
          owner-only store and are reviewed by an admin — the badge is never self-granted.
        </Text>

        {isPending ? (
          <View style={styles.pendingBox}>
            <MaterialIcons name="hourglass-top" size={18} color={Colors.primaryGlow} />
            <Text style={styles.pendingText}>Your submission is under review.</Text>
          </View>
        ) : null}

        <Text style={styles.label}>PROFESSIONAL BODY</Text>
        <View style={styles.chipWrap}>
          {PROFESSIONAL_BODIES.map(b => (
            <Pressable key={b} style={[styles.chip, body === b && styles.chipActive]} onPress={() => setBody(b)}>
              <Text style={[styles.chipText, body === b && styles.chipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </View>

        <PInput label="Membership number" value={membership} onChangeText={setMembership} placeholder="e.g. 00123456" autoCapitalize="characters" />
        <PInput label="Professional indemnity insurer (optional)" value={insurer} onChangeText={setInsurer} placeholder="e.g. Howden / Towergate" />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Enhanced DBS check held</Text>
            <Text style={styles.switchHint}>Confirm you hold a current DBS check.</Text>
          </View>
          <Switch value={dbs} onValueChange={setDbs} trackColor={{ true: Colors.primary, false: Colors.cardAlt }} thumbColor={Colors.textPrimary} />
        </View>

        <Text style={styles.label}>DOCUMENTS ({docs.length})</Text>
        {docs.map((d, i) => (
          <View key={i} style={styles.docRow}>
            <MaterialIcons name="description" size={20} color={Colors.primaryGlow} />
            <Text style={styles.docName} numberOfLines={1}>{d.split('/').pop()}</Text>
            <Pressable onPress={() => setDocs(prev => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        ))}
        <PButton label={uploading ? 'Uploading…' : 'Upload document'} onPress={upload} loading={uploading} variant="secondary" />

        <PButton label="Submit for review" onPress={submit} loading={saving} style={{ marginTop: Spacing.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  intro: { ...Typography.bodySM, color: Colors.textSecondary, lineHeight: 19 },
  pendingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primaryDim, borderColor: Colors.primary, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  pendingText: { ...Typography.labelMD, color: Colors.primaryGlow },
  label: { ...Typography.labelXS, marginTop: Spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.labelSM, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  switchLabel: { ...Typography.bodyMD },
  switchHint: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  docName: { ...Typography.labelMD, color: Colors.textSecondary, flex: 1 },
});
