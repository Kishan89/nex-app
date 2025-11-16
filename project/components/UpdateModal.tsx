import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { VersionInfo } from '@/lib/versionCheck';

interface UpdateModalProps {
  visible: boolean;
  versionInfo: VersionInfo;
  onDismiss?: () => void;
}

export default function UpdateModal({ visible, versionInfo, onDismiss }: UpdateModalProps) {
  const { colors, isDark } = useTheme();
  
  const handleUpdate = () => {
    Linking.openURL(versionInfo.updateUrl);
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={versionInfo.updateRequired ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: versionInfo.updateRequired ? '#ff000020' : '#3B8FE820' }]}>
            <AlertCircle 
              size={48} 
              color={versionInfo.updateRequired ? '#ff0000' : '#3B8FE8'} 
            />
          </View>
          
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {versionInfo.updateRequired ? 'Update Required' : 'Update Available'}
          </Text>
          
          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {versionInfo.updateRequired
              ? `Version ${versionInfo.latestVersion} is required to continue. Please update from the ${Platform.OS === 'android' ? 'Play Store' : 'App Store'} before continuing.`
              : `Version ${versionInfo.latestVersion} is now available with new features and improvements.`
            }
          </Text>
          
          {/* Release Notes */}
          {versionInfo.releaseNotes && (
            <View style={[styles.releaseNotesContainer, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.releaseNotesTitle, { color: colors.text }]}>
                What's New:
              </Text>
              <Text style={[styles.releaseNotes, { color: colors.textSecondary }]}>
                {versionInfo.releaseNotes}
              </Text>
            </View>
          )}
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {!versionInfo.updateRequired && (
              <TouchableOpacity
                style={[styles.button, styles.laterButton, { backgroundColor: colors.backgroundTertiary }]}
                onPress={onDismiss}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  Later
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.updateButton, 
                { backgroundColor: versionInfo.updateRequired ? '#ff0000' : '#3B8FE8' },
                !versionInfo.updateRequired && { flex: 1 }
              ]}
              onPress={handleUpdate}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>
                Update Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  releaseNotesContainer: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  releaseNotesTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  releaseNotes: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButton: {
    flex: 1,
  },
  updateButton: {
    flex: 2,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});
