import AsyncStorage from '@react-native-async-storage/async-storage';
const POLL_VOTES_KEY = '@poll_votes';
export interface PollVoteData {
  pollId: string;
  optionId: string;
  votedAt: string;
}
class PollVoteStorageService {
  // Get all voted polls for the current user
  async getVotedPolls(): Promise<Set<string>> {
    try {
      const votesJson = await AsyncStorage.getItem(POLL_VOTES_KEY);
      if (!votesJson) return new Set();
      const votes: PollVoteData[] = JSON.parse(votesJson);
      return new Set(votes.map(vote => vote.pollId));
    } catch (error) {
      return new Set();
    }
  }
  // Check if user has already voted on a specific poll
  async hasVotedOnPoll(pollId: string): Promise<boolean> {
    try {
      const votedPolls = await this.getVotedPolls();
      return votedPolls.has(pollId);
    } catch (error) {
      return false;
    }
  }
  // Get user's vote for a specific poll
  async getUserVoteForPoll(pollId: string): Promise<string | null> {
    try {
      const votesJson = await AsyncStorage.getItem(POLL_VOTES_KEY);
      if (!votesJson) return null;
      const votes: PollVoteData[] = JSON.parse(votesJson);
      const vote = votes.find(v => v.pollId === pollId);
      return vote ? vote.optionId : null;
    } catch (error) {
      return null;
    }
  }
  // Save a poll vote
  async savePollVote(pollId: string, optionId: string): Promise<void> {
    try {
      const votesJson = await AsyncStorage.getItem(POLL_VOTES_KEY);
      let votes: PollVoteData[] = votesJson ? JSON.parse(votesJson) : [];
      // Remove any existing vote for this poll (in case user changes vote)
      votes = votes.filter(vote => vote.pollId !== pollId);
      // Add the new vote
      votes.push({
        pollId,
        optionId,
        votedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes));
      } catch (error) {
      throw error;
    }
  }
  // Clear all poll votes (useful for logout)
  async clearAllVotes(): Promise<void> {
    try {
      await AsyncStorage.removeItem(POLL_VOTES_KEY);
      } catch (error) {
      }
  }
  // Get all vote data (for debugging or export)
  async getAllVoteData(): Promise<PollVoteData[]> {
    try {
      const votesJson = await AsyncStorage.getItem(POLL_VOTES_KEY);
      return votesJson ? JSON.parse(votesJson) : [];
    } catch (error) {
      return [];
    }
  }
}
export const pollVoteStorage = new PollVoteStorageService();
