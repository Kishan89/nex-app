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
        {/* Enhanced Header with Back Button */}
        <View style={styles.header}>
          <SkeletonBase width={32} height={32} borderRadius={16} />
          <SkeletonText width={140} height={24} />
          <SkeletonBase width={32} height={32} borderRadius={16} />
        </View>
        {/* Cover Photo Section */}
        <View style={styles.coverSection}>
          <SkeletonBase width="100%" height={180} borderRadius={0} />
          <View style={styles.profileImageContainer}>
            <SkeletonAvatar size={120} style={styles.profileImage} />
            <SkeletonBase width={36} height={36} borderRadius={18} style={styles.editButton} />
          </View>
        </View>
        {/* Enhanced Profile Info */}
        <View style={styles.profileSection}>
          {/* Name and Verification */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <SkeletonText width={160} height={28} />
              <SkeletonBase width={24} height={24} borderRadius={12} style={styles.verifiedBadge} />
            </View>
            <SkeletonText width={120} height={16} style={styles.handle} />
          </View>
          {/* Enhanced Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <SkeletonText width={50} height={24} />
              <SkeletonText width={60} height={16} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <SkeletonText width={45} height={24} />
              <SkeletonText width={70} height={16} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <SkeletonText width={40} height={24} />
              <SkeletonText width={50} height={16} />
            </View>
          </View>
          {/* Bio Section with Links */}
          <View style={styles.bioSection}>
            <SkeletonText width="95%" height={16} style={styles.bioLine} />
            <SkeletonText width="80%" height={16} style={styles.bioLine} />
            <View style={styles.linkRow}>
              <SkeletonBase width={16} height={16} borderRadius={4} />
              <SkeletonText width={140} height={16} style={styles.link} />
            </View>
            <View style={styles.linkRow}>
              <SkeletonBase width={16} height={16} borderRadius={4} />
              <SkeletonText width={100} height={16} style={styles.link} />
            </View>
          </View>
          {/* Enhanced Action Buttons */}
          <View style={styles.actionButtons}>
            <SkeletonButton width="42%" height={40} />
            <SkeletonButton width="42%" height={40} />
            <SkeletonBase width={40} height={40} borderRadius={20} />
          </View>
          {/* Highlights Section */}
          <View style={styles.highlightsSection}>
            <SkeletonText width={80} height={18} style={styles.sectionTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3, 4, 5].map((index) => (
                <View key={index} style={styles.highlightItem}>
                  <SkeletonBase width={64} height={64} borderRadius={32} />
                  <SkeletonText width={50} height={12} style={styles.highlightName} />
                </View>
              ))}
            </ScrollView>
          </View>
          {/* Enhanced Tab Bar */}
          <View style={styles.tabBar}>
            <View style={styles.tabItem}>
              <SkeletonBase width={24} height={24} borderRadius={4} />
              <SkeletonText width={40} height={14} style={styles.tabLabel} />
            </View>
            <View style={styles.tabItem}>
              <SkeletonBase width={24} height={24} borderRadius={4} />
              <SkeletonText width={50} height={14} style={styles.tabLabel} />
            </View>
            <View style={styles.tabItem}>
              <SkeletonBase width={24} height={24} borderRadius={4} />
              <SkeletonText width={45} height={14} style={styles.tabLabel} />
            </View>
          </View>
        </View>
        {/* Enhanced Posts Grid with Variety */}
        <View style={styles.postsGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <SkeletonBase 
              key={index}
              width={(width - 60) / 3} 
              height={(width - 60) / 3} 
              borderRadius={12}
              style={styles.gridItem}
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  coverSection: {
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  profileImage: {
    borderWidth: 4,
    borderColor: colors.background,
  },
  editButton: {
    marginLeft: 12,
    backgroundColor: colors.border,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
  },
  nameSection: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
  },
  handle: {
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioLine: {
    marginBottom: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  link: {
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  highlightsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  highlightName: {
    marginTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabLabel: {
    marginTop: 6,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  gridItem: {
    marginBottom: 12,
  },
});
