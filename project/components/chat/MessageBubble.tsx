import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

interface MessageBubbleProps {
  message: any;
  isUser: boolean;
}

export default function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const renderMessageContent = () => {
    const content = message.text || message.content || '';
    const mentions = message.mentions || [];

    if (mentions.length === 0) {
      return <Text style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>{content}</Text>;
    }

    // Highlight mentions
    const parts = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>
            {content.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Add mention with highlight
      const isMentioningMe = username === user?.username;
      parts.push(
        <Text
          key={`mention-${match.index}`}
          style={[
            styles.messageText,
            styles.mention,
            {
              color: isUser ? '#fff' : colors.primary,
              backgroundColor: isMentioningMe ? (isUser ? 'rgba(255,255,255,0.2)' : 'rgba(59,143,232,0.1)') : 'transparent',
              fontWeight: isMentioningMe ? '700' : '600',
            },
          ]}
        >
          @{username}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <Text key={`text-${lastIndex}`} style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>
          {content.substring(lastIndex)}
        </Text>
      );
    }

    return <Text>{parts}</Text>;
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userMessage : styles.otherMessage,
        { backgroundColor: isUser ? colors.primary : colors.card },
      ]}
    >
      {!isUser && message.sender && (
        <Text style={[styles.senderName, { color: colors.primary }]}>
          {message.sender.username}
        </Text>
      )}
      {renderMessageContent()}
      <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  mention: {
    fontWeight: '600',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
