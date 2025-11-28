import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { achievementService, ACHIEVEMENTS } from '@/lib/achievementService';
import AchievementUnlockModal from '@/components/AchievementUnlockModal';
import { apiService } from '@/lib/api';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TestAchievementsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [userAchievements, setUserAchievements] = useState<any>(null);
  const [unseen, setUnseen] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [statsData, achievementsData, unseenData] = await Promise.all([
        achievementService.getUserStats(user.id),
        achievementService.getAllAchievements(user.id, true),
        achievementService.getUnseenAchievements(user.id),
      ]);
      
      setStats(statsData);
      setUserAchievements(achievementsData);
      setUnseen(unseenData);
      
      console.log('📊 Stats:', statsData);
      console.log('🏆 Achievements:', achievementsData);
      console.log('👀 Unseen:', unseenData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load achievement data');
    } finally {
      setLoading(false);
    }
  };

  const testAchievement = (achievementId: string) => {
    setSelectedAchievement(achievementId);
    setShowModal(true);
  };

  const showUnseenAchievements = () => {
    if (unseen.length === 0) {
      Alert.alert('No Unseen', 'No unseen achievements found');
      return;
    }
    
    setSelectedAchievement(unseen[0]);
    setShowModal(true);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Please login first</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Test Achievements</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {/* Stats Section */}
            <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 User Stats</Text>
              {stats && (
                <>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    Posts: {stats.totalPosts}
                  </Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    Likes Received: {stats.totalLikesReceived}
                  </Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    Current Streak: {stats.currentStreak} days
                  </Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    Longest Streak: {stats.longestStreak} days
                  </Text>
                </>
              )}
            </View>

            {/* Unseen Section */}
            <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                👀 Unseen Achievements ({unseen.length})
              </Text>
              {unseen.length > 0 ? (
                <>
                  {unseen.map(id => {
                    const achievement = ACHIEVEMENTS.find(a => a.id === id);
                    return (
                      <Text key={id} style={[styles.statText, { color: colors.textSecondary }]}>
                        {achievement?.icon} {achievement?.title}
                      </Text>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={showUnseenAchievements}
                  >
                    <Text style={styles.buttonText}>Show First Unseen</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.statText, { color: colors.textMuted }]}>
                  No unseen achievements
                </Text>
              )}
            </View>

            {/* All Achievements */}
            <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🏆 All Achievements
              </Text>
              {ACHIEVEMENTS.map(achievement => {
                const userAch = userAchievements?.[achievement.id];
                const isUnlocked = userAch?.unlocked || false;
                
                return (
                  <TouchableOpacity
                    key={achievement.id}
                    style={[
                      styles.achievementItem,
                      { backgroundColor: colors.backgroundTertiary },
                    ]}
                    onPress={() => testAchievement(achievement.id)}
                  >
                    <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                    <View style={styles.achievementInfo}>
                      <Text style={[styles.achievementTitle, { color: colors.text }]}>
                        {achievement.title}
                      </Text>
                      <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                        {achievement.description}
                      </Text>
                      <Text style={[styles.achievementStatus, { 
                        color: isUnlocked ? colors.success : colors.textMuted 
                      }]}>
                        {isUnlocked ? '✅ Unlocked' : '🔒 Locked'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Achievement Modal */}
      {selectedAchievement && (
        <AchievementUnlockModal
          visible={showModal}
          achievementId={selectedAchievement}
          onClose={async () => {
            if (user?.id && selectedAchievement) {
              try {
                await apiService.markAchievementAsSeen(user.id, selectedAchievement);
              } catch (error) {
                console.error('Failed to mark as seen:', error);
              }
            }
            setShowModal(false);
            setSelectedAchievement(null);
            loadData();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  achievementItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  achievementStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
