import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SkeletonBase, SkeletonAvatar } from './SkeletonBase';
import { PostSkeleton } from './PostSkeleton';
import { useTheme } from '../../context/ThemeContext';
import { Spacing } from '../../constants/theme';

export const HomeSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Post Skeletons - Match actual feed */}
      <View style={styles.postsContainer}>
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.postWrapper}>
            <PostSkeleton 
              showImage={index % 3 === 1} // Some posts have images
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },
  postsContainer: {
    paddingTop: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },
});
