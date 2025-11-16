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
  participants?: any[];
  createdById?: string;
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
        console.log('🔍 Raw group data from API:', JSON.stringify(group, null, 2));
        const groupData = {
          id: group?.id || (id as string),
          name: group?.name || name || 'Group',
          avatar: group?.avatar || '',
          isGroup: true,
          description: group?.description || '',
          memberCount: group?.memberCount || group?.members?.length || group?.participants?.length,
          participants: group?.participants || [],
          createdById: group?.createdById || null,
        };
        console.log('✅ Formatted group data:', {
          hasParticipants: !!groupData.participants,
          participantCount: groupData.participants?.length,
          createdById: groupData.createdById,
          isAdmin: groupData.participants?.find((p: any) => p.userId === user?.id)?.isAdmin
        });
        setChatData(groupData);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    }
  }, [id, user, name]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  useFocusEffect(
    useCallback(() => {
      // Always reload on focus to get fresh participants data
      if (user && id) {
        loadChatData();
      }
    }, [loadChatData, user, id])
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
