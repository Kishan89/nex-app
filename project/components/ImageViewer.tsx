import React, { useState } from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { X, Download, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}
export default function ImageViewer({ visible, imageUri, onClose }: ImageViewerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const handleImageLoad = () => {
    setLoading(false);
  };
  const handleImageError = () => {
    setLoading(false);
    Alert.alert('Error', 'Failed to load image');
  };
  const downloadImage = async () => {
    try {
      setDownloading(true);
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        setDownloading(false);
        return;
      }

      // Download the image to cache directory
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const fileUri = FileSystem.cacheDirectory + filename;
      
      const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('Nex', asset, false);
      
      Alert.alert('Success', 'Image saved to gallery!');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
  const shareImage = async () => {
    try {
      setDownloading(true);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        setDownloading(false);
        return;
      }

      // Download the image to cache directory first
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const fileUri = FileSystem.cacheDirectory + filename;
      
      const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }

      // Share the image file (not a link)
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share Image',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Header with controls */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={shareImage}
              disabled={downloading}
            >
              <Share2 size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={downloadImage}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Download size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Image container */}
        <View style={styles.imageContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </View>
        {/* Tap to close overlay */}
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}
interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  headerButton: ViewStyle;
  headerActions: ViewStyle;
  imageContainer: ViewStyle;
  image: ImageStyle;
  loadingContainer: ViewStyle;
  overlay: ViewStyle;
}
const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});
