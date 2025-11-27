import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonBase } from './SkeletonBase';
import { PostSkeleton } from './PostSkeleton';
import { useTheme } from '@/context/ThemeContext';
const { width } = Dimensions.get('window');
export const ProfileSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Section with Back Button */}
        <View style={styles.bannerSection}>
          <SkeletonBase width="100%" height={200} borderRadius={0} />
          <View style={styles.floatingBackButton}>
            <SkeletonBase width={32} height={32} borderRadius={16} />
          </View>
        </View>
        {/* Profile Image Section - Overlapping Banner */}
        <View style={styles.profileImageSection}>
          <SkeletonAvatar size={100} style={styles.profileImage} />
        </View>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Header with Username, XP, and Action Buttons */}
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              {/* Username and XP Row */}
              <View style={styles.usernameXpRow}>
                <SkeletonText width={140} height={28} />
                <SkeletonBase width={80} height={28} borderRadius={14} style={styles.xpBadge} />
              </View>
            </View>
            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <SkeletonBase width={44} height={44} borderRadius={22} />
            </View>
          </View>
          {/* Bio Section */}
          <View style={styles.bioSection}>
            <SkeletonText width="90%" height={16} style={styles.bioLine} />
            <SkeletonText width="75%" height={16} style={styles.bioLine} />
          </View>
          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <SkeletonText width={40} height={20} />
              <SkeletonText width={50} height={14} />
            </View>
            <View style={styles.statItem}>
              <SkeletonText width={40} height={20} />
              <SkeletonText width={60} height={14} />
            </View>
            <View style={styles.statItem}>
              <SkeletonText width={40} height={20} />
              <SkeletonText width={60} height={14} />
            </View>
          </View>
        </View>
        {/* Posts Section Header */}
        <View style={styles.postsHeaderContainer}>
          <SkeletonText width={80} height={18} />
        </View>
        {/* Minimal loading indicator instead of full post skeletons */}
        <View style={styles.contentSection}>
          <View style={styles.loadingContainer}>
            <SkeletonBase width={40} height={40} borderRadius={20} />
            <SkeletonText width={120} height={16} style={{ marginLeft: 12 }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerSection: {
    position: 'relative',
    backgroundColor: colors.background,
    overflow: 'visible',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  profileImageSection: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: -50,
    marginBottom: 8,
    zIndex: 2,
  },
  profileImage: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginTop: 0,
    backgroundColor: colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 50,
  },
  profileInfo: {
    flex: 1,
    marginRight: 16,
  },
  usernameXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  xpBadge: {
    marginLeft: 8,
  },
  actionButtonsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: -30,
    zIndex: 3,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioLine: {
    marginBottom: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 0,
  },
  statItem: {
    alignItems: 'center',
  },
  postsHeaderContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  contentSection: {
    paddingBottom: 80,
    backgroundColor: colors.background,
  },
  postCard: {
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderText: {
    marginLeft: 12,
  },
  postTime: {
    marginTop: 4,
  },
  postContent: {
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
