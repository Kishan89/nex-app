import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { BarChart3, Users } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { usePollVote } from '@/context/PollVoteContext';
const { width } = Dimensions.get('window');
interface PollOption {
  id: string;
  text: string;
  votesCount: number;
  _count?: { votes: number };
}
interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  userVote?: string | null; // ID of the option the user voted for (from backend)
}
interface PollComponentProps {
  poll: Poll;
  hasVoted?: boolean;
  userVote?: string;
  onVote: (pollId: string, optionId: string) => Promise<void>;
}
export const PollComponent: React.FC<PollComponentProps> = React.memo(({
  poll,
  hasVoted = false,
  userVote,
  onVote,
}) => {
  const { colors, isDark } = useTheme();
  const { hasVotedOnPoll, getUserVoteForPoll, syncPollVoteAcrossScreens } = usePollVote();
  const [isVoting, setIsVoting] = useState(false);
  
  // CRITICAL: Prioritize backend vote data (poll.userVote) over local storage
  // This ensures that when a user refreshes, they see their vote from the server
  const backendUserVote = poll.userVote || userVote;
  const backendHasVoted = Boolean(backendUserVote) || hasVoted;
  
  // Debug logging
  console.log('🗳️ Poll Debug:', {
    pollId: poll.id,
    backendUserVote,
    backendHasVoted,
    propsUserVote: userVote,
    propsHasVoted: hasVoted
  });
  
  // Use global poll vote state with fallback to props - memoized to prevent recalculation
  const globalHasVoted = useMemo(() => hasVotedOnPoll(poll.id), [hasVotedOnPoll, poll.id]);
  const globalUserVote = useMemo(() => getUserVoteForPoll(poll.id), [getUserVoteForPoll, poll.id]);
  
  // Prioritize: backend vote > local storage > props
  const initialHasVoted = backendHasVoted || globalHasVoted || hasVoted;
  const initialUserVote = backendUserVote || globalUserVote || userVote;
  
  const [localHasVoted, setLocalHasVoted] = useState(initialHasVoted);
  const [localUserVote, setLocalUserVote] = useState(initialUserVote);
  const [localOptions, setLocalOptions] = useState(poll.options);
  
  console.log('🗳️ Poll State:', {
    pollId: poll.id,
    localHasVoted,
    localUserVote,
    initialHasVoted,
    initialUserVote
  });
  
  // Single effect to sync vote state - prioritize backend data
  useEffect(() => {
    console.log('🔄 Poll useEffect triggered:', { pollId: poll.id, backendUserVote, userVote });
    
    // Priority: backend vote > props > local storage
    if (backendUserVote) {
      console.log('✅ Using backend vote:', backendUserVote);
      setLocalHasVoted(true);
      setLocalUserVote(backendUserVote);
      syncPollVoteAcrossScreens(poll.id, backendUserVote);
    } else if (userVote) {
      console.log('✅ Using props vote:', userVote);
      setLocalHasVoted(true);
      setLocalUserVote(userVote);
      syncPollVoteAcrossScreens(poll.id, userVote);
    } else {
      const storedHasVoted = hasVotedOnPoll(poll.id);
      const storedUserVote = getUserVoteForPoll(poll.id);
      
      console.log('📦 Checking local storage:', { storedHasVoted, storedUserVote });
      
      if (storedHasVoted && storedUserVote) {
        console.log('✅ Using stored vote:', storedUserVote);
        setLocalHasVoted(true);
        setLocalUserVote(storedUserVote);
      } else {
        console.log('❌ No vote found anywhere');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.id, backendUserVote, userVote]);
  // Listen for poll vote sync events from other screens
  useEffect(() => {
    const handlePollVoteSync = (data: { pollId: string; optionId: string }) => {
      const { pollId, optionId } = data;
      if (pollId === poll.id) {
        setLocalHasVoted(true);
        setLocalUserVote(optionId);
        // Don't increment vote count here - let server data handle the actual counts
        // This prevents double counting when vote is synced across screens
      }
    };
    const subscription = DeviceEventEmitter.addListener('pollVoteSync', handlePollVoteSync);
    return () => subscription.remove();
  }, [poll.id]);
  
  // Memoize expensive calculations
  const totalVotes = useMemo(() => {
    return localOptions.reduce((sum, option) => {
      return sum + (option._count?.votes || option.votesCount || 0);
    }, 0);
  }, [localOptions]);
  // Handle vote submission
  const handleVote = async (optionId: string) => {
    if (localHasVoted || isVoting) return;
    
    // OPTIMISTIC UPDATE - Update UI immediately for instant feedback
    setLocalHasVoted(true);
    setLocalUserVote(optionId);
    setLocalOptions(prev => prev.map(opt => 
      opt.id === optionId 
        ? { ...opt, votesCount: (opt.votesCount || 0) + 1 }
        : opt
    ));
    
    // Store vote in AsyncStorage for persistence
    syncPollVoteAcrossScreens(poll.id, optionId);
    
    try {
      setIsVoting(true);
      // Submit to backend in background
      await onVote(poll.id, optionId);
    } catch (error: any) {
      // Revert optimistic update on error
      setLocalHasVoted(false);
      setLocalUserVote(undefined);
      setLocalOptions(prev => prev.map(opt => 
        opt.id === optionId 
          ? { ...opt, votesCount: Math.max(0, (opt.votesCount || 0) - 1) }
          : opt
      ));
      Alert.alert('Error', error.message || 'Failed to cast vote');
    } finally {
      setIsVoting(false);
    }
  };
  // Memoize percentage calculation
  const getPercentage = useMemo(() => {
    return (option: PollOption): number => {
      if (totalVotes === 0) return 0;
      const votes = option._count?.votes || option.votesCount || 0;
      return Math.round((votes / totalVotes) * 100);
    };
  }, [totalVotes]);
  
  // Memoize winning options calculation
  const winningOptions = useMemo(() => {
    if (totalVotes === 0) return [];
    const maxVotes = Math.max(...localOptions.map(option => 
      option._count?.votes || option.votesCount || 0
    ));
    return localOptions
      .filter(option => (option._count?.votes || option.votesCount || 0) === maxVotes)
      .map(option => option.id);
  }, [localOptions, totalVotes]);
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.container}>
      {/* Poll Question */}
      <View style={styles.header}>
        <BarChart3 size={18} color={colors.primary} />
        <Text style={styles.question}>{poll.question}</Text>
      </View>
      {/* Poll Options */}
      <View style={styles.optionsContainer}>
        {localOptions.map((option) => {
          const percentage = getPercentage(option);
          const votes = option._count?.votes || option.votesCount || 0;
          const isUserVote = localUserVote === option.id;
          const isWinning = winningOptions.includes(option.id) && totalVotes > 0;
          return (
            <PollOptionItem
              key={option.id}
              option={option}
              percentage={percentage}
              votes={votes}
              isUserVote={isUserVote}
              isWinning={isWinning}
              hasVoted={localHasVoted}
              isVoting={isVoting}
              onPress={() => handleVote(option.id)}
              colors={colors}
              isDark={isDark}
            />
          );
        })}
      </View>
      {/* Poll Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Users size={14} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textMuted }]}>
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
        </View>
      </View>
    </View>
  );
});
interface PollOptionItemProps {
  option: PollOption;
  percentage: number;
  votes: number;
  isUserVote: boolean;
  isWinning: boolean;
  hasVoted: boolean;
  isVoting: boolean;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}
const PollOptionItem: React.FC<PollOptionItemProps> = ({
  option,
  percentage,
  votes,
  isUserVote,
  isWinning,
  hasVoted,
  isVoting,
  onPress,
  colors,
  isDark,
}) => {
  // Direct width calculation - no animation delays
  const progressWidth = hasVoted ? percentage : 0;

  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  const getOptionStyle = () => {
    if (!hasVoted) {
      return styles.optionButton;
    }
    let baseStyle = styles.optionResult;
    if (isUserVote) {
      baseStyle = { ...baseStyle, ...styles.userVoteOption };
    }
    if (isWinning) {
      baseStyle = { ...baseStyle, ...styles.winningOption };
    }
    return baseStyle;
  };
  const getTextColor = () => {
    if (isUserVote) return colors.primary;
    if (isWinning && hasVoted) return colors.info;
    return colors.text;
  };
  return (
    <TouchableOpacity
      style={getOptionStyle()}
      onPress={onPress}
      disabled={hasVoted || isVoting}
      activeOpacity={hasVoted ? 1 : 0.7}
    >
      {/* Progress Bar (only shown after voting) */}
      {hasVoted && (
        <View style={[styles.progressBar, { width: `${progressWidth}%` }]} />
      )}
      {/* Option Content */}
      <View style={styles.optionContent}>
        <View style={styles.optionLeft}>
          <Text style={[styles.optionText, { color: getTextColor() }]}>
            {option.text}
          </Text>
          {isUserVote && (
            <Text style={[styles.userVoteLabel, { color: colors.primary }]}>Your vote</Text>
          )}
        </View>
        {hasVoted && (
          <View style={styles.optionRight}>
            <Text style={[styles.percentageText, { color: getTextColor() }]}>
              {percentage}%
            </Text>
            <Text style={[styles.votesText, { color: colors.textMuted }]}>
              {votes} {votes === 1 ? 'vote' : 'votes'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
// Create dynamic styles function
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  question: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  optionResult: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 25,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 44,
  },
  userVoteOption: {
    backgroundColor: colors.primary + '10',
  },
  winningOption: {
    backgroundColor: colors.info + '10',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary + '30',
    borderRadius: 25,
    marginLeft: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
    padding: 14,
  },
  optionLeft: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  userVoteLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
  },
  votesText: {
    fontSize: 11,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
export default PollComponent;
