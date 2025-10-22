import React from 'react';
import FastChatScreen from './FastChatScreen';
interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  lastSeenText?: string;
  userId?: string;
  username?: string;
}
interface ChatScreenProps {
  chatData: ChatData;
  onBack?: () => void;
  onUserProfile?: (userId: string) => void;
  forceInitialRefresh?: boolean;
}
// Wrapper component that redirects to FastChatScreen
const ChatScreen: React.FC<ChatScreenProps> = (props) => {
  // Remove forceInitialRefresh prop as FastChatScreen doesn't need it
  const { forceInitialRefresh, ...fastChatProps } = props;
  return <FastChatScreen {...fastChatProps} />;
};
export default ChatScreen;
