import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
interface NotificationPermissionDialogProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}
const { width } = Dimensions.get('window');
export const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
  visible,
  onAllow,
  onDeny,
}) => {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          {/* Header with Bell Icon */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="notifications" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Enable Notifications
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Stay connected with your friends and never miss important updates
            </Text>
          </View>
          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                Get notified when someone sends you a message
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="heart" size={20} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                Know when your posts get likes and comments
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="person-add" size={20} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                See when someone starts following you
              </Text>
            </View>
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.allowButton, { backgroundColor: colors.primary }]}
              onPress={onAllow}
              activeOpacity={0.8}
            >
              <Text style={styles.allowButtonText}>Allow Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.denyButton, { borderColor: colors.border }]}
              onPress={onDeny}
              activeOpacity={0.8}
            >
              <Text style={[styles.denyButtonText, { color: colors.textSecondary }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  allowButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  denyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
