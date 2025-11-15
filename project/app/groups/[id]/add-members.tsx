import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Image, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

interface UserItem {
  id: string;
  username: string;
  avatar?: string;
  isAdmin?: boolean;
  isSelf?: boolean;
}

const AddMembersScreen = () => {
  const params = useLocalSearchParams();
  const { id, name } = params as { id?: string; name?: string };
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [members, setMembers] = useState<UserItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserItem | null>(null);

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
      const currentMembers: UserItem[] = [];

      if (chat && Array.isArray(chat.participants)) {
        chat.participants.forEach((p: any) => {
          const memberId = p.user?.id || p.userId;
          const username = p.user?.username || 'Unknown';

          if (memberId) {
            existingIds.add(memberId);
            currentMembers.push({
              id: memberId,
              username,
              avatar: p.user?.avatar,
              isAdmin: !!p.isAdmin,
              isSelf: memberId === user.id,
            });
          }
        });
      }

      // Sort members: self first, then admins, then alphabetical
      currentMembers.sort((a, b) => {
        if (a.isSelf && !b.isSelf) return -1;
        if (!a.isSelf && b.isSelf) return 1;
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return a.username.localeCompare(b.username);
      });

      setMembers(currentMembers);

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

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId || !memberId) return;
    
    try {
      setRemovingId(memberId);
      await apiService.removeGroupMember(groupId, memberId);
      
      // Remove the member from the local state
      const removedMember = members.find(m => m.id === memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      
      // Add the removed user back to the available users list if they exist
      if (removedMember) {
        setUsers(prev => [...prev, {...removedMember, isAdmin: false, isSelf: false}]);
      }
      
      setShowRemoveModal(false);
      setSelectedMember(null);
    } catch (error: any) {
      const message = error?.message || 'Failed to remove member. You may not have permission.';
      Alert.alert('Error', message);
    } finally {
      setRemovingId(null);
    }
  };
  
  const confirmRemoveMember = (member: UserItem) => {
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isAdding = addingId === item.id;
    const isSelected = members.some(member => member.id === item.id);
    const initials = item.username
      .split(' ')
      .map(name => name[0]?.toUpperCase())
      .join('')
      .substring(0, 2);

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.selectedUserItem,
        ]}
        onPress={() => isSelected ? null : handleAddUser(item.id)}
        disabled={isAdding || isSelected}
      >
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            style={[
              styles.avatarImage,
              isSelected && { borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 2 }
            ]}
            defaultSource={require('@/assets/images/default-avatar.png')}
          />
        ) : (
          <View style={[
            styles.avatarPlaceholder,
            isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
          ]}>
            <Text style={[
              styles.avatarText,
              isSelected && styles.selectedText
            ]}>
              {initials}
            </Text>
          </View>
        )}
        
        <View style={styles.userInfo}>
          <Text 
            style={[
              styles.username, 
              isSelected && styles.selectedText,
              { flex: 1 }
            ]} 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.username}
          </Text>
          
          <View style={styles.memberTagsRow}>
            {item.isSelf && (
              <Text style={[
                styles.memberTag,
                isSelected && styles.selectedMemberTag
              ]}>
                You
              </Text>
            )}
            {item.isAdmin && !item.isSelf && (
              <Text style={[
                styles.memberTag,
                isSelected && styles.selectedMemberTag
              ]}>
                Admin
              </Text>
            )}
          </View>
        </View>
        
        {!isSelected && (
          <TouchableOpacity
            style={[styles.addButton, isAdding && styles.addButtonLoading]}
            onPress={() => handleAddUser(item.id)}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <UserPlus size={16} color="white" />
            )}
          </TouchableOpacity>
        )}
        
        {isSelected && (
          <View style={styles.addButton}>
            <Text style={styles.addButtonText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRemoveModal}
        onRequestClose={() => {
          setShowRemoveModal(false);
          setSelectedMember(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Member</Text>
            <Text style={styles.modalText}>
              Are you sure you want to remove {selectedMember?.username} from the group?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRemoveModal(false);
                  setSelectedMember(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.removeButton]}
                onPress={() => selectedMember && handleRemoveMember(selectedMember.id)}
                disabled={!!removingId}
              >
                {removingId === selectedMember?.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {members.length > 0 ? `Add to ${name || 'Group'}` : 'Add Members'}
          </Text>
          {members.length > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: FontSizes.sm }}>
              {members.length} members
            </Text>
          )}
        </View>
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
          ListHeaderComponent={
            members.length > 0 ? (
              <View style={styles.membersSection}>
                <Text style={styles.sectionTitle}>Current members</Text>
                {members.map((m) => {
                  const isSelf = m.id === user?.id;
                  return (
                    <View 
                      key={m.id} 
                      style={[
                        styles.memberItem,
                        isSelf && styles.selectedMemberItem
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[
                          styles.avatarPlaceholder,
                          isSelf && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                        ]}>
                          <Text style={[
                            styles.avatarText,
                            isSelf && styles.selectedText
                          ]}>
                            {m.username?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={[
                            styles.memberUsername,
                            isSelf && styles.selectedMemberUsername
                          ]}>
                            {m.username}
                          </Text>
                          <View style={styles.memberTagsRow}>
                            {m.isSelf && (
                              <Text style={[
                                styles.memberTag,
                                isSelf && styles.selectedMemberTag
                              ]}>
                                You
                              </Text>
                            )}
                            {m.isAdmin && !m.isSelf && (
                              <Text style={[
                                styles.memberTag,
                                isSelf && styles.selectedMemberTag
                              ]}>
                                Admin
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                      {!isSelf && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => confirmRemoveMember(m)}
                        >
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                <Text style={styles.sectionTitle}>Add new members</Text>
              </View>
            ) : null
          }
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 36, // Match back button width
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
    padding: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.background,
    minHeight: 64,
  },
  selectedUserItem: {
    backgroundColor: colors.primary,
  },
  selectedText: {
    color: '#ffffff',
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: FontWeights.medium,
    fontSize: FontSizes.md,
  },
  addButtonLoading: {
    opacity: 0.7,
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  membersSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: FontWeights.semibold,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: 2,
    justifyContent: 'space-between',
  },
  selectedMemberItem: {
    backgroundColor: colors.primary,
  },
  memberUsername: {
    color: colors.text,
    fontSize: FontSizes.md,
  },
  selectedMemberUsername: {
    color: '#ffffff',
  },
  memberTagsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  memberTag: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    overflow: 'hidden',
  },
  selectedMemberTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
    color: colors.text,
  },
  modalText: {
    fontSize: FontSizes.md,
    color: colors.text,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
  modalButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    marginLeft: Spacing.md,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundTertiary,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: FontWeights.medium,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    includeFontPadding: false,
    textTransform: 'capitalize',
  },
  optionText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
