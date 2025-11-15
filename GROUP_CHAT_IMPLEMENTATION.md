# Group Chat Implementation Guide

## Overview
Complete implementation of group chat with admin functionality, mentions, and notifications.

## ✅ Backend Implementation

### 1. Database Schema Updates

**File**: `backend/prisma/schema.prisma`

Added:
- `mentions` field to Message model (String array)
- New notification types: `MENTION`, `GROUP_INVITE`

**Migration**: `backend/migrations/add_mentions_support.sql`

Run migration:
```bash
cd backend
npx prisma migrate dev --name add_mentions_support
npx prisma generate
```

### 2. Admin Permissions Middleware

**File**: `backend/middleware/groupAdmin.js`

- `requireGroupAdmin`: Middleware that checks if user is group admin
- `isGroupAdmin`: Helper function to check admin status

**Usage**: Applied to all group modification routes

### 3. Updated Routes

**File**: `backend/routes/groups.js`

Protected routes (admin only):
- `POST /:groupId/members` - Add member
- `DELETE /:groupId/members/:userId` - Remove member
- `PUT /:groupId/avatar` - Update avatar
- `PUT /:groupId/name` - Update name
- `PUT /:groupId/description` - Update description

### 4. Mention Detection & Notifications

**File**: `backend/services/chatService.js`

When a message is sent:
1. Parse mentions using regex: `/@(\w+)/g`
2. Store mentions in database
3. Create in-app notifications for mentioned users
4. Send FCM push notifications

**File**: `backend/services/fcmService.js`

New function: `sendMentionNotification()`
- Sends push notification when user is mentioned
- Includes message preview
- Opens chat when tapped

### 5. Socket.IO Updates

**File**: `backend/services/socketService.js`

- Messages now include `mentions` array
- Frontend can highlight mentions in real-time

## ✅ Frontend Implementation

### 1. Group Info Modal with Admin Controls

**File**: `project/components/chat/GroupInfoModal.tsx`

Features:
- View/edit group name, description, avatar
- Member list with admin badges
- Remove members (admin only)
- Add members button (admin only)
- Permission checks before showing edit controls

Usage:
```tsx
import GroupInfoModal from '@/components/chat/GroupInfoModal';

<GroupInfoModal
  visible={showInfo}
  onClose={() => setShowInfo(false)}
  groupId={chatId}
  groupData={groupData}
  onUpdate={refreshGroupData}
/>
```

### 2. Message Bubble with Mention Highlighting

**File**: `project/components/chat/MessageBubble.tsx`

Features:
- Detects @mentions in message text
- Highlights mentions with special styling
- Bold + background for mentions of current user
- Different colors for user vs other messages

Usage:
```tsx
import MessageBubble from '@/components/chat/MessageBubble';

<MessageBubble message={message} isUser={isUser} />
```

### 3. API Service Methods

**File**: `project/lib/api.ts`

Already implemented:
```typescript
// Group management
getUserGroups()
createGroup(name, description, memberIds, iconUrl)
getGroupDetails(groupId)

// Admin operations
updateGroupName(groupId, name)
updateGroupDescription(groupId, description)
updateGroupAvatar(groupId, avatarUrl)
addGroupMember(groupId, userId)
removeGroupMember(groupId, userId)
```

### 4. Notification Handling

**File**: `backend/services/notificationService.js`

Notification types:
- `MENTION` - When user is mentioned in group chat
- `MESSAGE` - Regular group message
- `GROUP_INVITE` - When added to group

In-app notifications stored in database with:
- `userId` - Recipient
- `fromUserId` - Sender
- `type` - Notification type
- `message` - Notification text
- `read` - Read status

## 🔧 Implementation Steps

### Step 1: Run Database Migration

```bash
cd backend
psql $DATABASE_URL -f migrations/add_mentions_support.sql
npx prisma generate
npm run dev
```

### Step 2: Update Group Chat Screen

Add group info button to chat header:

