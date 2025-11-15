import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Image } from 'react-native';
import { ArrowLeft, Plus, Users } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
import { GroupListSkeleton } from '@/components/skeletons';

interface GroupItem {
  id: string | number;
  name: string;
  description?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  memberCount?: number;
  avatar?: string;
}

const GroupListScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      if (!refreshing) setLoading(true);
      const resp = await apiService.getUserGroups();
      const items: GroupItem[] = Array.isArray(resp)
        ? resp
        : ((resp as any)?.data || (resp as any)?.groups || []);
      setGroups(items || []);
    } catch (e) {
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, [loadGroups]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/chats');
    }
  };

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  const handleGroupPress = (group: GroupItem) => {
    router.push({
      pathname: `/groups/${group.id}`,
      params: {
        name: group.name || 'Group',
      },
    });
  };

  const renderGroupItem = ({ item }: { item: GroupItem }) => {
    const hasUnread = (item.unread || 0) > 0;
    return (
      <TouchableOpacity
        style={[styles.groupItem, hasUnread && styles.unreadGroupItem]}
        onPress={() => handleGroupPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {(item.avatar && item.avatar.trim() !== '') ? (
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + (colors.background === '#ffffff' ? '15' : '20') }]}>
              <Users size={24} color={colors.primary} />
            </View>
          )}
          {hasUnread && <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />}
        </View>
        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, hasUnread && styles.unreadGroupName]} numberOfLines={1}>
              {item.name || 'Group'}
            </Text>
            {item.time && (
              <Text style={[styles.groupTime, hasUnread && styles.unreadTime]}>
                {item.time}
              </Text>
            )}
          </View>
          <Text style={[styles.groupDescription, hasUnread && styles.unreadDescription]} numberOfLines={2}>
            {item.description || item.lastMessage || 'No messages yet'}
          </Text>
          <View style={styles.groupFooter}>
            <View style={styles.memberInfo}>
              <Users size={12} color={colors.textMuted} />
              <Text style={styles.memberCountText}>
                {item.memberCount != null ? `${item.memberCount} members` : '0 members'}
              </Text>
            </View>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup} activeOpacity={0.8}>
          <Plus size={20} color="#3B8FE8" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <GroupListSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroupItem}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundTertiary }]}>
                <Users size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>Create your first group to start chatting with multiple people</Text>
              <TouchableOpacity 
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateGroup}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={styles.emptyButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default GroupListScreen;

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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundTertiary,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundTertiary,
    ...Shadows.small,
  },
  list: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    ...Shadows.small,
  },
  unreadGroupItem: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundTertiary,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.background,
  },
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  groupName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  unreadGroupName: {
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  groupTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginLeft: Spacing.sm,
  },
  unreadTime: {
    color: colors.primary,
    fontWeight: FontWeights.semibold,
  },
  groupDescription: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  unreadDescription: {
    color: colors.text,
    fontWeight: FontWeights.medium,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: FontSizes.xs,
    color: '#3B8FE8',
    marginLeft: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  unreadCount: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.small,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#3B8FE8',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  emptyButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#ffffff',
    marginLeft: Spacing.xs,
  },
});
