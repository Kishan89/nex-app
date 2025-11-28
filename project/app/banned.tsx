import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ShieldOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';

export default function BannedScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <LinearGradient 
      colors={isDark ? ['#1a1a1a', '#2d1a1f'] : ['#fff5f5', '#ffe5e5']} 
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
            <ShieldOff size={80} color={colors.error} strokeWidth={1.5} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.error }]}>
            Account Suspended
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            Your account has been temporarily suspended due to violations of our community guidelines.
          </Text>

          {/* Reason Box */}
          {user?.banReason && (
            <View style={[styles.reasonBox, { 
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.error + '40'
            }]}>
              <View style={styles.reasonHeader}>
                <AlertTriangle size={20} color={colors.error} />
                <Text style={[styles.reasonTitle, { color: colors.error }]}>
                  Reason for Suspension
                </Text>
              </View>
              <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
                {user.banReason}
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.backgroundTertiary }]}>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              If you believe this is a mistake or would like to appeal this decision, please contact our support team.
            </Text>
          </View>

          {/* Support Email */}
          <TouchableOpacity 
            style={[styles.emailButton, { borderColor: colors.border }]}
            onPress={() => {/* TODO: Open email client */}}
          >
            <Text style={[styles.emailText, { color: colors.primary }]}>
              team@nexeed.in
            </Text>
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.signOutButton, { backgroundColor: colors.error }]}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Additional Info */}
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Account suspended on {user?.bannedAt ? new Date(user.bannedAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  reasonBox: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