```tsx
// In your ChatScreen component
import GroupInfoModal from '@/components/chat/GroupInfoModal';

const [showGroupInfo, setShowGroupInfo] = useState(false);

// In header
{chatData.isGroup && (
  <TouchableOpacity onPress={() => setShowGroupInfo(true)}>
    <Ionicons name="information-circle" size={24} color={colors.text} />
  </TouchableOpacity>
)}

// Add modal
<GroupInfoModal
  visible={showGroupInfo}
  onClose={() => setShowGroupInfo(false)}
  groupId={chatData.id}
  groupData={chatData}
  onUpdate={loadChatData}
/>
```

### Step 3: Update Message Rendering

Replace your message rendering with MessageBubble:

```tsx
import MessageBubble from '@/components/chat/MessageBubble';

// In your FlatList renderItem
<MessageBubble 
  message={item} 
  isUser={item.senderId === user?.id} 
/>
```

### Step 4: Add Mention Input Helper

Add mention autocomplete to your chat input:

```tsx
const [mentionQuery, setMentionQuery] = useState('');
const [showMentions, setShowMentions] = useState(false);

const handleTextChange = (text: string) => {
  setMessage(text);
  
  // Detect @ symbol for mentions
  const lastWord = text.split(' ').pop();
  if (lastWord?.startsWith('@')) {
    setMentionQuery(lastWord.substring(1));
    setShowMentions(true);
  } else {
    setShowMentions(false);
  }
};

const insertMention = (username: string) => {
  const words = message.split(' ');
  words[words.length - 1] = `@${username} `;
  setMessage(words.join(' '));
  setShowMentions(false);
};

// Show member list when typing @
{showMentions && (
  <FlatList
    data={members.filter(m => 
      m.user.username.toLowerCase().includes(mentionQuery.toLowerCase())
    )}
    renderItem={({ item }) => (
      <TouchableOpacity onPress={() => insertMention(item.user.username)}>
        <Text>{item.user.username}</Text>
      </TouchableOpacity>
    )}
  />
)}
```

### Step 5: Handle Notification Navigation

Update your notification handler to open chats:

```tsx
// In your notification handler
const handleNotificationPress = async (notification: any) => {
  if (notification.type === 'MENTION' || notification.type === 'MESSAGE') {
    const chatId = notification.data?.chatId;
    if (chatId) {
      router.push(`/groups/${chatId}`);
    }
  }
};
```

## 🎨 UI/UX Best Practices

### Admin Badge
Show admin badge next to group creator:
```tsx
{member.isAdmin && (
  <View style={styles.adminBadge}>
    <Text style={styles.adminText}>Admin</Text>
  </View>
)}
```

### Permission Checks
Always check before showing admin controls:
```tsx
const isAdmin = groupData.participants?.find(
  p => p.userId === user?.id
)?.isAdmin;

{isAdmin && (
  <TouchableOpacity onPress={handleEdit}>
    <Text>Edit</Text>
  </TouchableOpacity>
)}
```

### Mention Highlighting
Use different styles for mentions:
```tsx
const isMentioningMe = username === user?.username;

<Text style={[
  styles.mention,
  {
    backgroundColor: isMentioningMe ? 'rgba(59,143,232,0.2)' : 'transparent',
    fontWeight: isMentioningMe ? '700' : '600',
  }
]}>
  @{username}
</Text>
```

## 🔔 Notification Flow

### 1. Group Message Sent
```
User sends message
  ↓
Backend saves to database
  ↓
Socket.IO broadcasts to group members
  ↓
FCM sends push notifications to offline members
  ↓
In-app notification created in database
```

### 2. Mention Detected
```
Message contains @username
  ↓
Backend parses mentions
  ↓
Stores mentions array in message
  ↓
Creates MENTION notification
  ↓
Sends FCM push with "mentioned you"
  ↓
Frontend highlights mention in chat
```

### 3. Member Added
```
Admin adds member
  ↓
Backend validates admin permission
  ↓
Creates ChatParticipant record
  ↓
Sends GROUP_INVITE notification
  ↓
Socket.IO notifies new member
  ↓
Member sees group in their list
```

## 🔒 Security Considerations

### Backend Validation
- All group modification routes protected by `requireGroupAdmin` middleware
- Double-check admin status in service layer
- Validate user is group member before allowing actions

