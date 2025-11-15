import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

interface GroupItem {
  id: string | number;
  name: string;
  description?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  memberCount?: number;
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
        style={styles.groupItem}
        onPress={() => handleGroupPress(item)}
      >
        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, hasUnread && styles.unreadGroupName]} numberOfLines={1}>
              {item.name || 'Group'}
            </Text>
            <Text style={[styles.groupTime, hasUnread && styles.unreadTime]}>
              {item.time || ''}
            </Text>
          </View>
          {item.description ? (
            <Text style={styles.groupDescription} numberOfLines={1}>
              {item.description}
            </Text>
          ) : (
            <Text style={styles.groupDescription} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
          )}
          <View style={styles.groupFooter}>
            <Text style={styles.memberCountText}>
              {item.memberCount != null ? `${item.memberCount} members` : ''}
            </Text>
            {hasUnread && <View style={styles.unreadDot} />}
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
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup}>
          <Plus size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create a new group</Text>
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
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundTertiary,
  },
  list: {
    flex: 1,
  },
  groupItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.backgroundSecondary,
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
  },
  groupTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginLeft: Spacing.sm,
  },
  unreadTime: {
    color: colors.primary,
    fontWeight: FontWeights.bold,
  },
  groupDescription: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberCountText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: '#ff4757',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
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
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
  },
});
