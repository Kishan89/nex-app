import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  DeviceEventEmitter,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, XCircle, BarChart2, UserX } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import KeyboardWrapper from '@/components/ui/KeyboardWrapper';
import ImageCompressionService, { CompressionResult } from '../lib/imageCompression';
import { achievementService } from '@/lib/achievementService';
import AchievementUnlockModal from '@/components/AchievementUnlockModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreatePostScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // Achievement state
  const [unlockedAchievement, setUnlockedAchievement] = useState<string | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  
  // Word count validation
  const MAX_WORDS = 500;
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isOverLimit = wordCount > MAX_WORDS;
  // Poll State
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const handlePollOptionChange = (text: string, index: number) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };
  const addPollOption = () => pollOptions.length < 4 && setPollOptions([...pollOptions, '']);
  const removePollOption = (index: number) => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, i) => i !== index));
  const togglePollCreation = () => {
    if (isCreatingPoll) {
      setPollQuestion('');
      setPollOptions(['', '']);
    }
    setIsCreatingPoll(!isCreatingPoll);
  };
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Please grant photo library access.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: undefined, // Remove fixed aspect ratio for free cropping
      quality: 0.8, // Use medium quality as fallback for compression
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      await compressAndSetImage(res.assets[0].uri);
    }
  };
  const compressAndSetImage = async (originalUri: string) => {
    try {
      setIsCompressing(true);
      // Use smart compression for optimal results
      const result = await ImageCompressionService.smartCompress(originalUri);
      setImageUri(result.uri);
      setCompressionResult(result);
    } catch (error) {
      // Fallback to original image if compression fails
      setImageUri(originalUri);
    } finally {
      setIsCompressing(false);
    }
  };
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePost = async () => {
    if (!user?.id) return Alert.alert('Not logged in', 'Please log in to create a post.');
    if (!content.trim() && !imageUri && !isCreatingPoll) return Alert.alert('Empty post', 'Write something, choose an image, or create a poll.');
    if (isOverLimit) return Alert.alert('Post too long', `Your post has ${wordCount} words. Please keep it under ${MAX_WORDS} words.`);
    let pollData;
    if (isCreatingPoll) {
      if (!pollQuestion.trim()) return Alert.alert('Invalid Poll', 'Please enter a poll question.');
      const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) return Alert.alert('Invalid Poll', 'A poll must have at least two options.');

      // Check for duplicate options
      const uniqueOptions = new Set(validOptions.map(opt => opt.toLowerCase()));
      if (uniqueOptions.size !== validOptions.length) {
        return Alert.alert('Duplicate Options', 'Poll options must be unique. Please remove duplicate options.');
      }

      pollData = { question: pollQuestion.trim(), options: validOptions };
    }
    Keyboard.dismiss();
    setIsPosting(true);
    try {
      let imageUrl;
      if (imageUri) {
        const uploadResp = await apiService.uploadImageFile(imageUri, 'file', 'posts');
        if (!uploadResp?.url) throw new Error('Image upload failed.');
        imageUrl = uploadResp.url;
      }
      const payload: any = {
        content: content.trim(),
        userId: user.id,
        isAnonymous,
        ...(imageUrl ? { imageUrl } : {}),
        ...(pollData ? { pollData } : {}),
      };
      const createdPost = await apiService.createPost(payload);
      
      // Track achievement for post creation
      if (user.id) {
        console.log('🏆 Checking achievements...');
        // Check for any unseen achievements that might have been unlocked
        const newlyUnlocked = await achievementService.getUnseenAchievements(user.id);
        
        console.log('🎯 Newly unlocked:', newlyUnlocked);
        
        // Show achievement modal if any were unlocked
        if (newlyUnlocked.length > 0) {
          // Validate time-based achievements client-side
          const validAchievements = newlyUnlocked.filter(id => achievementService.validateAchievementTime(id));
          
          if (validAchievements.length > 0) {
            setUnlockedAchievement(validAchievements[0]);
            setShowAchievementModal(true);
            
            // Don't navigate immediately - let user see the celebration!
            console.log('✨ Achievement modal showing!');
            
            // Emit event but stay on screen
            DeviceEventEmitter.emit('newPost:created', createdPost);
            
            // Show success but don't navigate yet
            // Alert removed for better UX
            
            return; // Don't navigate - user will close modal manually
          }
        }
      }
      
      // Normal flow if no achievement
      DeviceEventEmitter.emit('newPost:created', createdPost);
      router.back();
      // Alert removed for better UX
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create post.');
    } finally {
      setIsPosting(false);
    }
  };
  const isPostButtonDisabled = isPosting || isCompressing || isOverLimit || (!content.trim() && !imageUri && !isCreatingPoll);
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.safe}>
      {/* StatusBar is handled globally in main app layout */}
      <View style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Post</Text>
          <TouchableOpacity
            style={[styles.postButton, isPostButtonDisabled && styles.postButtonDisabled]}
            disabled={isPostButtonDisabled}
            onPress={handlePost}
          >
            {isPosting ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.postText, { color: colors.background }]}>Post</Text>}
          </TouchableOpacity>
          
          {/* Debug button removed */}
        </View>
        <KeyboardWrapper
          extraHeight={Platform.OS === 'android' ? 20 : 0}
          extraScrollHeight={Platform.OS === 'ios' ? 5 : 0}
          enableAutomaticScroll={true}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <Animated.View style={styles.card} entering={FadeIn} exiting={FadeOut}>
              <TextInput
                style={[styles.input, isOverLimit && styles.inputError]}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textPlaceholder}
                multiline
                value={content}
                onChangeText={setContent}
                textAlignVertical="top"
                editable={!isPosting}
                scrollEnabled={true}
                blurOnSubmit={false}
              />
              {/* Word count display */}
              {content.trim() && (
                <View style={styles.wordCountContainer}>
                  <Text style={[styles.wordCountText, isOverLimit && styles.wordCountError]}>
                    {wordCount}/{MAX_WORDS} words
                  </Text>
                  {isOverLimit && (
                    <Text style={styles.wordCountWarning}>
                      Please reduce by {wordCount - MAX_WORDS} words
                    </Text>
                  )}
                </View>
              )}
              {/* Action Icons */}
              <View style={styles.actionSection}>
                <View style={styles.iconRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: imageUri ? colors.primaryAlpha : 'transparent' }]} 
                    onPress={pickImage} 
                    disabled={isPosting || isCompressing}
                  >
                    {isCompressing ? (
                      <ActivityIndicator size={20} color={colors.primary} />
                    ) : (
                      <ImageIcon size={22} color={imageUri ? colors.primary : colors.textSecondary} />
                    )}
                    <Text style={[styles.actionButtonText, { color: imageUri ? colors.primary : colors.textSecondary }]}>
                      Photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: isCreatingPoll ? colors.primaryAlpha : 'transparent' }]} 
                    onPress={togglePollCreation} 
                    disabled={isPosting || isCompressing}
                  >
                    <BarChart2 size={22} color={isCreatingPoll ? colors.error : colors.textSecondary} />
                    <Text style={[styles.actionButtonText, { color: isCreatingPoll ? colors.error : colors.textSecondary }]}>
                      Poll
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.anonymousSection}>
                  <TouchableOpacity 
                    style={[styles.anonymousButton, { 
                      backgroundColor: isAnonymous ? colors.primary : colors.backgroundTertiary,
                      borderColor: isAnonymous ? colors.primary : colors.border
                    }]} 
                    onPress={() => setIsAnonymous(!isAnonymous)} 
                    disabled={isPosting || isCompressing}
                  >
                    <UserX size={18} color={isAnonymous ? colors.background : colors.textSecondary} />
                    <Text style={[styles.anonymousButtonText, { 
                      color: isAnonymous ? colors.background : colors.textSecondary 
                    }]}>
                      Post Anonymously
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
            {/* Poll Creation - Outside card to match input boundary */}
            {isCreatingPoll && (
              <Animated.View style={styles.pollContainer}>
                <View style={styles.pollHeader}>
                  <BarChart2 size={20} color={colors.primary} />
                  <Text style={styles.pollHeaderText}>Create Poll</Text>
                </View>
                <TextInput
                  style={styles.pollInput}
                  placeholder="Ask a question..."
                  placeholderTextColor={colors.textPlaceholder}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  multiline
                />
                <View style={styles.pollOptionsContainer}>
                  {pollOptions.map((option, index) => (
                    <View key={index} style={styles.pollOptionRow}>
                      <View style={styles.optionNumber}>
                        <Text style={styles.optionNumberText}>{index + 1}</Text>
                      </View>
                      <TextInput
                        style={styles.pollOptionInput}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={colors.textPlaceholder}
                        value={option}
                        onChangeText={(text) => handlePollOptionChange(text, index)}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity 
                          style={styles.removeOptionButton}
                          onPress={() => removePollOption(index)}
                        >
                          <XCircle size={18} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
                {pollOptions.length < 4 && (
                  <TouchableOpacity style={styles.addOptionButton} onPress={addPollOption}>
                    <Text style={styles.addOptionText}>+ Add Option</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}
            {/* Image Preview - Outside card to match input boundary */}
            {imageUri && (
              <View style={styles.imagePreviewSection}>
                <View style={styles.imageHeader}>
                  <ImageIcon size={18} color={colors.primary} />
                  <Text style={styles.imageHeaderText}>Photo Preview</Text>
                </View>
                <TouchableOpacity 
                  style={styles.imageWrap}
                  onPress={() => setShowFullImage(true)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.image}
                  />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={(e) => {
                      e.stopPropagation();
                      setImageUri(null);
                      setCompressionResult(null);
                    }}
                  >
                    <XCircle size={20} color="#ffffff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardWrapper>
      </View>
      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <View style={styles.fullImageModal}>
          <TouchableOpacity 
            style={styles.fullImageOverlay}
            activeOpacity={1}
            onPress={() => setShowFullImage(false)}
          >
            <View style={styles.fullImageContainer}>
              <TouchableOpacity 
                style={styles.closeFullImageBtn}
                onPress={() => setShowFullImage(false)}
              >
                <XCircle size={24} color="#ffffff" />
              </TouchableOpacity>
              {imageUri && (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {/* Achievement Unlock Modal */}
      {unlockedAchievement && (
        <AchievementUnlockModal
          visible={showAchievementModal}
          achievementId={unlockedAchievement}
          onClose={() => {
            console.log('🎉 Achievement modal closed');
            if (unlockedAchievement && user?.id) {
              achievementService.markAsSeen(user.id, unlockedAchievement);
            }
            setShowAchievementModal(false);
            setUnlockedAchievement(null);
            // Navigate back after celebration
            router.back();
          }}
        />
      )}
    </SafeAreaView>
  );
}
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    height: 50, // Minimal height for consistent spacing
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 3 : 0, // Minimal padding for consistency
    ...Shadows.small,
  },
  headerLeft: { 
    padding: Spacing.sm,
    borderRadius: BorderRadius.round,
    // Removed grey background
  },
  title: { 
    fontSize: FontSizes.xl, 
    color: colors.text, 
    fontWeight: FontWeights.bold 
  },
  postButton: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.round,
    ...Shadows.medium,
  },
  postButtonDisabled: { 
    backgroundColor: colors.textDisabled, 
    ...Shadows.none,
  },
  postText: { 
    color: colors.background, 
    fontWeight: FontWeights.bold, 
    fontSize: FontSizes.md 
  },
  debugButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollContent: { 
    paddingHorizontal: Spacing.md, 
    paddingTop: Spacing.lg, 
    paddingBottom: 80 
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.card,
    marginBottom: Spacing.md,
  },
  input: { 
    minHeight: 120, 
    maxHeight: 200,
    color: colors.text, 
    fontSize: FontSizes.md, 
    lineHeight: 24, 
    padding: 0, 
    marginBottom: Spacing.sm,
    fontWeight: FontWeights.regular,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  wordCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  wordCountText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  wordCountError: {
    color: colors.error,
  },
  wordCountWarning: {
    fontSize: FontSizes.xs,
    color: colors.error,
    fontWeight: FontWeights.medium,
  },
  actionSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    flex: 1,
    justifyContent: 'center',
  },
  anonymousSection: {
    marginTop: Spacing.xs,
  },
  anonymousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.small,
  },
  anonymousButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  iconCircle: {
    width: ComponentStyles.button.height,
    height: ComponentStyles.button.height,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  imageWrap: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.backgroundTertiary,
  },
  image: { 
    width: '100%', 
    height: 200, // Fixed height like before
    resizeMode: 'cover', // Cover to allow free cropping
    backgroundColor: colors.backgroundTertiary,
  },
  removeBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: colors.overlayDark,
    padding: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  pollContainer: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md, // Match scrollContent horizontal padding
    padding: Spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.card,
  },
  pollInput: { 
    backgroundColor: colors.backgroundQuaternary, 
    padding: Spacing.sm, 
    borderRadius: BorderRadius.md, 
    color: colors.text, 
    fontSize: FontSizes.md, 
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pollOptionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.sm 
  },
  pollOptionInput: { 
    flex: 1, 
    backgroundColor: colors.backgroundQuaternary, 
    padding: Spacing.sm, 
    borderRadius: BorderRadius.md, 
    color: colors.text, 
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: FontSizes.sm,
  },
  addOptionButton: { 
    backgroundColor: colors.primaryAlpha, 
    paddingVertical: Spacing.sm, 
    borderRadius: BorderRadius.md, 
    alignItems: 'center', 
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addOptionText: { 
    color: colors.primary, 
    fontWeight: FontWeights.semibold, 
    fontSize: FontSizes.sm 
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  pollHeaderText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
  },
  pollOptionsContainer: {
    gap: Spacing.sm,
  },
  optionNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  optionNumberText: {
    color: colors.background,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  removeOptionButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  imagePreviewSection: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md, // Match scrollContent horizontal padding
    padding: Spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.card,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  imageHeaderText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: colors.textSecondary,
  },
  // Full screen image modal styles
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  fullImageOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeFullImageBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});