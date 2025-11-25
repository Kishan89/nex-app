import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, Image, ScrollView } from 'react-native';
import { ArrowLeft, Check, Camera, Users, UserPlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
import { CreateGroupSkeleton } from '@/components/skeletons';

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
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
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

  const handleSelectGroupIcon = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to set group icon.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupIcon(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
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
      
      // Upload group icon if selected
      let iconUrl = null;
      if (groupIcon) {
        try {
          const uploadResult = await apiService.uploadImageFile(groupIcon, 'icon', 'group-icons');
          iconUrl = uploadResult.url;
        } catch (error) {
          console.warn('Failed to upload group icon:', error);
        }
      }
      
      const response = await apiService.createGroup(trimmedName, description.trim() || null, memberIds, iconUrl || null);
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

  const styles = createStyles(colors);

  if (loadingUsers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Group</Text>
          <View style={{ width: 36 }} />
        </View>
        <CreateGroupSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Group Icon Section */}
        <View style={styles.iconSection}>
          <TouchableOpacity 
            style={styles.iconContainer}
            onPress={handleSelectGroupIcon}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundSecondary, ...Shadows.medium }]}>
              {groupIcon ? (
                <Image source={{ uri: groupIcon }} style={styles.groupIconImage} />
              ) : (
                <View style={[styles.iconPlaceholder, { backgroundColor: colors.primary + (colors.background === '#ffffff' ? '15' : '20') }]}>
                  <Users size={40} color={colors.primary} />
                </View>
              )}
              <View style={[styles.iconEditButton, { backgroundColor: colors.primary, ...Shadows.small }]}>
                <Camera size={16} color="#ffffff" />
              </View>
            </View>
            <Text style={[styles.iconLabel, { color: colors.textMuted }]}>Add group photo</Text>
          </TouchableOpacity>
        </View>

        {/* Group Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Group Details</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
              placeholder="Enter group name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
              placeholder="What's this group about?"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={styles.sectionTitle}>Add Members</Text>
            <View style={[styles.memberCount, { backgroundColor: colors.primary + (colors.background === '#ffffff' ? '15' : '20') }]}>
              <UserPlus size={14} color={colors.primary} />
              <Text style={[styles.memberCountText, { color: colors.primary }]}>{selectedIds.size}</Text>
            </View>
          </View>
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            Only followed users are shown here. Follow members to add them to the group.
          </Text>
          <View style={styles.userList}>
            {users.map((item) => {
              const selected = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.userItem, selected && [styles.selectedUserItem, { backgroundColor: colors.primary + (colors.background === '#ffffff' ? '10' : '15'), borderColor: colors.primary }]]}
                  onPress={() => toggleUserSelection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatarContainer}>
                    <Image
                      source={item.avatar ? { uri: item.avatar } : require('@/assets/images/default-avatar.png')}
                      style={styles.userAvatar}
                    />
                    {selected && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Check size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.username, selected && { color: colors.primary, fontWeight: FontWeights.semibold }]}>{item.username}</Text>
                  </View>
                  <View style={[styles.checkbox, selected && [styles.checkboxSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]]}>
                    {selected && <Check size={14} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.createButton, { 
            backgroundColor: creating ? colors.backgroundTertiary : '#3B8FE8',
            opacity: creating ? 0.7 : 1,
            ...Shadows.medium
          }]}
          onPress={handleCreateGroup}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={[styles.createButtonText, { marginLeft: Spacing.sm }]}>Creating...</Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  // Icon Section
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  iconWrapper: {
    position: 'relative',
    borderRadius: 50,
    padding: 4,
  },
  groupIconImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  iconLabel: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  // Form Sections
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: colors.text,
    marginBottom: Spacing.md,
  },
  detailsSection: {
    marginBottom: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#3B8FE8',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Members Section
  membersSection: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  memberCountText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.xs,
    color: '#3B8FE8',
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedUserItem: {
    borderWidth: 1,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundTertiary,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderWidth: 2,
  },
  // Button
  buttonContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  createButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#ffffff',
  },
});
