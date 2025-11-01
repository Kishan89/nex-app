import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SkeletonBase, SkeletonText, SkeletonButton } from './SkeletonBase';
export const AuthSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <SkeletonBase width={120} height={40} borderRadius={8} />
          <SkeletonText width="80%" height={16} style={styles.subtitle} />
        </View>
        {/* Form Fields */}
        <View style={styles.form}>
          <SkeletonBase width="100%" height={50} borderRadius={12} style={styles.input} />
          <SkeletonBase width="100%" height={50} borderRadius={12} style={styles.input} />
          {/* Login Button */}
          <SkeletonButton width="100%" height={50} style={styles.button} />
          {/* Divider */}
          <View style={styles.divider}>
            <SkeletonBase width={80} height={1} />
            <SkeletonText width={20} height={14} />
            <SkeletonBase width={80} height={1} />
          </View>
          {/* Google Button */}
          <SkeletonButton width="100%" height={50} style={styles.button} />
          {/* Footer Links */}
          <View style={styles.footer}>
            <SkeletonText width={200} height={14} />
            <SkeletonText width={100} height={14} style={styles.link} />
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    marginTop: 12,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    gap: 8,
  },
  link: {
    marginTop: 8,
  },
});
