import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { MaterialIcons } from '@expo/vector-icons';

type Screen = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const { login, signup, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Required', 'Please enter your email and password.');
      return;
    }
    const { error } = await login(email.trim(), password);
    if (error) { showAlert('Sign in failed', error); return; }
    router.replace('/(tabs)');
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      showAlert('Required', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      showAlert('Weak password', 'Please use at least 6 characters.');
      return;
    }
    const { error } = await signup(email.trim(), password, name.trim());
    if (error) { showAlert('Sign up failed', error); return; }
    router.replace('/onboarding');
  };

  if (screen === 'signup') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.backRow} onPress={() => setScreen('login')}>
              <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Text style={styles.heading}>Create your practice.</Text>
            <Text style={styles.subheading}>PATH — private practice administration for therapists.</Text>

            <View style={styles.fields}>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.field, styles.passField]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass(p => !p)} hitSlop={8}>
                  <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.primaryBtn, operationLoading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={operationLoading}
            >
              <Text style={styles.primaryBtnText}>
                {operationLoading ? 'Creating account…' : 'Create account'}
              </Text>
            </Pressable>

            <Text style={styles.legalText}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
              PATH is practice-admin software, not a clinical or medical service.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.heading}>Welcome back.</Text>
          <Text style={styles.subheading}>Sign in to your PATH account.</Text>

          <View style={styles.fields}>
            <View style={styles.field}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.field, styles.passField]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(p => !p)} hitSlop={8}>
                <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, operationLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={operationLoading}
          >
            <Text style={styles.primaryBtnText}>
              {operationLoading ? 'Signing in…' : 'Sign in'}
            </Text>
          </Pressable>

          <Pressable style={styles.signupLink} onPress={() => setScreen('signup')}>
            <Text style={styles.signupLinkText}>No account? <Text style={styles.signupLinkHighlight}>Create one</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: 60, paddingBottom: Spacing.xxl, gap: 20 },
  logo: { width: 84, height: 84, borderRadius: 18, alignSelf: 'flex-start' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backText: { ...Typography.labelMD, color: Colors.textSecondary },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    lineHeight: 40,
  },
  subheading: { ...Typography.bodyMD, color: Colors.textSecondary },
  fields: { gap: 12 },
  field: {
    height: 58,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  passField: { flexDirection: 'row', alignItems: 'center' },
  input: { ...Typography.bodyMD, color: Colors.textPrimary, flex: 1 },
  primaryBtn: {
    height: 58,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { ...Typography.btnMD, color: Colors.textInverse, fontSize: 16 },
  signupLink: { alignItems: 'center', paddingVertical: 4 },
  signupLinkText: { ...Typography.bodyMD, color: Colors.textMuted },
  signupLinkHighlight: { color: Colors.primaryGlow, fontWeight: '600' },
  legalText: { ...Typography.labelSM, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
