const LOCAL_CHAT_STORAGE_KEY = 'kebunkita_marketplace_demo_chats';
const LOCAL_TRADE_REQUEST_STORAGE_KEY = 'kebunkita_trade_requests';
const LEGACY_TRADE_REQUEST_STORAGE_KEY = 'kebunkita_marketplace_demo_trade_requests';

export function buildAvatar(name) {
  const initials = String(name || 'K')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || 'K')}&background=2f7445&color=ffffff&bold=true`;
}

export function formatChatTime(value) {
  if (!value) return 'Now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function buildChatRoomId(buyerId, listingId) {
  return `market-${buyerId}-${listingId}`;
}

export function splitPreferredItems(requestedItem) {
  return String(requestedItem || '')
    .split(/,|\/| or /i)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readChatStore() {
  if (typeof window === 'undefined') {
    return { rooms: {}, messages: {} };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_STORAGE_KEY);
    if (!raw) return { rooms: {}, messages: {} };
    const parsed = JSON.parse(raw);
    return {
      rooms: parsed.rooms || {},
      messages: parsed.messages || {},
    };
  } catch {
    return { rooms: {}, messages: {} };
  }
}

export function writeChatStore(store) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_CHAT_STORAGE_KEY, JSON.stringify(store));
}

export function mapStoredChatRoom(room, viewerId) {
  const isOwnerView = viewerId === room.ownerId || viewerId === room.sellerId;
  return {
    ...room,
    otherUserName: isOwnerView ? room.buyerName : room.ownerName,
    otherUserId: isOwnerView ? room.buyerId : room.ownerId,
    otherUserAvatar: isOwnerView ? room.buyerAvatar : room.ownerAvatar,
  };
}

export function createLocalChatRoom({ buyerId, buyerName, currentViewerId, listing }) {
  const store = readChatStore();
  const roomId = buildChatRoomId(buyerId, listing.id);
  const existing = store.rooms[roomId];
  if (existing) {
    return mapStoredChatRoom(existing, currentViewerId);
  }

  const ownerId = listing.ownerId || `seller-${listing.id}`;
  const room = {
    id: roomId,
    marketplaceItemId: listing.id,
    buyerId,
    buyerName,
    buyerAvatar: buildAvatar(buyerName),
    sellerId: ownerId,
    ownerId,
    itemImage: listing.image,
    itemName: listing.itemName,
    quantity: listing.quantity || '',
    listingType: listing.listingType,
    ownerName: listing.ownerName,
    ownerAvatar: buildAvatar(listing.ownerName),
    requestedItem: listing.requestedItem || '',
    communityName: listing.communityName || 'Tanjung Malim',
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.rooms[roomId] = room;
  store.messages[roomId] = store.messages[roomId] || [];
  writeChatStore(store);
  return mapStoredChatRoom(room, currentViewerId);
}

export function loadChatRoomsFromStorage(userId) {
  const store = readChatStore();
  return Object.values(store.rooms)
    .filter((room) => room.buyerId === userId || room.sellerId === userId || room.ownerId === userId)
    .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
    .map((room) => {
      const messages = store.messages[room.id] || [];
      const lastMessage = messages[messages.length - 1];
      return {
        ...mapStoredChatRoom(room, userId),
        lastMessage: lastMessage?.message || room.lastMessage || '',
        lastMessageTime: formatChatTime(lastMessage?.createdAt || room.updatedAt),
        unreadCount: 0,
      };
    });
}

export function loadChatMessagesFromStorage(userId, chatRoomId) {
  const store = readChatStore();
  return (store.messages[chatRoomId] || []).map((message) => ({
    ...message,
    isRead: message.senderId === userId ? true : Boolean(message.isRead),
    createdAtLabel: formatChatTime(message.createdAt),
  }));
}

export function appendLocalChatMessage(userId, chatRoomId, message) {
  const store = readChatStore();
  const room = store.rooms[chatRoomId];
  if (!room) {
    throw new Error('Chat room not found in local storage.');
  }

  store.messages[chatRoomId] = [...(store.messages[chatRoomId] || []), message];
  store.rooms[chatRoomId] = {
    ...room,
    lastMessage: message.message,
    lastMessageTime: formatChatTime(message.createdAt),
    unreadCount: message.senderId === userId ? 0 : 1,
    updatedAt: message.createdAt,
  };
  writeChatStore(store);
}

export function buildLocalMessage(senderId, message, options = {}) {
  return {
    id: `${senderId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId,
    message,
    isRead: Boolean(options.isRead),
    createdAt: new Date().toISOString(),
    messageType: options.messageType || 'text',
    tradeRequestId: options.tradeRequestId || '',
    actionLabel: options.actionLabel || '',
    actionTo: options.actionTo || '',
  };
}

export function readTradeRequestStore() {
  if (typeof window === 'undefined') {
    return { requests: {} };
  }

  try {
    const currentRaw = window.localStorage.getItem(LOCAL_TRADE_REQUEST_STORAGE_KEY);
    if (currentRaw) {
      const parsed = JSON.parse(currentRaw);
      return { requests: parsed.requests || {} };
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_TRADE_REQUEST_STORAGE_KEY);
    if (!legacyRaw) return { requests: {} };

    const legacyParsed = JSON.parse(legacyRaw);
    const migrated = { requests: legacyParsed.requests || {} };
    writeTradeRequestStore(migrated);
    return migrated;
  } catch {
    return { requests: {} };
  }
}

export function writeTradeRequestStore(store) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_TRADE_REQUEST_STORAGE_KEY, JSON.stringify(store));
}

export function createTradeRequest(payload) {
  const store = readTradeRequestStore();
  const request = {
    id: payload.id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chatRoomId: payload.chatRoomId,
    marketplaceItemId: payload.marketplaceItemId,
    requesterId: payload.requesterId,
    requesterName: payload.requesterName,
    ownerId: payload.ownerId,
    ownerName: payload.ownerName,
    requestedItemName: payload.requestedItemName,
    requestedItemQuantity: payload.requestedItemQuantity,
    offeredItemName: payload.offeredItemName,
    offeredItemQuantity: payload.offeredItemQuantity,
    message: payload.message || '',
    status: payload.status || 'pending',
    createdAt: payload.createdAt || new Date().toISOString(),
    requesterAvatar: payload.requesterAvatar || buildAvatar(payload.requesterName),
    itemImage: payload.itemImage || '',
    listingType: payload.listingType || 'Barter',
    communityName: payload.communityName || 'Tanjung Malim',
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
  store.requests[request.id] = request;
  writeTradeRequestStore(store);
  return request;
}

export function getTradeRequestById(tradeRequestId) {
  const store = readTradeRequestStore();
  return store.requests[tradeRequestId] || null;
}

export function loadIncomingRequestsFromStorage(userId) {
  const store = readTradeRequestStore();
  return Object.values(store.requests)
    .filter((requestItem) => requestItem.ownerId === userId)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

export function loadMyTradesFromStorage(userId) {
  const store = readTradeRequestStore();
  return Object.values(store.requests)
    .filter((requestItem) => requestItem.requesterId === userId)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

export function updateTradeRequestStatus(requestId, status) {
  const store = readTradeRequestStore();
  if (!store.requests[requestId]) {
    throw new Error('Trade request not found.');
  }

  store.requests[requestId] = {
    ...store.requests[requestId],
    status,
    updatedAt: new Date().toISOString(),
  };
  writeTradeRequestStore(store);
  return store.requests[requestId];
}
