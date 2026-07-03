import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useClients } from '@/contexts/ClientsContext';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template/ui';
import { getSupabaseClient } from '@/template/core';

interface Message { id: string; sender: 'therapist' | 'client'; body: string; created_at: string; }

export default function MessagesScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { clients } = useClients();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const scrollRef = useRef<ScrollView>(null);

  const client = clients.find(c => c.id === clientId);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const ensureConversation = useCallback(async () => {
    if (!user || !clientId) return;
    const supabase = getSupabaseClient();
    let { data: convo } = await supabase.from('conversations').select('id').eq('therapist_id', user.id).eq('client_id', clientId).maybeSingle();
    if (!convo) {
      // RLS only permits this when the client's status is 'active'.
      const { data: created, error } = await supabase.from('conversations').insert({ therapist_id: user.id, client_id: clientId }).select('id').single();
      if (error) { setLoading(false); showAlert('Messaging unavailable', 'Secure messaging is only available for active clients.'); return; }
      convo = created;
    }
    setConversationId(convo.id);
    const { data: msgs } = await supabase.from('messages').select('id, sender, body, created_at').eq('conversation_id', convo.id).order('created_at', { ascending: true });
    if (msgs) setMessages(msgs as Message[]);
    setLoading(false);
  }, [user, clientId]);

  useEffect(() => { ensureConversation(); }, [ensureConversation]);

  const send = async () => {
    if (!text.trim() || !conversationId || !user) return;
    setSending(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId, therapist_id: user.id, sender: 'therapist', body: text.trim(),
    }).select('id, sender, body, created_at').single();
    setSending(false);
    if (error || !data) { showAlert('Could not send', error?.message || 'Unknown error'); return; }
    setMessages(prev => [...prev, data as Message]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{client?.alias || client?.client_ref || 'Client'}</Text>
          <Text style={styles.subtitle}>Secure · confidential</Text>
        </View>
        <MaterialIcons name="lock" size={20} color={Colors.primaryGlow} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Messages are confidential and owner-only. Keep clinical detail to a minimum here.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primaryGlow} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet.</Text>
            ) : messages.map(m => (
              <View key={m.id} style={[styles.bubble, m.sender === 'therapist' ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={styles.bubbleText}>{m.body}</Text>
                <Text style={styles.bubbleTime}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Message…" placeholderTextColor={Colors.textMuted} value={text} onChangeText={setText} multiline />
          <Pressable style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!text.trim() || sending}>
            <MaterialIcons name="arrow-upward" size={22} color={Colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { ...Typography.headingMD },
  subtitle: { ...Typography.labelSM, color: Colors.textMuted },
  banner: { backgroundColor: Colors.surfaceAlt, padding: 10, paddingHorizontal: Spacing.md },
  bannerText: { ...Typography.labelSM, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
  messages: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  empty: { ...Typography.bodySM, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: Radius.lg },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { ...Typography.bodyMD, color: Colors.textInverse },
  bubbleTime: { ...Typography.labelSM, color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.cardAlt, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, maxHeight: 120, ...Typography.bodyMD, color: Colors.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
