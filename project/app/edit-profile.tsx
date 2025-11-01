import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ArrowLeft, User, PenTool, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import apiService, { ProfileData } from '@/lib/api';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import KeyboardWrapper from '@/components/ui/KeyboardWrapper';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || 'https://via.placeholder.com/150');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || 'https://via.placeholder.com/600x200');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || 'https://via.placeholder.com/150');
      setBannerUrl(user.banner_url || 'https://via.placeholder.com/600x200');
      setInitialLoading(false);
    }
  }, [user]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const handleSaveChanges = async () => {
    if (loading || !user?.id) return;
    setLoading(true);
    try {
      const updates: Partial<ProfileData> = { username, bio };
      const response = await apiService.updateUserProfile(user.id, updates);
      setUser(response.user);
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error: any) {
      console.log('Profile update error:', error);

      // Handle username taken error (multiple ways it can come)
      if (
        (error.response?.status === 400 && error.response?.data?.code === 'USERNAME_TAKEN') ||
        (error.response?.status === 400 && error.response?.data?.error?.includes('Username is already taken')) ||
        (error.message && error.message.includes('Username is already taken'))
      ) {
        Alert.alert(
          'Username Already Taken',
          'This username is already being used by another user. Please choose a different username.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Handle user not found
      if (error.response?.status === 404) {
        Alert.alert(
          'User Not Found', 
          'User account not found. Please try logging in again.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Handle network errors
      if (!error.response || error.code === 'NETWORK_ERROR') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to server. Please check your internet connection and try again.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Clean up error message - remove HTTP codes and technical details
      let errorMessage = error.response?.data?.error || error.message || 'Failed to update profile. Please try again.';
      
      // Remove HTTP status codes from error message
      errorMessage = errorMessage.replace(/HTTP \d+\s*—?\s*/gi, '');
      errorMessage = errorMessage.replace(/Error:\s*/gi, '');
      
      // Show clean error message
      Alert.alert(
        'Update Failed', 
        errorMessage,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'avatar' | 'banner') => {
    if (loading || !user?.id) return;
    setLoading(true);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need gallery permissions to continue.');
      setLoading(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      try {
        const folder = type === 'avatar' ? 'avatars' : 'banners';
        const uploadResponse = await apiService.uploadImageFile(result.assets[0].uri, 'file', folder);
        const newImageUrl = uploadResponse.url;
        if (!newImageUrl) throw new Error('Invalid image URL');
        const updates: Partial<ProfileData> = type === 'avatar' ? { avatar_url: newImageUrl } : { banner_url: newImageUrl };
        const updateProfileResponse = await apiService.updateUserProfile(user.id, updates);
        if (type === 'avatar') setAvatarUrl(newImageUrl);
        else setBannerUrl(newImageUrl);
        setUser(updateProfileResponse.user);
        Alert.alert('Success', `${type === 'avatar' ? 'Profile picture' : 'Banner image'} updated!`);
      } catch (error: any) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);

  if (initialLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* StatusBar is handled globally in main app layout */}
      <View style={styles.container}>
        <KeyboardWrapper>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: colors.backgroundTertiary }]}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={styles.backButton} />
            </View>
            {/* Banner */}
            <View style={styles.bannerContainer}>
              <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
              <TouchableOpacity onPress={() => pickImage('banner')} style={[styles.bannerIcon, { borderColor: '#004aad' }]} disabled={loading}>
                <View style={[styles.iconGradient, { backgroundColor: '#004aad' }]}>
                  <ImageIcon size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
            {/* Avatar */}
            <View style={styles.profileImageContainer}>
              <Image
                source={avatarUrl && avatarUrl !== 'https://via.placeholder.com/150' ? { uri: avatarUrl } : require('@/assets/images/default-avatar.png')}
                style={styles.profileImage}
              />
              <TouchableOpacity onPress={() => pickImage('avatar')} style={[styles.cameraIcon, { backgroundColor: colors.primary, borderColor: colors.background }]} disabled={loading}>
                <Camera size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            {/* Inputs */}
            <View style={styles.inputSection}>
              <View style={styles.inputWrapper}>
                <User size={20} color={colors.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={colors.textPlaceholder}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              <View style={styles.textAreaWrapper}>
                <PenTool size={20} color={colors.primary} style={styles.icon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Bio"
                  placeholderTextColor={colors.textPlaceholder}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>
            </View>
            {/* Save Button */}
            <TouchableOpacity onPress={handleSaveChanges} style={styles.saveButton} disabled={loading}>
              <View style={[styles.buttonGradient, {backgroundColor: '#004aad'}]}>
                <Text style={[styles.saveButtonText, { color: '#ffffff' }]}>{loading ? 'Saving...' : 'Save Changes'}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardWrapper>
      </View>
    </SafeAreaView>
  );
}

// Create dynamic styles function
const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: Spacing.lg,
      paddingTop: 5, // Minimal top padding for consistent spacing
      paddingBottom: 8, // Minimal bottom padding for consistent spacing
    },
    backButton: {
      padding: Spacing.sm,
      borderRadius: BorderRadius.round,
      backgroundColor: colors.backgroundTertiary,
      ...Shadows.small,
    },
    headerTitle: {
      fontSize: FontSizes.xxl,
      fontWeight: FontWeights.bold,
      color: colors.text,
    },
    // Banner
    bannerContainer: {
      width: '100%',
      height: 120,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      position: 'relative',
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      borderRadius: BorderRadius.lg,
    },
    bannerIcon: {
      position: 'absolute',
      bottom: Spacing.sm,
      right: Spacing.sm,
      borderRadius: BorderRadius.round,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.primary,
      ...Shadows.medium,
    },
    iconGradient: {
      width: ComponentStyles.avatar.medium,
      height: ComponentStyles.avatar.medium,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.round,
      backgroundColor: '#004aad',
    },
    // Avatar
    profileImageContainer: {
      marginTop: -60,
      marginBottom: Spacing.xl,
      position: 'relative',
      ...Shadows.large,
    },
    profileImage: {
      width: ComponentStyles.avatar.xlarge + 30, // Extra large for edit profile
      height: ComponentStyles.avatar.xlarge + 30,
      borderRadius: (ComponentStyles.avatar.xlarge + 30) / 2,
      borderWidth: 3,
      borderColor: colors.primary,
      backgroundColor: colors.backgroundTertiary,
    },
    cameraIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#004aad',
      padding: Spacing.sm,
      borderRadius: BorderRadius.round,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.medium,
    },
    // Inputs
    inputSection: {
      width: '100%',
      marginBottom: Spacing.xl,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.small,
    },
    textAreaWrapper: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.small,
    },
    icon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: FontSizes.md,
      paddingVertical: Spacing.md,
      fontWeight: FontWeights.regular,
    },
    textArea: {
      flex: 1,
      fontSize: FontSizes.md,
      color: colors.text,
      textAlignVertical: 'top',
      fontWeight: FontWeights.regular,
    },
    // Save Button
    saveButton: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      ...Shadows.medium,
    },
    buttonGradient: {
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.lg,
    },
    saveButtonText: {
      color: colors.text,
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.bold,
    },
    // Loading
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: Spacing.lg,
      color: colors.textMuted,
      fontSize: FontSizes.md,
      fontWeight: FontWeights.medium,
    },
  });