### Frontend Checks
- Hide admin controls from non-admins
- Disable buttons when not admin
- Show error messages for unauthorized actions

### Database Constraints
- `ChatParticipant.isAdmin` boolean flag
- `Chat.createdById` tracks group creator
- Unique constraint on `[chatId, userId]` prevents duplicates

## 📱 Testing Checklist

### Admin Functionality
- [ ] Only admin can edit group name
- [ ] Only admin can edit group description
- [ ] Only admin can change group avatar
- [ ] Only admin can add members
- [ ] Only admin can remove members
- [ ] Non-admin sees read-only view

### Mentions
- [ ] @username detected in messages
- [ ] Mentions highlighted in chat
- [ ] Mentioned user receives push notification
- [ ] Mentioned user receives in-app notification
- [ ] Mention notification opens correct chat
- [ ] Multiple mentions in one message work

### Notifications
- [ ] Group messages send push to all members
- [ ] Sender doesn't receive their own notification
- [ ] Notifications work when app is closed
- [ ] Notifications work when app is in background
- [ ] Tapping notification opens correct chat
- [ ] Notification badge updates correctly

### Permissions
- [ ] Backend rejects non-admin modifications
- [ ] Frontend hides admin controls from non-admins
- [ ] Error messages shown for unauthorized actions
- [ ] Group creator is automatically admin

## 🐛 Troubleshooting

### Mentions Not Working
1. Check database migration ran: `SELECT mentions FROM messages LIMIT 1;`
2. Verify regex in chatService.js: `/@(\w+)/g`
3. Check FCM service has `sendMentionNotification` function
4. Ensure frontend passes mentions in message object

### Admin Controls Not Showing
1. Verify `isAdmin` field in ChatParticipant
2. Check group creator has `isAdmin: true`
3. Ensure frontend checks `participant.isAdmin`
4. Verify middleware is applied to routes

### Notifications Not Received
1. Check FCM token is registered
2. Verify notification service creates records
3. Check socket connection is active
4. Ensure user has notification permissions
5. Test with app in foreground, background, and closed

### Permission Errors
1. Verify `requireGroupAdmin` middleware is applied
2. Check user is in group participants
3. Ensure `isAdmin` flag is set correctly
4. Test with different users (admin vs non-admin)

## 📚 Additional Resources

### Backend Files
- `backend/middleware/groupAdmin.js` - Admin permission checks
- `backend/services/chatService.js` - Message handling with mentions
- `backend/services/fcmService.js` - Push notifications
- `backend/services/notificationService.js` - In-app notifications
- `backend/services/socketService.js` - Real-time updates

### Frontend Files
- `project/components/chat/GroupInfoModal.tsx` - Group settings UI
- `project/components/chat/MessageBubble.tsx` - Message with mentions
- `project/lib/api.ts` - API service methods
- `project/app/groups/[id].tsx` - Group chat screen

### API Endpoints
```
GET    /api/groups                          - Get user's groups
POST   /api/groups                          - Create group
GET    /api/groups/:groupId                 - Get group details
POST   /api/groups/:groupId/members         - Add member (admin)
DELETE /api/groups/:groupId/members/:userId - Remove member (admin)
PUT    /api/groups/:groupId/name            - Update name (admin)
PUT    /api/groups/:groupId/description     - Update description (admin)
PUT    /api/groups/:groupId/avatar          - Update avatar (admin)
```

## 🚀 Deployment

### Backend
1. Run migrations on production database
2. Restart backend server
3. Verify FCM credentials are configured
4. Test with production FCM tokens

### Frontend
1. Update app version in `app.json`
2. Build new APK/IPA
3. Test on physical devices
4. Submit to app stores

## ✨ Future Enhancements

- [ ] Make other members admin
- [ ] Transfer group ownership
- [ ] Group member roles (admin, moderator, member)
- [ ] Mute group notifications
- [ ] Pin important messages
- [ ] Group invite links
- [ ] Group settings (who can send messages, add members, etc.)
- [ ] Message reactions in groups
- [ ] Reply to specific messages
- [ ] Forward messages to other groups
- [ ] Group analytics (most active members, etc.)
