import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PBadge } from '@/components';
import { getResource, CATEGORY_LABELS, TYPE_LABELS, TYPE_ICON } from '@/lib/resources';

export default function ResourceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = id ? getResource(id) : undefined;

  if (!resource) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable></View>
        <Text style={styles.empty}>Resource not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.icon}><MaterialIcons name={TYPE_ICON[resource.type] as any} size={22} color={Colors.primaryGlow} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{resource.title}</Text>
            <Text style={styles.meta}>{resource.meta}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <PBadge label={TYPE_LABELS[resource.type]} variant="active" />
          <PBadge label={CATEGORY_LABELS[resource.category]} variant="completed" />
        </View>

        <Text style={styles.summary}>{resource.summary}</Text>

        {resource.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            {s.body.map((b, j) => (
              <View key={j} style={styles.bullet}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Adapt to the individual client and your clinical judgement. Where physical dependence or medical
            risk is possible (e.g. alcohol withdrawal), coordinate with medical care.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  scroll: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: Radius.lg, backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.brandMD },
  meta: { ...Typography.labelSM, color: Colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8 },
  summary: { ...Typography.bodyMD, color: Colors.textSecondary, lineHeight: 22 },
  section: { gap: 8, backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.lg, padding: 16 },
  sectionHeading: { ...Typography.headingMD, fontSize: 16 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primaryGlow, marginTop: 8 },
  bulletText: { ...Typography.bodyMD, color: Colors.textPrimary, flex: 1, lineHeight: 21 },
  disclaimer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderSubtle },
  disclaimerText: { ...Typography.labelSM, color: Colors.textMuted, flex: 1, lineHeight: 16 },
  empty: { ...Typography.bodySM, color: Colors.textMuted, padding: Spacing.md },
});
