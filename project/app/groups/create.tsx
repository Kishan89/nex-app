import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

interface UserItem {
  id: string;
  username: string;
  avatar?: string;
}

const CreateGroupScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const resp = await apiService.getMessagableUsers();
      const items: UserItem[] = Array.isArray(resp)
        ? resp
        : ((resp as any)?.data || (resp as any)?.users || []);
      setUsers(items || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

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

  const toggleUserSelection = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a group.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }

    if (selectedIds.size === 0) {
      Alert.alert('Select Members', 'Please select at least one member to add to the group.');
      return;
    }

    try {
      setCreating(true);
      const memberIds = Array.from(selectedIds);
      const response = await apiService.createGroup(trimmedName, description.trim() || null, memberIds);
      const group = (response as any)?.data || response;
      const groupId = group?.id;

      if (!groupId) {
        throw new Error('Invalid group response from server');
      }

      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace({
              pathname: `/groups/${groupId}`,
              params: { name: trimmedName },
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
        </View>
        <View style={[styles.checkbox, selected && [styles.checkboxSelected, { borderColor: colors.primary }]]}>
          {selected && <Check size={16} color={colors.primary} />}
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
        <Text style={styles.title}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Enter group name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text }]}
          placeholder="Describe your group"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Text style={styles.label}>Add Members</Text>
        {loadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            style={styles.userList}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: creating ? colors.backgroundTertiary : colors.primary }]}
        onPress={handleCreateGroup}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CreateGroupScreen;

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
  form: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    fontSize: FontSizes.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    paddingVertical: Spacing.md,
  },
  userList: {
    flex: 1,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.background,
  },
  createButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.background,
  },
});
