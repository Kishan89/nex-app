import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '../constants/theme';
export default function LogoutButton() {
  const { signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // This single call will now handle both state change and navigation
              await signOut(); 
            } catch (err) {
              }
          }
        }
      ]
    );
  };
  return (
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        styles.logoutItem,
        { 
          backgroundColor: colors.surface, 
          marginHorizontal: Spacing.xs,
          borderRadius: BorderRadius.lg,
          marginBottom: Spacing.xs,
          ...Shadows.small
        }
      ]} 
      onPress={handleLogoutPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: colors.error + '20',
          borderWidth: 1,
          borderColor: colors.error + '30'
        }
      ]}>
        <LogOut size={22} color={colors.error} strokeWidth={2} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.error }]}>Log Out</Text>
        <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Sign out of your account</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
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
  logoutItem: {
    marginTop: Spacing.lg,
    borderBottomWidth: 0,
  },
});