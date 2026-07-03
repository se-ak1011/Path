import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PButton, PInput } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { MODALITIES, SPECIALISMS, SUBSCRIPTION, DISCLAIMERS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { MaterialIcons } from '@expo/vector-icons';

// Steps: 0=Welcome 1=Profile 2=Modalities 3=Fees 4=Trial
const STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, completeOnboarding, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [practiceName, setPracticeName] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [modalities, setModalities] = useState<string[]>([]);
  const [specialisms, setSpecialisms] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<string[]>(['in_person']);
  const [sessionFee, setSessionFee] = useState('');

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) =>
    setArr(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);

  const handleFinish = async () => {
    const { error } = await completeOnboarding({
      full_name: fullName || undefined,
      practice_name: practiceName || undefined,
      city: city || undefined,
      postcode_area: postcode || undefined,
      modalities,
      specialisms,
      delivery,
      session_fee: parseFloat(sessionFee) || undefined,
      onboarding_complete: true,
    });
    if (error) {
      showAlert('Setup failed', `We could not save your profile: ${error}`);
      return;
    }
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <View style={styles.stepContent}>
          <Image source={require('@/assets/images/logo.png')} style={styles.heroLogo} contentFit="contain" transition={300} />
          <View style={styles.stepText}>
            <Text style={styles.brandTitle}>Welcome to PATH.</Text>
            <Text style={styles.stepSubtitle}>
              The quiet back office for your private practice. Let’s set you up in a couple of minutes.
            </Text>
          </View>
          <View style={styles.principleCard}>
            <MaterialIcons name="lock" size={16} color={Colors.primaryGlow} />
            <Text style={styles.principleText}>{DISCLAIMERS.SPECIAL_CATEGORY}</Text>
          </View>
          <View style={styles.featureList}>
            {[
              'Pseudonymised, owner-only caseload',
              'Sessions, notes & outcome measures',
              'AI-assisted notes you always confirm',
              'Invoicing, Tax Pot & supervision log',
            ].map(f => (
              <View key={f} style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Your profile</Text>
          <Text style={styles.stepSubtitle}>How you present professionally.</Text>
          <PInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <PInput label="Practice name (optional)" value={practiceName} onChangeText={setPracticeName} placeholder="e.g. Willow Therapy" />
          <PInput label="Town / City" value={city} onChangeText={setCity} placeholder="Bristol" />
          <PInput label="Postcode area" value={postcode} onChangeText={setPostcode} placeholder="BS1" autoCapitalize="characters" />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Your practice</Text>
          <Text style={styles.stepSubtitle}>Modalities you work in.</Text>
          <View style={styles.chipGrid}>
            {MODALITIES.map(m => (
              <Pressable key={m} style={[styles.chip, modalities.includes(m) && styles.chipActive]} onPress={() => toggle(modalities, setModalities, m)}>
                <Text style={[styles.chipText, modalities.includes(m) && styles.chipTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.stepSubtitle, { marginTop: 8 }]}>Specialisms.</Text>
          <View style={styles.chipGrid}>
            {SPECIALISMS.map(s => (
              <Pressable key={s} style={[styles.chip, specialisms.includes(s) && styles.chipActive]} onPress={() => toggle(specialisms, setSpecialisms, s)}>
                <Text style={[styles.chipText, specialisms.includes(s) && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Sessions & fees</Text>
          <Text style={styles.stepSubtitle}>How you deliver, and your standard fee.</Text>
          <View style={styles.chipGrid}>
            {[{ id: 'in_person', label: 'In person' }, { id: 'online', label: 'Online' }].map(d => (
              <Pressable key={d.id} style={[styles.chip, delivery.includes(d.id) && styles.chipActive]} onPress={() => toggle(delivery, setDelivery, d.id)}>
                <Text style={[styles.chipText, delivery.includes(d.id) && styles.chipTextActive]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <PInput label="Standard session fee (£)" value={sessionFee} onChangeText={setSessionFee} keyboardType="decimal-pad" placeholder="e.g. 60" />
        </View>
      );
    }

    if (step === 4) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Start your free trial</Text>
          <Text style={styles.stepSubtitle}>
            Every PATH tool free for {SUBSCRIPTION.TRIAL_DAYS} days. No charge today.
          </Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceBig}>£{SUBSCRIPTION.MONTHLY_FEE_GBP}</Text>
              <Text style={styles.pricePer}>/month</Text>
            </View>
            <Text style={styles.priceAfter}>after your {SUBSCRIPTION.TRIAL_DAYS}-day free trial</Text>
          </View>
          <View style={styles.featureList}>
            {SUBSCRIPTION.THERAPIST_TOOLS.map(f => (
              <View key={f} style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.finePrint}>{DISCLAIMERS.NOT_CLINICAL_ADVICE}</Text>
        </View>
      );
    }
    return null;
  };

  const isLastStep = step === STEPS - 1;
  const canProgress = step === 1 ? !!fullName.trim() : true;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.progress}>
        {Array.from({ length: STEPS }, (_, i) => i).map((i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive, i === step && styles.progressDotCurrent]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
        <PButton
          label={isLastStep ? 'Start free trial' : 'Continue'}
          onPress={isLastStep ? handleFinish : () => setStep(s => s + 1)}
          disabled={!canProgress || operationLoading}
          loading={operationLoading && isLastStep}
          style={styles.nextBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.primaryDim },
  progressDotCurrent: { width: 24, backgroundColor: Colors.primary },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  stepContent: { gap: 20 },
  heroLogo: { width: '100%', height: 160, borderRadius: Radius.lg },
  brandTitle: { ...Typography.brandLG },
  stepTitle: { ...Typography.brandMD },
  stepSubtitle: { ...Typography.bodyMD, color: Colors.textSecondary },
  stepText: { gap: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill,
    backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.labelMD, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse, fontWeight: '600' },
  principleCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary, padding: 14,
  },
  principleText: { ...Typography.labelMD, color: Colors.primaryGlow, flex: 1, lineHeight: 20 },
  featureList: { gap: 14 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { ...Typography.bodyMD },
  priceCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 20,
    borderWidth: 1, borderColor: Colors.primary, gap: 10,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  priceBig: { ...Typography.brandLG, color: Colors.textPrimary },
  pricePer: { ...Typography.bodyMD, color: Colors.textSecondary, marginBottom: 6 },
  priceAfter: { ...Typography.labelMD, color: Colors.textSecondary },
  finePrint: { ...Typography.labelSM, color: Colors.textMuted, lineHeight: 18 },
  footer: {
    flexDirection: 'row', gap: 12, padding: Spacing.md,
    paddingBottom: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  backBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: { flex: 1 },
});
