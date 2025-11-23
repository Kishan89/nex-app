import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from '@/components/ImageViewer';

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupData: any;
  onUpdate?: () => void;
}

export default function GroupInfoModal({
  visible,
  onClose,
  groupId,
  groupData,
  onUpdate,
}: GroupInfoModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState('');

  useEffect(() => {
    if (groupData) {
      setName(groupData.name || '');
      setDescription(groupData.description || '');
      setAvatar(groupData.avatar || '');
      setMembers(groupData.participants || []);
      
      // Check if current user is admin
      const userParticipant = groupData.participants?.find(
        (p: any) => p.userId === user?.id
      );
      const adminStatus = userParticipant?.isAdmin || false;
      setIsAdmin(adminStatus);
      
      console.log('Group admin check:', {
        userId: user?.id,
        groupId: groupData.id,
        isAdmin: adminStatus,
        userParticipant
      });
    }
  }, [groupData, user]);

  const handlePickImage = async () => {
    if (!isAdmin) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admins can edit group settings');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving group changes:', { groupId, name, description, avatar });
      
      // Update name
      if (name !== groupData.name) {
        console.log('Updating group name...');
        await apiService.updateGroupName(groupId, name);
      }

      // Update description
      if (description !== groupData.description) {
        console.log('Updating group description...');
        await apiService.updateGroupDescription(groupId, description);
      }

      // Update avatar
      if (avatar !== groupData.avatar) {
        console.log('Updating group avatar...');
        await apiService.updateGroupAvatar(groupId, avatar);
      }

      Alert.alert('Success', 'Group updated successfully');
      setEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating group:', error);
      const errorMessage = error.message || 'Failed to update group';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return;

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeGroupMember(groupId, memberId);
              setMembers(members.filter((m) => m.userId !== memberId));
              Alert.alert('Success', 'Member removed');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) return;

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteChat(groupId);
              Alert.alert('Success', 'Group deleted successfully');
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const handleExitGroup = async () => {
    if (isAdmin) return;

    Alert.alert(
      'Exit Group',
      'Are you sure you want to exit this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.leaveGroup(groupId);
              Alert.alert('Success', 'You have left the group');
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to exit group');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Group Info
          </Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => (editing ? handleSave() : setEditing(true))}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.editButton, { color: colors.primary }]}>
                  {editing ? 'Save' : 'Edit'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          {/* Group Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              if (editing) {
                handlePickImage();
              } else if (avatar && avatar.trim() !== '') {
                // Show fullscreen image viewer when not editing
                setViewerImageUri(avatar);
                setShowImageViewer(true);
              }
            }}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="people" size={40} color="#fff" />
              </View>
            )}
            {editing && (
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Group Name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Group Name
            </Text>
            {editing ? (
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, color: colors.text },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Enter group name"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>{name}</Text>
            )}
          </View>

          {/* Group Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Description
            </Text>
            {editing ? (
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.backgroundSecondary, color: colors.text },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter group description"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {description || 'No description'}
              </Text>
            )}
          </View>

          {/* Members */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Members ({members.length})
            </Text>
            {members.map((member) => (
              <View
                key={member.userId}
                style={[styles.memberItem, { borderBottomColor: colors.border }]}
              >
                <Image
                  source={{
                    uri: member.user?.avatar || 'https://via.placeholder.com/40',
                  }}
                  style={styles.memberAvatar}
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.user?.username}
                  </Text>
                  {member.isAdmin && (
                    <Text style={[styles.adminBadge, { color: colors.primary }]}>
                      Admin
                    </Text>
                  )}
                </View>
                {isAdmin && !member.isAdmin && member.userId !== user?.id && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.userId)}
                  >
                    <Ionicons name="remove-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Add Members Button */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Navigate to add members screen
                onClose();
              }}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Members</Text>
            </TouchableOpacity>
          )}

          {/* Delete Group Button (Admin Only) */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ff4444' }]}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Group</Text>
            </TouchableOpacity>
          )}

          {/* Exit Group Button (Members Only) */}
          {!isAdmin && (
            <TouchableOpacity
              style={[styles.exitButton, { backgroundColor: '#ff4444' }]}
              onPress={handleExitGroup}
            >
              <Ionicons name="exit" size={20} color="#fff" />
              <Text style={styles.exitButtonText}>Exit Group</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Image Viewer Modal */}
        <ImageViewer 
          visible={showImageViewer}
          imageUri={viewerImageUri}
          onClose={() => setShowImageViewer(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 6,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  adminBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
