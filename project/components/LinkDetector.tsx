import React from 'react';
import { Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSizes, FontWeights } from '@/constants/theme';

interface LinkDetectorProps {
  text: string;
  style?: any;
  numberOfLines?: number;
  onTextLayout?: (event: any) => void;
}

export default function LinkDetector({ text, style, numberOfLines, onTextLayout }: LinkDetectorProps) {
  const { colors } = useTheme();

  const handleLinkPress = async (url: string) => {
    try {
      let fullUrl = url;
      
      // Add https:// prefix if URL doesn't start with http:// or https://
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = `https://${url}`;
      }
      
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  // Function to check if a string is a URL
  const isUrl = (str: string) => {
    const urlPattern = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)$/;
    return urlPattern.test(str);
  };

  // Function to parse text and create components
  const parseText = () => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    
    const parts = text.split(urlRegex);
    const components = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part && isUrl(part)) {
        components.push(
          <Text
            key={i}
            onPress={() => handleLinkPress(part)}
            style={[style, {
              textDecorationLine: 'underline',
              fontWeight: FontWeights.medium,
              color: '#007AFF',
            }]}
          >
            {part}
          </Text>
        );
      } else if (part) {
        components.push(part);
      }
    }
    
    return components;
  };

  return (
    <Text style={style} numberOfLines={numberOfLines} onTextLayout={onTextLayout}>
      {parseText()}
    </Text>
  );
}
