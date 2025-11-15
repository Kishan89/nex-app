# Quick Start: Group Chat Implementation

## 🚀 5-Minute Setup

### Step 1: Run Database Migration (1 min)

```bash
cd backend
psql $DATABASE_URL -f migrations/add_mentions_support.sql
npx prisma generate
```

### Step 2: Restart Backend (30 sec)

```bash
npm run dev
```

### Step 3: Update Your Chat Screen (2 min)

**File**: `project/app/groups/[id].tsx` or your chat screen

```tsx
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupInfoModal from '@/components/chat/GroupInfoModal';
import MentionInput from '@/components/chat/MentionInput';
import MessageBubble from '@/components/chat/MessageBubble';
import { isGroupAdmin } from '@/lib/groupPermissions';

// Add state
const [showGroupInfo, setShowGroupInfo] = useState(false);
const [message, setMessage] = useState('');

// Check if user is admin
const isAdmin = isGroupAdmin(user?.id || '', chatData);

// In your header (add info button)
{chatData.isGroup && (
  <TouchableOpacity onPress={() => setShowGroupInfo(true)}>
    <Ionicons name="information-circle" size={24} color={colors.text} />
  </TouchableOpacity>
)}

// Replace your message input
<MentionInput
  value={message}
  onChangeText={setMessage}
  members={chatData.participants || []}
  placeholder="Type a message..."
  onSend={handleSend}
/>

// Replace your message rendering
<MessageBubble 
  message={item} 
  isUser={item.senderId === user?.id} 
/>

// Add modal at the end
<GroupInfoModal
  visible={showGroupInfo}
  onClose={() => setShowGroupInfo(false)}
  groupId={chatData.id}
  groupData={chatData}
  onUpdate={loadChatData}
/>
```

### Step 4: Test (1 min)

1. Open a group chat
2. Tap the info icon
3. Try editing (if admin) or view-only (if not admin)
4. Type `@username` to see mention autocomplete
5. Send a message with a mention
6. Check if mentioned user receives notification

## ✅ That's It!

Your group chat now has:
- ✅ Admin-only editing
- ✅ @mention autocomplete
- ✅ Mention highlighting
- ✅ Push notifications for mentions
- ✅ In-app notifications
- ✅ Member management

## 🎯 Key Features

### Admin Controls
- Edit group name, description, avatar
- Add/remove members
- View member list with admin badges

### Mentions
- Type `@` to see member list
- Tap to insert mention
- Mentions highlighted in chat
- Bold + background for your mentions
- Push notifications when mentioned

### Notifications
- Push notifications for all group messages
- Special notification for mentions
- In-app notification history
- Tap notification to open chat

## 📱 Usage Examples

### Check if User is Admin

```tsx
import { isGroupAdmin } from '@/lib/groupPermissions';

const isAdmin = isGroupAdmin(user?.id || '', groupData);

{isAdmin && (
  <TouchableOpacity onPress={handleEdit}>
    <Text>Edit Group</Text>
  </TouchableOpacity>
)}
```

### Add Member (Admin Only)

```tsx
import { apiService } from '@/lib/api';

const handleAddMember = async (userId: string) => {
  try {
    await apiService.addGroupMember(groupId, userId);
    Alert.alert('Success', 'Member added');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Remove Member (Admin Only)

```tsx
const handleRemoveMember = async (userId: string) => {
  try {
    await apiService.removeGroupMember(groupId, userId);
    Alert.alert('Success', 'Member removed');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Update Group Info (Admin Only)

```tsx
const handleUpdateName = async (newName: string) => {
  try {
    await apiService.updateGroupName(groupId, newName);
    Alert.alert('Success', 'Group name updated');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Send Message with Mention

```tsx
const handleSend = async () => {
  // Message automatically parsed for mentions by backend
  await sendMessage(message);
  setMessage('');
};
```

## 🔧 Customization

### Change Mention Color

**File**: `project/components/chat/MessageBubble.tsx`

```tsx
// Line ~45
color: isUser ? '#fff' : colors.primary, // Change colors.primary to your color
```

### Change Admin Badge Style

**File**: `project/components/chat/GroupInfoModal.tsx`

```tsx
// Line ~180
<Text style={[styles.adminBadge, { color: colors.primary }]}>
  Admin
</Text>
```

### Customize Mention Autocomplete

**File**: `project/components/chat/MentionInput.tsx`

```tsx
// Adjust maxHeight, styling, etc.
mentionList: {
  maxHeight: 200, // Change this
  borderRadius: 12,
  // Add your custom styles
}
```

## 🐛 Troubleshooting

### "Only group admins can..." Error
- Check if user is actually admin: `console.log(isGroupAdmin(user?.id, groupData))`
- Verify backend middleware is applied to routes
- Check database: `SELECT * FROM chat_participants WHERE "chatId" = 'xxx' AND "isAdmin" = true;`

### Mentions Not Highlighting
- Verify message has `mentions` array
- Check MessageBubble component is imported correctly
- Ensure regex matches your username format

### Notifications Not Received
- Check FCM token is registered
- Verify app has notification permissions
- Test with app in foreground, background, and closed
- Check backend logs for FCM errors

### Permission Denied on Backend
- Verify `requireGroupAdmin` middleware is on route
- Check user is in group participants
- Ensure `isAdmin` flag is set correctly

## 📚 Full Documentation

See `GROUP_CHAT_IMPLEMENTATION.md` for complete details on:
- Database schema
- API endpoints
- Security considerations
- Testing checklist
- Deployment guide

## 🎉 Next Steps

1. **Test thoroughly** with multiple users
2. **Customize UI** to match your app's design
3. **Add more features** like:
   - Group invite links
   - Message reactions
   - Reply to messages
   - Pin messages
   - Mute notifications
4. **Deploy** to production

## 💡 Pro Tips

- Always check permissions before showing UI controls
- Use optimistic updates for better UX
- Cache group data to reduce API calls
- Show loading states during operations
- Provide clear error messages
- Test with slow network conditions

## 🆘 Need Help?

Check these files:
- `GROUP_CHAT_IMPLEMENTATION.md` - Full implementation guide
- `backend/middleware/groupAdmin.js` - Admin permission logic
- `project/lib/groupPermissions.ts` - Frontend permission helpers
- `project/components/chat/GroupInfoModal.tsx` - Group settings UI
- `project/components/chat/MessageBubble.tsx` - Message with mentions
- `project/components/chat/MentionInput.tsx` - Mention autocomplete

## ✨ Features Included

✅ Admin-only group editing
✅ Member management (add/remove)
✅ @mention autocomplete
✅ Mention highlighting
✅ Push notifications
✅ In-app notifications
✅ Real-time updates via Socket.IO
✅ Permission checks (frontend + backend)
✅ Beautiful UI components
✅ Error handling
✅ Loading states
✅ Optimistic updates

Enjoy your new group chat features! 🎊
