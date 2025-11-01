import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonBase } from './SkeletonBase';
export const CreatePostSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonButton width={60} height={32} />
        <SkeletonText width={100} height={20} />
        <SkeletonButton width={60} height={32} />
      </View>
      {/* User Info */}
      <View style={styles.userSection}>
        <SkeletonAvatar size={50} />
        <View style={styles.userInfo}>
          <SkeletonText width={120} height={16} style={styles.username} />
          <SkeletonText width={80} height={14} />
        </View>
      </View>
      {/* Text Input Area */}
      <View style={styles.textInputArea}>
        <SkeletonText width="100%" height={16} style={styles.textLine} />
        <SkeletonText width="85%" height={16} style={styles.textLine} />
        <SkeletonText width="70%" height={16} style={styles.textLine} />
        <SkeletonText width="40%" height={16} />
      </View>
      {/* Media Preview Area */}
      <View style={styles.mediaPreview}>
        <SkeletonBase 
          width="100%" 
          height={200} 
          borderRadius={12}
          animationType="pulse"
        />
      </View>
      {/* Poll Options (sometimes visible) */}
      {Math.random() > 0.5 && (
        <View style={styles.pollSection}>
          <SkeletonText width={80} height={16} style={styles.pollTitle} />
          <View style={styles.pollOption}>
            <SkeletonBase width="100%" height={40} borderRadius={8} />
          </View>
          <View style={styles.pollOption}>
            <SkeletonBase width="100%" height={40} borderRadius={8} />
          </View>
          <SkeletonButton width={120} height={32} />
        </View>
      )}
      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.actionButtons}>
          <SkeletonButton width={40} height={40} />
          <SkeletonButton width={40} height={40} />
          <SkeletonButton width={40} height={40} />
          <SkeletonButton width={40} height={40} />
        </View>
        <View style={styles.postSettings}>
          <SkeletonText width={100} height={14} />
          <SkeletonButton width={24} height={24} />
        </View>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  userInfo: {
    marginLeft: 12,
  },
  username: {
    marginBottom: 4,
  },
  textInputArea: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 120,
  },
  textLine: {
    marginBottom: 12,
  },
  mediaPreview: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  pollSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  pollTitle: {
    marginBottom: 15,
  },
  pollOption: {
    marginBottom: 12,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  postSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
