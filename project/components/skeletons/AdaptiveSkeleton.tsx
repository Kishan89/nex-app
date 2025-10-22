import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { SkeletonBase, SkeletonAvatar, SkeletonText, SkeletonImage } from './SkeletonBase';
interface AdaptiveSkeletonProps {
  type: 'post' | 'user' | 'notification' | 'chat' | 'grid';
  count?: number;
  showImage?: boolean;
  compact?: boolean;
  style?: any;
}
const { width: screenWidth } = Dimensions.get('window');
export const AdaptiveSkeleton: React.FC<AdaptiveSkeletonProps> = React.memo(({
  type,
  count = 1,
  showImage = true,
  compact = false,
  style
}) => {
  const skeletonConfig = useMemo(() => {
    const isTablet = screenWidth > 768;
    const isSmallScreen = screenWidth < 375;
    switch (type) {
      case 'post':
        return {
          avatarSize: isSmallScreen ? 36 : compact ? 40 : 44,
          spacing: compact ? 12 : 16,
          imageHeight: isTablet ? 300 : isSmallScreen ? 160 : 200,
          textLines: compact ? 2 : 3,
          containerPadding: isSmallScreen ? 16 : 20,
        };
      case 'user':
        return {
          avatarSize: isSmallScreen ? 44 : compact ? 48 : 52,
          spacing: compact ? 10 : 12,
          containerPadding: isSmallScreen ? 16 : 20,
        };
      case 'notification':
        return {
          avatarSize: isSmallScreen ? 36 : compact ? 40 : 44,
          spacing: compact ? 8 : 12,
          containerPadding: isSmallScreen ? 16 : 20,
        };
      case 'chat':
        return {
          avatarSize: isSmallScreen ? 36 : compact ? 40 : 44,
          spacing: compact ? 8 : 12,
          containerPadding: isSmallScreen ? 16 : 20,
        };
      case 'grid':
        const columns = isTablet ? 4 : isSmallScreen ? 2 : 3;
        const itemSize = (screenWidth - (isSmallScreen ? 32 : 40) - ((columns - 1) * 8)) / columns;
        return {
          itemSize: Math.floor(itemSize),
          columns,
          spacing: 8,
          containerPadding: isSmallScreen ? 16 : 20,
        };
      default:
        return {
          avatarSize: 44,
          spacing: 12,
          containerPadding: 20,
        };
    }
  }, [type, compact]);
  const renderPostSkeleton = () => (
    <View style={[styles.postContainer, { padding: skeletonConfig.containerPadding }]}>
      {/* Header */}
      <View style={[styles.postHeader, { marginBottom: skeletonConfig.spacing }]}>
        <SkeletonAvatar size={skeletonConfig.avatarSize} />
        <View style={styles.headerInfo}>
          <SkeletonText width={120} height={16} style={{ marginBottom: 4 }} />
          <SkeletonText width={80} height={12} />
        </View>
        <SkeletonBase width={24} height={24} borderRadius={12} />
      </View>
      {/* Content */}
      <View style={{ marginBottom: skeletonConfig.spacing }}>
        {Array.from({ length: skeletonConfig.textLines }).map((_, index) => (
          <SkeletonText 
            key={index}
            width={index === skeletonConfig.textLines - 1 ? "60%" : "90%"} 
            height={16} 
            style={{ marginBottom: 8 }} 
          />
        ))}
      </View>
      {/* Image */}
      {showImage && (
        <SkeletonImage 
          width="100%" 
          height={skeletonConfig.imageHeight} 
          borderRadius={12} 
          style={{ marginBottom: skeletonConfig.spacing }} 
        />
      )}
      {/* Actions */}
      <View style={styles.postActions}>
        {[1, 2, 3, 4].map((index) => (
          <SkeletonBase key={index} width={60} height={20} borderRadius={10} />
        ))}
      </View>
    </View>
  );
  const renderUserSkeleton = () => (
    <View style={[styles.userContainer, { 
      padding: skeletonConfig.containerPadding,
      marginBottom: skeletonConfig.spacing 
    }]}>
      <SkeletonAvatar size={skeletonConfig.avatarSize} />
      <View style={styles.userInfo}>
        <SkeletonText width={120} height={16} style={{ marginBottom: 4 }} />
        <SkeletonText width={180} height={14} />
      </View>
      <SkeletonBase width={80} height={32} borderRadius={16} />
    </View>
  );
  const renderNotificationSkeleton = () => (
    <View style={[styles.notificationContainer, { 
      padding: skeletonConfig.containerPadding,
      marginBottom: skeletonConfig.spacing 
    }]}>
      <SkeletonAvatar size={skeletonConfig.avatarSize} />
      <View style={styles.notificationInfo}>
        <SkeletonText width="90%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonText width="70%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonText width={80} height={12} />
      </View>
      <SkeletonBase width={8} height={8} borderRadius={4} />
    </View>
  );
  const renderChatSkeleton = () => (
    <View style={[styles.chatContainer, { 
      padding: skeletonConfig.containerPadding,
      marginBottom: skeletonConfig.spacing 
    }]}>
      <SkeletonAvatar size={skeletonConfig.avatarSize} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <SkeletonText width={100} height={16} />
          <SkeletonText width={40} height={12} />
        </View>
        <SkeletonText width="80%" height={14} />
      </View>
      <SkeletonBase width={20} height={20} borderRadius={10} />
    </View>
  );
  const renderGridSkeleton = () => {
    const items = Array.from({ length: count });
    const rows = Math.ceil(items.length / skeletonConfig.columns);
    return (
      <View style={[styles.gridContainer, { padding: skeletonConfig.containerPadding }]}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <View key={rowIndex} style={[styles.gridRow, { marginBottom: skeletonConfig.spacing }]}>
            {Array.from({ length: skeletonConfig.columns }).map((_, colIndex) => {
              const itemIndex = rowIndex * skeletonConfig.columns + colIndex;
              if (itemIndex >= items.length) return null;
              return (
                <SkeletonBase
                  key={colIndex}
                  width={skeletonConfig.itemSize}
                  height={skeletonConfig.itemSize}
                  borderRadius={8}
                  animationType="pulse"
                  style={{ marginRight: colIndex < skeletonConfig.columns - 1 ? skeletonConfig.spacing : 0 }}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  };
  const renderSkeleton = () => {
    switch (type) {
      case 'post': return renderPostSkeleton();
      case 'user': return renderUserSkeleton();
      case 'notification': return renderNotificationSkeleton();
      case 'chat': return renderChatSkeleton();
      case 'grid': return renderGridSkeleton();
      default: return renderPostSkeleton();
    }
  };
  return (
    <View style={style}>
      {Array.from({ length: type === 'grid' ? 1 : count }).map((_, index) => (
        <View key={index}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
});
const styles = StyleSheet.create({
  postContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  chatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridContainer: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
