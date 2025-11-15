import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import ChatScreen from '@/components/chat/ChatScreen';
import { apiService } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ChatSkeleton } from '@/components/skeletons';

interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  username?: string;
  isGroup?: boolean;
  description?: string;
  memberCount?: number;
}

const GroupChatScreen = () => {
  const params = useLocalSearchParams();
  const { id, name } = params as { id?: string; name?: string };
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChatData = useCallback(async () => {
    if (!user || !id) return;

    const optimisticData = {
      id: id as string,
      name: name || 'Group',
      avatar: '',
      isGroup: true,
      userId: undefined,
    };
    setChatData(optimisticData);

    try {
      const resp = await apiService.getChatById(id as string);
      const group = (resp as any)?.data || resp;
      
      if (group) {
        const groupData = {
          id: group?.id || (id as string),
          name: group?.name || name || 'Group',
          avatar: group?.avatar || '',
          isGroup: true,
          description: group?.description || '',
          memberCount: group?.memberCount || group?.members?.length || group?.participants?.length,
        };
        console.log('Group data loaded with avatar:', groupData.avatar);
        setChatData(groupData);
      }
    } catch (error) {
      // Keep optimistic data on error
    }
  }, [id, user, name]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  useFocusEffect(
    useCallback(() => {
      loadChatData();
    }, [loadChatData])
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/groups');
    }
  };

  // Don't show skeleton, pass optimistic data immediately
  const optimisticChatData = chatData || {
    id: id as string,
    name: name || 'Group',
    avatar: '',
    isGroup: true,
  };

  return (
    <View style={styles.container}>
      <ChatScreen
        chatData={optimisticChatData}
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
  },
});
