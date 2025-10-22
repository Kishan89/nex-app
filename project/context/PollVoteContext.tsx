import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
interface PollVoteData {
  hasVoted: boolean;
  optionId: string;
  votedAt: string;
}
interface PollVoteContextType {
  pollVotes: Record<string, PollVoteData>;
  setPollVote: (pollId: string, optionId: string) => void;
  getPollVote: (pollId: string) => PollVoteData | null;
  hasVotedOnPoll: (pollId: string) => boolean;
  getUserVoteForPoll: (pollId: string) => string | null;
  clearPollVote: (pollId: string) => void;
  syncPollVoteAcrossScreens: (pollId: string, optionId: string) => void;
}
const PollVoteContext = createContext<PollVoteContextType | undefined>(undefined);
const POLL_VOTES_STORAGE_KEY = '@nexeed_poll_votes';
export const PollVoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pollVotes, setPollVotes] = useState<Record<string, PollVoteData>>({});
  // Load poll votes from storage on app start
  useEffect(() => {
    loadPollVotes();
  }, []);
  const loadPollVotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(POLL_VOTES_STORAGE_KEY);
      if (stored) {
        const parsedVotes = JSON.parse(stored);
        setPollVotes(parsedVotes);
      }
    } catch (error) {
      }
  };
  const savePollVotes = async (votes: Record<string, PollVoteData>) => {
    try {
      await AsyncStorage.setItem(POLL_VOTES_STORAGE_KEY, JSON.stringify(votes));
    } catch (error) {
      }
  };
  const setPollVote = useCallback((pollId: string, optionId: string) => {
    const newVoteData: PollVoteData = {
      hasVoted: true,
      optionId,
      votedAt: new Date().toISOString(),
    };
    setPollVotes(prev => {
      const updated = { ...prev, [pollId]: newVoteData };
      savePollVotes(updated);
      return updated;
    });
  }, []);
  const getPollVote = useCallback((pollId: string): PollVoteData | null => {
    return pollVotes[pollId] || null;
  }, [pollVotes]);
  const hasVotedOnPoll = useCallback((pollId: string): boolean => {
    return pollVotes[pollId]?.hasVoted || false;
  }, [pollVotes]);
  const getUserVoteForPoll = useCallback((pollId: string): string | null => {
    return pollVotes[pollId]?.optionId || null;
  }, [pollVotes]);
  const clearPollVote = useCallback((pollId: string) => {
    setPollVotes(prev => {
      const updated = { ...prev };
      delete updated[pollId];
      savePollVotes(updated);
      return updated;
    });
  }, []);
  // Global sync function to update poll votes across all screens
  const syncPollVoteAcrossScreens = useCallback((pollId: string, optionId: string) => {
    setPollVote(pollId, optionId);
    // Emit custom event for other components to listen
    DeviceEventEmitter.emit('pollVoteSync', { pollId, optionId });
  }, [setPollVote]);
  const value: PollVoteContextType = {
    pollVotes,
    setPollVote,
    getPollVote,
    hasVotedOnPoll,
    getUserVoteForPoll,
    clearPollVote,
    syncPollVoteAcrossScreens,
  };
  return (
    <PollVoteContext.Provider value={value}>
      {children}
    </PollVoteContext.Provider>
  );
};
export const usePollVote = (): PollVoteContextType => {
  const context = useContext(PollVoteContext);
  if (!context) {
    throw new Error('usePollVote must be used within a PollVoteProvider');
  }
  return context;
};
export default PollVoteContext;
