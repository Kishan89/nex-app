import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonBase } from './SkeletonBase';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';

const { width } = Dimensions.get('window');

export const ProfileSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          <SkeletonBase width="100%" height={200} borderRadius={0} />
          {/* Floating Back Button */}
          <View style={styles.floatingBackButton}>
            <SkeletonBase width={ComponentStyles.avatar.medium} height={ComponentStyles.avatar.medium} borderRadius={ComponentStyles.avatar.medium / 2} />
          </View>
        </View>

        {/* Profile Image Section - Overlapping Banner */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <SkeletonAvatar size={ComponentStyles.avatar.xlarge + 8} />
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Header with Username, XP, and Action Buttons */}
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              {/* Username and XP Row */}
              <View style={styles.usernameXpRow}>
                <SkeletonText width={140} height={28} />
                <SkeletonBase width={80} height={24} borderRadius={12} style={styles.xpBadge} />
              </View>
            </View>
            
            {/* Top Action Buttons (Non-Owner) */}
            <View style={styles.actionButtonsContainer}>
              <SkeletonButton width={40} height={36} borderRadius={BorderRadius.round} />
              <SkeletonButton width={40} height={36} borderRadius={BorderRadius.round} style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.bioSection}>
            <SkeletonText width="90%" height={16} style={styles.bioLine} />
            <SkeletonText width="75%" height={16} style={styles.bioLine} />
          </View>

          {/* Main Action Buttons (Edit/Achievements) */}
          <View style={styles.mainActionsContainer}>
            <SkeletonButton width="48%" height={44} borderRadius={BorderRadius.lg} />
            <SkeletonButton width="48%" height={44} borderRadius={BorderRadius.lg} />
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <SkeletonText width={30} height={24} style={{ marginBottom: 4 }} />
              <SkeletonText width={40} height={14} />
            </View>
            <View style={styles.statItem}>
              <SkeletonText width={30} height={24} style={{ marginBottom: 4 }} />
              <SkeletonText width={60} height={14} />
            </View>
            <View style={styles.statItem}>
              <SkeletonText width={30} height={24} style={{ marginBottom: 4 }} />
              <SkeletonText width={60} height={14} />
            </View>
          </View>
        </View>

        {/* Tabs Section (Owner) */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabItem}>
            <SkeletonText width={60} height={20} />
            <View style={styles.activeTabIndicator} />
          </View>
          <View style={styles.tabItem}>
            <SkeletonText width={80} height={20} />
          </View>
        </View>

        {/* Posts Content */}
        <View style={styles.contentSection}>
          {[1, 2, 3].map((index) => (
            <View key={index} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <SkeletonAvatar size={40} />
                <View style={styles.postHeaderText}>
                  <SkeletonText width={120} height={16} style={{ marginBottom: 4 }} />
                  <SkeletonText width={80} height={12} />
                </View>
              </View>

              {/* Post Content (Text First) */}
              <View style={styles.postContentContainer}>
                <SkeletonText width="95%" height={16} style={styles.postContentLine} />
                <SkeletonText width="80%" height={16} style={styles.postContentLine} />
              </View>

              {/* Post Image */}
              <SkeletonBase width="100%" height={200} borderRadius={BorderRadius.md} style={styles.postImage} />

              {/* Post Actions */}
              <View style={styles.postActions}>
                {/* Left: Reply Text */}
                <SkeletonText width={60} height={14} />
                
                {/* Right: Icons */}
                <View style={styles.rightActions}>
                  <SkeletonBase width={20} height={20} borderRadius={10} />
                  <SkeletonText width={20} height={14} style={{ marginLeft: 6 }} />
                  <SkeletonBase width={20} height={20} borderRadius={10} style={{ marginLeft: 16 }} />
                </View>
              </View>
            </View>
          ))}
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
    marginTop: -Spacing.md,
  },
  floatingBackButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    zIndex: 10,
  },
  profileImageSection: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    marginTop: -50,
    marginBottom: Spacing.xs,
    zIndex: 2,
  },
  profileImageContainer: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    paddingHorizontal: Spacing.md,
    marginTop: 0,
    backgroundColor: colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  bioSection: {
    marginBottom: Spacing.md,
  },
  bioLine: {
    marginBottom: 6,
  },
  mainActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    marginRight: Spacing.xl,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  activeTabIndicator: {
    width: '100%',
    height: 3,
    backgroundColor: colors.primary,
    marginTop: 4,
    borderRadius: 2,
  },
  contentSection: {
    paddingBottom: 80,
    backgroundColor: colors.background,
  },
  postCard: {
    padding: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: Spacing.sm,
    // Removed horizontal margin to match full width list style usually
    marginBottom: 1, 
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  postHeaderText: {
    marginLeft: 12,
  },
  postContentContainer: {
    marginBottom: Spacing.sm,
  },
  postContentLine: {
    marginBottom: 6,
  },
  postImage: {
    marginBottom: Spacing.sm,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
