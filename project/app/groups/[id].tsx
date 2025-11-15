import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatScreen from '@/components/chat/ChatScreen';
import { apiService } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  username?: string;
  isGroup?: boolean;
}

const GroupChatScreen = () => {
  const params = useLocalSearchParams();
  const { id, name } = params as { id?: string; name?: string };
  const router = useRouter();
  const { user } = useAuth();
  const [chatData, setChatData] = useState<ChatData | null>(null);

  useEffect(() => {
    loadChatData();
  }, [id, user?.id]);

  const loadChatData = async () => {
    if (!user || !id) return;

    // Optimistic chat data
    setChatData({
      id: id as string,
      name: name || 'Group',
      avatar: '',
      isGroup: true,
    });

    try {
      const resp = await apiService.getChatById(id as string);
      const chat = (resp as any)?.data || resp;
      if (chat) {
        setChatData({
          id: chat.id || (id as string),
          name: chat.name || name || 'Group',
          avatar: '',
          isGroup: true,
        });
      }
    } catch (error) {
      // Keep optimistic data; ChatScreen will still function since messages use chatId
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/groups');
    }
  };

  if (!chatData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading group chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatScreen
        chatData={chatData}
        onBack={handleBack}
        isNewChat={false}
        forceInitialRefresh={false}
      />
    </View>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
