import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PCard, PBadge } from '@/components';
import { useAuth, getTrialDaysLeft, isTrialActive } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { pickAndUploadImage } from '@/services/uploadService';
import { DISCLAIMERS } from '@/constants/config';

const VERIFY_VARIANT: Record<string, 'active' | 'paid' | 'draft' | 'cancelled'> = {
  verified: 'paid',
  pending: 'active',
  rejected: 'cancelled',
  unverified: 'draft',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const { showAlert } = useAlert();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [practiceName, setPracticeName] = useState(user?.practice_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [sessionFee, setSessionFee] = useState(user?.session_fee ? String(user.session_fee) : '');
  const [accepting, setAccepting] = useState(user?.accepting_clients ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'logo' | null>(null);

  const uploadImage = async (kind: 'avatar' | 'logo') => {
    if (!user) return;
    setUploading(kind);
    const { url, error, cancelled } = await pickAndUploadImage('branding', user.id, kind);
    setUploading(null);
    if (cancelled) return;
    if (error || !url) { showAlert('Upload failed', error || 'Could not upload the image.'); return; }
    const { error: sErr } = await updateProfile(kind === 'avatar' ? { avatar_url: url } : { logo_url: url });
    if (sErr) showAlert('Image uploaded, save failed', sErr);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName || undefined,
      practice_name: practiceName || undefined,
      bio: bio || undefined,
      session_fee: parseFloat(sessionFee) || undefined,
      accepting_clients: accepting,
    });
    setSaving(false);
    if (error) { showAlert('Could not save', error); return; }
    setEditing(false);
  };

  const confirmDelete = () => {
    showAlert('Delete account', 'This permanently deletes your account and all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await deleteAccount();
          if (error) showAlert('Could not delete', error);
          else router.replace('/auth');
        },
      },
    ]);
  };

  const trialDays = getTrialDaysLeft(user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.avatar} onPress={() => uploadImage('avatar')}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{(user?.full_name || 'T').slice(0, 1).toUpperCase()}</Text>
            )}
            <View style={styles.avatarBadge}>
              <MaterialIcons name={uploading === 'avatar' ? 'hourglass-top' : 'photo-camera'} size={12} color={Colors.textInverse} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.full_name || 'Therapist'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)} hitSlop={8}>
              <MaterialIcons name="edit" size={22} color={Colors.primaryGlow} />
            </Pressable>
          ) : null}
        </View>

        {/* Verification badge */}
        <PCard onPress={() => router.push('/verification')} style={styles.verifyCard}>
          <View style={styles.verifyRow}>
            <MaterialIcons
              name={user?.verification_status === 'verified' ? 'verified' : 'shield'}
              size={22}
              color={user?.verification_status === 'verified' ? Colors.success : Colors.primaryGlow}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>Professional verification</Text>
              <Text style={styles.verifyMeta}>
                {user?.professional_body ? `${user.professional_body}${user.membership_number ? ` · ${user.membership_number}` : ''}` : 'Add your professional body & membership'}
              </Text>
            </View>
            <PBadge label={user?.verification_status || 'unverified'} variant={VERIFY_VARIANT[user?.verification_status || 'unverified']} />
          </View>
        </PCard>

        {/* Subscription */}
        <PCard>
          <Text style={styles.cardLabel}>SUBSCRIPTION</Text>
          <Text style={styles.cardValue}>
            {user?.subscription_status === 'active' ? 'Active' : isTrialActive(user) ? `Free trial — ${trialDays} days left` : 'Trial ended'}
          </Text>
          <Text style={styles.cardHint}>Billing via the App Store will be enabled soon (RevenueCat).</Text>
        </PCard>

        {/* Practice branding — appears on invoices */}
        <PCard>
          <Text style={styles.cardLabel}>PRACTICE BRANDING</Text>
          <View style={styles.brandingRow}>
            {user?.logo_url ? (
              <Image source={{ uri: user.logo_url }} style={styles.logoPreview} contentFit="contain" />
            ) : (
              <View style={styles.logoPlaceholder}><Text style={styles.logoPlaceholderText}>PA|TH</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHint}>
                {user?.logo_url ? 'Your logo appears on invoices.' : 'Invoices use PATH branding until you add your own logo.'}
              </Text>
            </View>
          </View>
          <PButton
            label={uploading === 'logo' ? 'Uploading…' : user?.logo_url ? 'Replace logo' : 'Upload practice logo'}
            variant="secondary"
            onPress={() => uploadImage('logo')}
            loading={uploading === 'logo'}
            style={{ marginTop: Spacing.sm }}
          />
        </PCard>

        {editing ? (
          <View style={styles.editSection}>
            <Field label="Full name" value={fullName} onChangeText={setFullName} />
            <Field label="Practice name" value={practiceName} onChangeText={setPracticeName} />
            <Field label="Bio" value={bio} onChangeText={setBio} multiline />
            <Field label="Session fee (£)" value={sessionFee} onChangeText={setSessionFee} keyboardType="decimal-pad" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accepting new clients</Text>
              <Switch value={accepting} onValueChange={setAccepting} trackColor={{ true: Colors.primary, false: Colors.cardAlt }} thumbColor={Colors.textPrimary} />
            </View>
            <View style={styles.editActions}>
              <PButton label="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <PButton label="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <PCard>
            <InfoRow label="Practice" value={user?.practice_name || '—'} />
            <InfoRow label="Location" value={user?.city ? `${user.city}${user.postcode_area ? `, ${user.postcode_area}` : ''}` : '—'} />
            <InfoRow label="Modalities" value={user?.modalities?.length ? user.modalities.join(', ') : '—'} />
            <InfoRow label="Session fee" value={user?.session_fee ? `£${user.session_fee}` : '—'} />
            <InfoRow label="Tax rate" value={`${user?.tax_rate ?? 30}%`} last />
          </PCard>
        )}

        {user?.is_admin ? (
          <Pressable style={styles.linkRow} onPress={() => router.push('/admin-verifications')}>
            <MaterialIcons name="admin-panel-settings" size={20} color={Colors.primaryGlow} />
            <Text style={styles.linkText}>Admin — verification queue</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : null}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{DISCLAIMERS.NOT_CLINICAL_ADVICE}</Text>
        </View>

        <PButton label="Sign out" variant="secondary" onPress={() => { logout(); router.replace('/auth'); }} />
        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, props.multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', borderRadius: Radius.lg },
  avatarText: { ...Typography.dataLG, color: Colors.primaryGlow },
  avatarBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  brandingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  logoPreview: { width: 72, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.cardAlt },
  logoPlaceholder: { width: 72, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderSubtle },
  logoPlaceholderText: { ...Typography.dataMD, fontSize: 13, color: Colors.textSecondary, letterSpacing: 1 },
  name: { ...Typography.brandMD },
  email: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  verifyCard: { padding: 14 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifyTitle: { ...Typography.dataMD, fontSize: 14 },
  verifyMeta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  cardLabel: { ...Typography.labelXS, marginBottom: 6 },
  cardValue: { ...Typography.dataMD },
  cardHint: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 4 },
  editSection: { gap: Spacing.md },
  fieldLabel: { ...Typography.labelXS },
  fieldInput: { backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, ...Typography.bodyMD, color: Colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 54 },
  switchLabel: { ...Typography.bodyMD },
  editActions: { flexDirection: 'row', gap: Spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  infoLabel: { ...Typography.labelMD, color: Colors.textMuted },
  infoValue: { ...Typography.dataMD, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 16 },
  linkText: { ...Typography.dataMD, flex: 1, fontSize: 14 },
  disclaimerBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderSubtle },
  disclaimerText: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 18 },
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  deleteText: { ...Typography.labelMD, color: Colors.error },
});
