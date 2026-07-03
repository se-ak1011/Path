import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PButton, PInput } from '@/components';
import { useClients } from '@/contexts/ClientsContext';
import { useAlert } from '@/template/ui';
import { DISCLAIMERS } from '@/constants/config';

export default function NewClientScreen() {
  const router = useRouter();
  const { addClient, saveContact } = useClients();
  const { showAlert } = useAlert();

  const [clientRef, setClientRef] = useState('');
  const [alias, setAlias] = useState('');
  const [presenting, setPresenting] = useState('');
  const [riskFlag, setRiskFlag] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!clientRef.trim()) { showAlert('Reference required', 'Enter a client reference (a pseudonym such as initials or C-001).'); return; }
    setSaving(true);
    const { data, error } = await addClient({
      client_ref: clientRef.trim(),
      alias: alias.trim() || null,
      presenting_issue: presenting.trim() || null,
      risk_flag: riskFlag,
      status: 'active',
    });
    if (error || !data) { setSaving(false); showAlert('Could not save', error || 'Unknown error'); return; }

    if (addContact && (fullName || phone || email)) {
      const { error: cErr } = await saveContact(data.id, {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      if (cErr) { setSaving(false); showAlert('Client saved, contact failed', cErr); router.replace(`/client/${data.id}`); return; }
    }
    setSaving(false);
    router.replace(`/client/${data.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="close" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>New client</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          <MaterialIcons name="privacy-tip" size={16} color={Colors.primaryGlow} />
          <Text style={styles.noticeText}>{DISCLAIMERS.SPECIAL_CATEGORY}</Text>
        </View>

        <PInput label="Client reference *" value={clientRef} onChangeText={setClientRef} placeholder="e.g. C-001 or initials" autoCapitalize="characters" />
        <PInput label="Display label (optional)" value={alias} onChangeText={setAlias} placeholder="A label only you understand" />
        <PInput label="Presenting issue (optional)" value={presenting} onChangeText={setPresenting} placeholder="e.g. Generalised anxiety" />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Safeguarding flag</Text>
            <Text style={styles.switchHint}>Mark if there are risk considerations to review.</Text>
          </View>
          <Switch value={riskFlag} onValueChange={setRiskFlag} trackColor={{ true: Colors.warning, false: Colors.cardAlt }} thumbColor={Colors.textPrimary} />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Add contact details</Text>
            <Text style={styles.switchHint}>Stored separately from clinical notes, owner-only.</Text>
          </View>
          <Switch value={addContact} onValueChange={setAddContact} trackColor={{ true: Colors.primary, false: Colors.cardAlt }} thumbColor={Colors.textPrimary} />
        </View>

        {addContact ? (
          <View style={styles.contactSection}>
            <PInput label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <PInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <PInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
        ) : null}

        <PButton label="Save client" onPress={save} loading={saving} style={{ marginTop: Spacing.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  noticeCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.primaryDim, borderColor: Colors.primary, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  noticeText: { ...Typography.labelSM, color: Colors.primaryGlow, flex: 1, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  switchLabel: { ...Typography.bodyMD },
  switchHint: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  contactSection: { gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderSubtle },
});
