import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export const SearchResultsSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <SkeletonText width={120} height={18} />
      </View>
      
      {/* User Results List */}
      <View style={styles.usersList}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={styles.userItem}>
            {/* Avatar */}
            <SkeletonAvatar size={52} />
            
            {/* User Info */}
            <View style={styles.userContent}>
              <SkeletonText width={120} height={15} style={styles.username} />
              <SkeletonText width={180} height={13} />
            </View>
            
            {/* XP Badge */}
            <SkeletonBase width={50} height={40} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  userContent: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  username: {
    marginBottom: 4,
  },
});
