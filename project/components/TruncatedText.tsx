import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSizes, FontWeights, Spacing } from '@/constants/theme';
import LinkDetector from './LinkDetector';

interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  style?: any;
  onPress?: () => void;
  onToggle?: () => void;
  refreshKey?: number; // Add refresh key to reset state
  forceExpand?: boolean; // Force text to be fully expanded
}

export default function TruncatedText({ 
  text, 
  maxLines = 6, 
  style,
  onPress,
  onToggle,
  refreshKey,
  forceExpand = false
}: TruncatedTextProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const textRef = useRef<Text>(null);
  
  // Reset states when text changes, component mounts, or refreshKey changes
  useEffect(() => {
    setIsExpanded(false);
    setShouldTruncate(false);
  }, [text, refreshKey]);
  
  const handleTextLayout = (event: any) => {
    const { lines } = event.nativeEvent;
    // Only check truncation when text is not expanded
    if (!isExpanded && lines && lines.length > maxLines) {
      setShouldTruncate(true);
    } else if (!isExpanded) {
      setShouldTruncate(false);
    }
  };
  
  const handleToggle = () => {
    // If onPress is provided, navigate to comment screen instead of expanding
    if (onPress) {
      onPress();
    } else {
      // Fallback: expand text inline
      if (!isExpanded) {
        setIsExpanded(true);
        onToggle?.();
      }
    }
  };

  // Simple approach: always show "read more" for text longer than a certain character count
  // This is a fallback when onTextLayout doesn't work properly
  const shouldShowReadMoreFallback = !isExpanded && text.length > 200;
  
  // More sophisticated approach: estimate lines based on text length and average characters per line
  const estimatedLines = Math.ceil(text.length / 50); // Rough estimate: ~50 chars per line
  const shouldShowReadMoreEstimate = !isExpanded && estimatedLines > maxLines;
  
  // Use either the layout-based detection or the fallback methods
  const shouldShowReadMore = shouldTruncate || shouldShowReadMoreFallback || shouldShowReadMoreEstimate;
  
  
  return (
    <View>
      <Text
        ref={textRef}
        style={[styles.text, { color: colors.text }, style]}
        numberOfLines={forceExpand || isExpanded ? undefined : maxLines}
        onTextLayout={handleTextLayout}
      >
        <LinkDetector 
          text={text}
          style={[styles.text, { color: colors.text }, style]}
        />
      </Text>
      
      {(shouldShowReadMore) && !isExpanded && !forceExpand && (
        <TouchableOpacity 
          onPress={handleToggle} 
          style={styles.readMoreButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.readMoreText, { color: colors.primary }]}>
            Read more
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    fontWeight: FontWeights.regular,
  },
  readMoreButton: {
    marginTop: -6,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
