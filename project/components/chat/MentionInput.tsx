import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface Member {
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  members: Member[];
  placeholder?: string;
  onSend?: () => void;
}

export default function MentionInput({
  value,
  onChangeText,
  members,
  placeholder = 'Type a message...',
  onSend,
}: MentionInputProps) {
  const { colors } = useTheme();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);

  useEffect(() => {
    // Detect @ symbol for mentions
    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord?.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.substring(1).toLowerCase();
      setMentionQuery(query);

      const filtered = members.filter((m) =>
        m.user.username.toLowerCase().includes(query)
      );
      setFilteredMembers(filtered);
      setShowMentions(filtered.length > 0);
    } else {
      setShowMentions(false);
      setFilteredMembers([]);
    }
  }, [value, members]);

  const insertMention = (username: string) => {
    const words = value.split(/\s/);
    words[words.length - 1] = `@${username}`;
    const newText = words.join(' ') + ' ';
    onChangeText(newText);
    setShowMentions(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Mention Suggestions */}
      {showMentions && (
        <View
          style={[
            styles.mentionList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mentionItem, { borderBottomColor: colors.border }]}
                onPress={() => insertMention(item.user.username)}
              >
                <Image
                  source={{
                    uri: item.user.avatar || 'https://via.placeholder.com/32',
                  }}
                  style={styles.mentionAvatar}
                />
                <Text style={[styles.mentionUsername, { color: colors.text }]}>
                  @{item.user.username}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.flatList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Text Input */}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={1000}
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  mentionList: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  flatList: {
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  mentionUsername: {
    fontSize: 16,
    fontWeight: '500',
  },
});
