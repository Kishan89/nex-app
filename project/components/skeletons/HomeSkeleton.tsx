import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { SkeletonBase, SkeletonAvatar, SkeletonText } from './SkeletonBase';
import { PostSkeleton } from './PostSkeleton';
import { useTheme } from '../../context/ThemeContext';
const { width } = Dimensions.get('window');
export const HomeSkeleton: React.FC = () => {
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Unique Header with Gradient Effect */}
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.leftSection}>
          <SkeletonAvatar size={44} style={styles.profileAvatar} />
          <View style={styles.brandSection}>
            <SkeletonBase width={120} height={28} borderRadius={6} animationType="pulse" />
            <SkeletonBase width={80} height={14} borderRadius={4} style={styles.subtitle} />
          </View>
        </View>
        <View style={styles.headerActions}>
          <SkeletonBase width={36} height={36} borderRadius={18} animationType="shimmer" />
          <SkeletonBase width={36} height={36} borderRadius={18} animationType="shimmer" />
        </View>
      </View>
      {/* Enhanced Tabs with Different Sizes */}
      <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <SkeletonBase width={60} height={32} borderRadius={16} animationType="pulse" />
        <SkeletonBase width={80} height={32} borderRadius={16} animationType="pulse" />
        <SkeletonBase width={70} height={32} borderRadius={16} animationType="pulse" />
        <SkeletonBase width={90} height={32} borderRadius={16} animationType="pulse" />
      </View>
      {/* Stories Section */}
      <View style={[styles.storiesContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View key={index} style={styles.storyItem}>
              <SkeletonAvatar size={64} style={styles.storyAvatar} />
              <SkeletonBase width={50} height={12} borderRadius={6} style={styles.storyName} />
            </View>
          ))}
        </ScrollView>
      </View>
      {/* Limited Post Skeletons - only show top 2 posts */}
      <View style={styles.postsContainer}>
        {[1, 2].map((index) => (
          <View key={index} style={styles.postWrapper}>
            <PostSkeleton 
              showImage={index % 2 === 0} 
            />
          </View>
        ))}
        {/* Loading indicator for remaining content */}
        <View style={styles.loadingIndicator}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.dot, styles.dot2, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.dot, styles.dot3, { backgroundColor: colors.textMuted }]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    marginRight: 12,
  },
  brandSection: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storiesContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginLeft: 16,
  },
  storyAvatar: {
    marginBottom: 8,
  },
  storyName: {
    marginTop: 4,
  },
  postsContainer: {
    paddingTop: 16,
  },
  postWrapper: {
    marginBottom: 1,
  },
  loadingIndicator: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  dot1: {
    opacity: 0.8,
  },
  dot2: {
    opacity: 0.5,
  },
  dot3: {
    opacity: 0.3,
  },
});
