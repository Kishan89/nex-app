// services/pushNotificationService.js
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

async function sendPushNotification(tokens = [], title, body, data = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    console.log('ℹ️ No tokens provided. Skipping notification.');
    return;
  }

  // Create messages for Expo push service
  const messages = [];
  const validTokens = [];
  const invalidTokens = [];
  
  for (const token of tokens) {
    // Check that all push tokens are valid Expo push tokens
    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Push token ${token} is not a valid Expo push token`);
      invalidTokens.push(token);
      continue;
    }

    validTokens.push(token);
    
    // Format title to show username if available
    let displayTitle = title;
    if (data.username) {
      displayTitle = data.username;
    }
    
    messages.push({
      to: token,
      sound: 'default',
      title: displayTitle,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'default',
      badge: 1,
      // Dark theme styling
      color: '#00d4ff',
      categoryId: 'social',
      subtitle: 'Nexeed',
    });
  }

  console.log(`📱 Sending push notifications to ${validTokens.length} devices`);
  console.log(`⚠️ Skipping ${invalidTokens.length} invalid tokens`);
  
  if (messages.length === 0) {
    console.log('⚠️ No valid tokens to send notifications to');
    return [];
  }

  // Send notifications in chunks
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('✅ Push notification tickets:', ticketChunk);
      
      // Check for errors in the tickets
      ticketChunk.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          console.error(`❌ Error sending to token: ${validTokens[index]}, error:`, ticket.message);
        }
      });
      
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('❌ Error sending push notification chunk:', error);
    }
  }

  return tickets;
}

module.exports = { sendPushNotification };