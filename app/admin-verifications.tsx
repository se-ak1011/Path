import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { PButton, PCard } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { listPendingVerifications, approveVerification, rejectVerification, type PendingVerification } from '@/services/adminService';

export default function AdminVerificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [items, setItems] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listPendingVerifications();
    setLoading(false);
    if (error) { showAlert('Could not load', error); return; }
    setItems(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    const { error } = approve ? await approveVerification(id) : await rejectVerification(id);
    setBusyId(null);
    if (error) { showAlert('Action failed', error); return; }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (!user?.is_admin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable></View>
        <Text style={styles.empty}>Admin access required.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <Text style={styles.title}>Verification queue</Text>
        <Pressable onPress={load} hitSlop={8}><MaterialIcons name="refresh" size={22} color={Colors.textSecondary} /></Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primaryGlow} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Text style={styles.empty}>No pending verifications.</Text>
          ) : items.map(v => (
            <PCard key={v.id} style={styles.card}>
              <Text style={styles.name}>{v.full_name || 'Therapist'}</Text>
              <Text style={styles.meta}>{v.professional_body} · {v.membership_number}</Text>
              {v.insurance_provider ? <Text style={styles.meta}>Insurer: {v.insurance_provider}</Text> : null}
              <Text style={styles.meta}>DBS: {v.dbs_checked ? 'Yes' : 'Not stated'}</Text>

              {v.doc_urls.map((url, i) => (
                <Pressable key={i} style={styles.docLink} onPress={() => Linking.openURL(url)}>
                  <MaterialIcons name="open-in-new" size={16} color={Colors.primaryGlow} />
                  <Text style={styles.docText}>View document {i + 1}</Text>
                </Pressable>
              ))}

              <View style={styles.actions}>
                <PButton label="Reject" variant="ghost" onPress={() => decide(v.id, false)} loading={busyId === v.id} style={{ flex: 1 }} />
                <PButton label="Approve" onPress={() => decide(v.id, true)} loading={busyId === v.id} style={{ flex: 1 }} />
              </View>
            </PCard>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.headingMD },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  empty: { ...Typography.bodySM, color: Colors.textMuted, padding: Spacing.md },
  card: { gap: 4, padding: 16 },
  name: { ...Typography.dataLG, fontSize: 17 },
  meta: { ...Typography.labelSM, color: Colors.textMuted },
  docLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  docText: { ...Typography.labelMD, color: Colors.primaryGlow },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
