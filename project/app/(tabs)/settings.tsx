import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Share,
  Linking,
} from 'react-native';
import {
  Palette,
  Info,
  ChevronRight,
  X,
  Moon,
  Sun,
  Smartphone,
  Star,
  Share2,
  Download,
} from 'lucide-react-native';
import LogoutButton from '../logout';
import { trackScreenView } from '@/lib/firebase';
import {
  Colors,
  Spacing,
  FontSizes,
  FontWeights,
  BorderRadius,
  ComponentStyles,
  Shadows,
} from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('settings_screen');
  }, []);
  const handleRateApp = async () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1';
    try {
      const supported = await Linking.canOpenURL(playStoreUrl);
      if (supported) {
        await Linking.openURL(playStoreUrl);
      } else {
        Alert.alert(
          'Error',
          'Unable to open Play Store. Please try again later.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to open Play Store. Please try again later.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };
  const handleShareApp = async () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1';
    const message = `Check out Nexeed - Connect, share, and discover with friends!\n\nDownload now: ${playStoreUrl}`;
    
    try {
      const result = await Share.share({
        message: message,
        title: 'Share Nexeed App',
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to share the app. Please try again later.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };
  // Appearance Modal
  const AppearanceModal = () => (
    <Modal
      visible={showAppearanceModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAppearanceModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Appearance</Text>
          <TouchableOpacity onPress={() => setShowAppearanceModal(false)}>
            <X size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          {[
            { key: 'dark', label: 'Dark Theme', icon: Moon },
            { key: 'light', label: 'Light Theme', icon: Sun },
            { key: 'auto', label: 'System Default', icon: Smartphone },
          ].map(option => {
            const IconComponent = option.icon;
            const isSelected = themeMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: isSelected ? colors.primaryAlpha : colors.surface,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setThemeMode(option.key as any);
                  setShowAppearanceModal(false);
                }}
                activeOpacity={0.7}
              >
                <IconComponent size={22} color={isSelected ? colors.primary : colors.textMuted} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && { fontWeight: FontWeights.bold },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {option.key === 'dark'
                      ? 'Dark backgrounds and light text'
                      : option.key === 'light'
                      ? 'Light backgrounds and dark text'
                      : 'Follows your device settings'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
  // About Modal
  const AboutModal = () => (
    <Modal
      visible={showAboutModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAboutModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>About</Text>
          <TouchableOpacity onPress={() => setShowAboutModal(false)}>
            <X size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.aboutTitle, { color: colors.text }]}>Nexeed Social</Text>
            <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>Version 1.2.1</Text>
            <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
              Connect, share, and discover with friends in a beautiful social experience.
            </Text>
          </View>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>
              Contact & Support
            </Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              Email: team@nexeed.in
            </Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              Website: Nexeed.in
            </Text>
          </View>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>Legal</Text>
            <TouchableOpacity style={styles.aboutLink}>
              <Text style={[styles.aboutLinkText, { color: colors.primary }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aboutLink}>
              <Text style={[styles.aboutLinkText, { color: colors.primary }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
  const settingsOptions = [
    // Appearance Section
    {
      icon: Palette,
      title: 'Appearance',
      subtitle: 'Theme and display',
      onPress: () => setShowAppearanceModal(true),
      section: 'Preferences',
    },
    // App Section
    {
      icon: Star,
      title: 'Rate App',
      subtitle: 'Rate us on the Play Store',
      onPress: handleRateApp,
      section: 'App',
    },
    {
      icon: Share2,
      title: 'Share App',
      subtitle: 'Share with friends',
      onPress: handleShareApp,
      section: 'App',
    },
    { icon: Download, title: 'App Version', subtitle: 'v1.2.1', section: 'App' },
    // Support Section
    {
      icon: Info,
      title: 'About',
      subtitle: 'Privacy policy and terms',
      onPress: () => setShowAboutModal(true),
      section: 'Support',
    },
  ];
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* StatusBar is handled globally in main app layout */}
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
        {/* Group settings by sections */}
        {['Preferences', 'App', 'Support'].map(section => (
          <View key={section}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{section}</Text>
            {settingsOptions
              .filter(option => option.section === section)
              .map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <TouchableOpacity
                    key={`${section}-${index}`}
                    style={[
                      styles.settingItem,
                      {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                        marginHorizontal: Spacing.xs,
                        borderRadius: BorderRadius.lg,
                        marginBottom: Spacing.xs,
                        ...Shadows.small,
                      },
                    ]}
                    onPress={option.onPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: colors.primaryAlpha,
                          borderWidth: 1,
                          borderColor: colors.primary + '20',
                        },
                      ]}
                    >
                      <IconComponent size={24} color={colors.primary} />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {option.title}
                      </Text>
                      {option.subtitle && (
                        <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                          {option.subtitle}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
          </View>
        ))}
        <LogoutButton />
      </ScrollView>
      <AppearanceModal />
      <AboutModal />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 5, // Minimal top padding for consistent spacing
    paddingBottom: 8, // Minimal bottom padding for consistent spacing
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extrabold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  settingsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.regular,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: FontWeights.semibold,
  },
  optionDescription: {
    fontSize: FontSizes.xs,
    marginTop: 2,
    fontWeight: FontWeights.regular,
  },
  selectedOption: {
    borderWidth: 1,
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  aboutCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.small,
  },
  aboutTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  aboutVersion: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  aboutDescription: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  aboutSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  aboutText: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  aboutLink: {
    paddingVertical: Spacing.xs,
  },
  aboutLinkText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
