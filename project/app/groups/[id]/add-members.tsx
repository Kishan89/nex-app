import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

interface UserItem {
  id: string;
  username: string;
  avatar?: string;
}

const AddMembersScreen = () => {
  const params = useLocalSearchParams();
  const { id, name } = params as { id?: string; name?: string };
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  const groupId = id as string | undefined;

  const loadUsers = useCallback(async () => {
    if (!groupId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [messagable, chatResp] = await Promise.all([
        apiService.getMessagableUsers(),
        apiService.getChatById(groupId).catch(() => null),
      ]);

      const messagableUsers: UserItem[] = Array.isArray(messagable)
        ? messagable
        : ((messagable as any)?.data || (messagable as any)?.users || []);

      const chat = chatResp ? ((chatResp as any)?.data || chatResp) : null;
      const existingIds = new Set<string>();
      if (chat && Array.isArray(chat.participants)) {
        chat.participants.forEach((p: any) => {
          if (p.user?.id) existingIds.add(p.user.id);
          if (p.userId) existingIds.add(p.userId);
        });
      }

      const filtered = messagableUsers.filter((u) => !existingIds.has(u.id));
      setUsers(filtered);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/groups');
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!groupId) return;
    if (addingId) return;

    try {
      setAddingId(userId);
      await apiService.addGroupMember(groupId, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      const message = error?.message || 'Failed to add member. You may not have permission.';
      Alert.alert('Error', message);
    } finally {
      setAddingId(null);
    }
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isAdding = addingId === item.id;
    return (
      <View style={styles.userItem}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.primary }]}
          onPress={() => handleAddUser(item.id)}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <UserPlus size={16} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{name || 'Add Members'}</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users available to add</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AddMembersScreen;

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundTertiary,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  list: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    color: colors.text,
  },
  addButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: colors.textMuted,
  },
});
