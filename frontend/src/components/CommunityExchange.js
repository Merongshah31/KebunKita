import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../api/client';
import {
  appendLocalChatMessage,
  buildLocalMessage,
  createLocalChatRoom,
  getTradeRequestById,
  loadChatMessagesFromStorage,
  loadChatRoomsFromStorage,
  loadIncomingRequestsFromStorage,
  loadMyTradesFromStorage,
  splitPreferredItems,
  updateTradeRequestStatus,
} from '../utils/tradeDemo';
import '../styles/agents.css';

const blankPost = {
  type: 'plant update',
  caption: '',
};

const blankListing = {
  itemName: '',
  quantity: '',
  area: 'Tanjung Malim',
  listingType: 'Barter',
  requestedItem: '',
  image: '',
};

const postTypeOptions = ['plant update', 'harvest update', 'ask question', 'barter offer', 'sell offer', 'donation offer'];
const listingTypeOptions = ['All', 'Barter', 'Sell', 'Donate'];
const communityTabs = ['feed', 'marketplace', 'chats'];
const CHAT_TRIGGER_PATTERN = /\b(barter|trade|exchange|tukar|kangkung|offer)\b/i;
const KANGKUNG_PATTERN = /\bkangkung\b/i;

export default function CommunityExchange({ userId, onError }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const chatParam = searchParams.get('chat');
  const [activeTab, setActiveTab] = useState(communityTabs.includes(tabParam) ? tabParam : 'feed');
  const [listingFilter, setListingFilter] = useState('All');
  const [posts, setPosts] = useState([]);
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState({ id: userId, fullName: 'Guest Grower' });
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [feedLoading, setFeedLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRoomLoading, setChatRoomLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [postForm, setPostForm] = useState(blankPost);
  const [listingForm, setListingForm] = useState(blankListing);
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const filteredListings = listingFilter === 'All'
    ? listings
    : listings.filter((listing) => listing.listingType === listingFilter);

  const activeChatSummary = useMemo(
    () => chatRooms.find((room) => room.id === activeChatRoom?.id) || activeChatRoom,
    [chatRooms, activeChatRoom]
  );

  const latestActiveTrade = useMemo(() => {
    if (!activeChatSummary?.id) return null;
    return [...incomingRequests, ...myTrades]
      .filter((requestItem) => requestItem.chatRoomId === activeChatSummary.id)
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))[0] || null;
  }, [activeChatSummary?.id, incomingRequests, myTrades]);

  const barterCta = useMemo(() => {
    if (!activeChatSummary || userId === activeChatSummary.ownerId) return null;

    if (latestActiveTrade?.status === 'accepted') {
      return {
        label: 'View Trade Summary',
        to: `/barter/success/${latestActiveTrade.id}`,
      };
    }

    const latestUserTriggerMessage = [...chatMessages]
      .reverse()
      .find((message) => message.senderId === userId && CHAT_TRIGGER_PATTERN.test(message.message || ''));

    if (latestUserTriggerMessage) {
      return {
        label: KANGKUNG_PATTERN.test(latestUserTriggerMessage.message || '') ? 'Offer Kangkung' : 'Make Barter Offer',
        to: `/barter/${activeChatSummary.marketplaceItemId}`,
      };
    }

    return {
      label: 'Make Barter Offer',
      to: `/barter/${activeChatSummary.marketplaceItemId}`,
    };
  }, [activeChatSummary, chatMessages, latestActiveTrade, userId]);

  const pendingIncomingCount = incomingRequests.filter((request) => request.status === 'pending').length;

  const setTab = useCallback((nextTab) => {
    setActiveTab(nextTab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', nextTab);
      if (nextTab !== 'chats') {
        next.delete('chat');
      }
      return next;
    });
  }, [setSearchParams]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await apiService.getUser(userId);
      setCurrentUser({
        id: userId,
        fullName: response.data?.full_name || 'Guest Grower',
      });
    } catch {
      setCurrentUser({ id: userId, fullName: 'Guest Grower' });
    }
  }, [userId]);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const response = await apiService.listCommunityFeed();
      setPosts(Array.isArray(response.data) ? response.data.map(mapFeedPost) : []);
    } catch (error) {
      setPosts([]);
      const message = error.debugInfo?.message || error.message;
      setFeedError(message);
      onError(`Load feed failed: ${message}`);
    } finally {
      setFeedLoading(false);
    }
  }, [onError]);

  const fetchMarketplace = useCallback(async () => {
    setMarketLoading(true);
    setMarketError('');
    try {
      const response = await apiService.listMarketplace();
      setListings(Array.isArray(response.data) ? response.data.map(mapMarketplaceListing) : []);
    } catch (error) {
      setListings([]);
      const message = error.debugInfo?.message || error.message;
      setMarketError(message);
      onError(`Load marketplace failed: ${message}`);
    } finally {
      setMarketLoading(false);
    }
  }, [onError]);

  const fetchTrades = useCallback(() => {
    try {
      setIncomingRequests(loadIncomingRequestsFromStorage(userId));
      setMyTrades(loadMyTradesFromStorage(userId));
    } catch (error) {
      setIncomingRequests([]);
      setMyTrades([]);
      onError(`Load trade requests failed: ${error.message}`);
    }
  }, [onError, userId]);

  const fetchChatRooms = useCallback(() => {
    setRoomsLoading(true);
    setChatError('');
    try {
      const rooms = loadChatRoomsFromStorage(userId);
      setChatRooms(rooms);
      const wantedChatId = chatParam || activeChatRoom?.id;
      if (wantedChatId) {
        const freshActiveRoom = rooms.find((room) => room.id === wantedChatId) || null;
        setActiveChatRoom(freshActiveRoom);
      }
    } catch (error) {
      setChatRooms([]);
      setChatError(`Chat loading failed: ${error.message}`);
      onError(`Load chat rooms failed: ${error.message}`);
    } finally {
      setRoomsLoading(false);
    }
  }, [activeChatRoom?.id, chatParam, onError, userId]);

  useEffect(() => {
    fetchCurrentUser();
    fetchFeed();
    fetchMarketplace();
    fetchTrades();
    fetchChatRooms();
  }, [fetchCurrentUser, fetchFeed, fetchMarketplace, fetchTrades, fetchChatRooms]);

  useEffect(() => {
    if (communityTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [activeTab, tabParam]);

  useEffect(() => {
    if (activeTab === 'feed') fetchFeed();
    if (activeTab === 'marketplace') fetchMarketplace();
    if (activeTab === 'chats') {
      fetchTrades();
      fetchChatRooms();
    }
  }, [activeTab, fetchChatRooms, fetchFeed, fetchMarketplace, fetchTrades]);

  useEffect(() => {
    if (!activeChatSummary?.id) {
      setChatMessages([]);
      return;
    }

    setChatRoomLoading(true);
    setChatError('');
    try {
      setChatMessages(loadChatMessagesFromStorage(userId, activeChatSummary.id));
    } catch (error) {
      setChatMessages([]);
      setChatError(`Chat loading failed: ${error.message}`);
    } finally {
      setChatRoomLoading(false);
    }
  }, [activeChatSummary?.id, userId]);

  const updatePostForm = (field, value) => {
    setPostForm((current) => ({ ...current, [field]: value }));
  };

  const updateListingForm = (field, value) => {
    setListingForm((current) => ({ ...current, [field]: value }));
  };

  const handlePostImageSelect = (event) => {
    const file = event.target.files?.[0];
    setPostImageFile(file || null);
    setPostImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!postForm.caption.trim()) {
      onError('Write a short caption before posting to the community feed.');
      return;
    }

    try {
      await apiService.createCommunityPost({
        user_id: userId,
        post_type: postForm.type,
        caption: postForm.caption,
        file: postImageFile || undefined,
      });
      await fetchFeed();
      setPostForm(blankPost);
      setPostImageFile(null);
      setPostImagePreview('');
      setShowPostForm(false);
      setActionMessage('Community post published to Supabase.');
    } catch (error) {
      onError(`Create post failed: ${error.debugInfo?.message || error.message}`);
    }
  };

  const handleAddListing = async (event) => {
    event.preventDefault();
    if (!listingForm.itemName.trim() || !listingForm.quantity.trim()) {
      onError('Add an item name and quantity before publishing the listing.');
      return;
    }

    try {
      setLoading(true);
      await apiService.createMarketplaceListing({
        user_id: userId,
        item_name: listingForm.itemName,
        quantity: listingForm.quantity,
        area: listingForm.area,
        listing_type: listingForm.listingType,
        requested_item: listingForm.listingType === 'Barter' ? listingForm.requestedItem : undefined,
        image_url: listingForm.image || undefined,
      });
      await fetchMarketplace();
      setListingForm(blankListing);
      setShowListingForm(false);
      setActionMessage('Marketplace listing published to Supabase.');
    } catch (error) {
      onError(`Add listing failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedAction = (label, itemName) => {
    setActionMessage(`${label} opened for ${itemName} in the community demo.`);
  };

  const handleOpenChat = async (listing, buyerId = userId, buyerName = currentUser.fullName) => {
    if (listing.listingType === 'Sell') {
      setActionMessage(`Chat is not available for ${listing.itemName} because this seller is currently offline.`);
      return;
    }

    try {
      setTab('chats');
      setChatLoading(true);
      setChatError('');
      const room = createLocalChatRoom({
        buyerId,
        buyerName,
        currentViewerId: userId,
        listing,
      });
      setActiveChatRoom(room);
      setChatMessages(loadChatMessagesFromStorage(userId, room.id));
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', 'chats');
        next.set('chat', room.id);
        return next;
      });
      fetchChatRooms();
      setActionMessage(`Chat opened for ${listing.itemName}.`);
    } catch (error) {
      const message = error.message;
      setChatError(`Chat setup failed: ${message}`);
      onError(`Chat setup failed: ${message}`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenBarter = (listing, chatRoomId = '') => {
    const room = chatRoomId
      ? activeChatSummary
      : createLocalChatRoom({
        buyerId: userId,
        buyerName: currentUser.fullName,
        currentViewerId: userId,
        listing,
      });

    navigate(`/barter/${listing.id}`, {
      state: {
        chatRoomId: chatRoomId || room.id,
        listing,
      },
    });
  };

  const handleIncomingRequestAction = (requestItem, status) => {
    const updatedRequest = updateTradeRequestStatus(requestItem.id, status);
    fetchTrades();
    const notification = status === 'accepted'
      ? `Trade request from ${requestItem.requesterName} accepted. Both growers can continue in chat.`
      : `Trade request from ${requestItem.requesterName} rejected.`;
    setActionMessage(notification);

    appendLocalChatMessage(
      userId,
      requestItem.chatRoomId,
      buildLocalMessage('system', status === 'accepted' ? 'Trade accepted.' : 'Trade rejected.', {
        isRead: true,
        messageType: 'system',
        tradeRequestId: requestItem.id,
        actionLabel: status === 'accepted' ? 'View Trade Summary' : '',
        actionTo: status === 'accepted' ? `/barter/success/${requestItem.id}` : '',
      })
    );

    if (status === 'accepted') {
      appendLocalChatMessage(
        userId,
        requestItem.chatRoomId,
        buildLocalMessage(requestItem.ownerId, 'Saya terima trade ini. Jom teruskan pertukaran.', { isRead: false })
      );
    }

    if (activeChatSummary?.id === requestItem.chatRoomId) {
      setChatMessages(loadChatMessagesFromStorage(userId, requestItem.chatRoomId));
    }
    fetchChatRooms();
    return updatedRequest;
  };

  const handleOpenTradeChat = async (requestItem) => {
    const listing = buildListingFromRequest(requestItem);
    await handleOpenChat(listing, requestItem.requesterId, requestItem.requesterName);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!activeChatSummary?.id || !chatDraft.trim()) return;

    try {
      setChatLoading(true);
      setChatError('');
      const userMessageText = chatDraft.trim();
      appendLocalChatMessage(userId, activeChatSummary.id, buildLocalMessage(userId, userMessageText, { isRead: true }));

      if (userId !== activeChatSummary.ownerId) {
        const response = await apiService.getMarketplaceChatReply({
          chatRoomId: activeChatSummary.id,
          ownerName: activeChatSummary.ownerName,
          itemName: activeChatSummary.itemName,
          quantity: activeChatSummary.quantity,
          listingType: activeChatSummary.listingType,
          preferredItems: splitPreferredItems(activeChatSummary.requestedItem),
          userMessage: userMessageText,
        });

        appendLocalChatMessage(
          userId,
          activeChatSummary.id,
          buildLocalMessage(activeChatSummary.ownerId || activeChatSummary.sellerId || 'owner', response.data.reply, { isRead: false })
        );
      }

      setChatDraft('');
      setChatMessages(loadChatMessagesFromStorage(userId, activeChatSummary.id));
      fetchChatRooms();
    } catch (error) {
      const message = error.debugInfo?.message || error.message;
      setChatError(`Message send failed: ${message}`);
      onError(`Message send failed: ${message}`);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <article className="agent-panel community-module">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">Community interaction</span>
          <h3>Community</h3>
          <p className="agent-subtitle">
            Follow neighborhood growing activity, share updates, browse local listings, and chat directly about marketplace harvests.
          </p>
        </div>
        <span className="agent-badge">Feed + Marketplace + Chat</span>
      </div>

      <div className="community-tabs" role="tablist" aria-label="Community module views">
        {communityTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setTab(tab)}
          >
            {tab === 'feed' ? 'Feed' : tab === 'marketplace' ? 'Marketplace' : `Chats${pendingIncomingCount ? ` (${pendingIncomingCount})` : ''}`}
          </button>
        ))}
      </div>

      {actionMessage && (
        <div className="community-inline-note">
          <strong>Live demo</strong>
          <span>{actionMessage}</span>
        </div>
      )}

      {activeTab === 'feed' && (
        <>
          <div className="section-head">
            <h4>Community Feed</h4>
            <button className="secondary-button" type="button" onClick={() => setShowPostForm((value) => !value)}>
              {showPostForm ? 'Close' : 'Create Post'}
            </button>
          </div>

          {showPostForm && (
            <form className="community-create-form" onSubmit={handleCreatePost}>
              <label>
                Post Type
                <select value={postForm.type} onChange={(event) => updatePostForm('type', event.target.value)}>
                  {postTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="image-upload-card community-upload-card">
                {postImagePreview ? (
                  <img src={postImagePreview} alt="Post preview" />
                ) : (
                  <span>Upload post image</span>
                )}
                <input type="file" accept="image/*" onChange={handlePostImageSelect} />
              </label>
              <label className="span-two">
                Caption
                <textarea
                  value={postForm.caption}
                  onChange={(event) => updatePostForm('caption', event.target.value)}
                  placeholder="Share your plant progress, harvest, question, or offer."
                />
              </label>
              <button className="primary-button" type="submit">Publish Post</button>
            </form>
          )}

          <div className="community-feed-list">
            {feedLoading ? (
              <div className="community-chat-empty">
                <strong>Loading feed...</strong>
                <span>Fetching live community posts from the database.</span>
              </div>
            ) : feedError ? (
              <div className="community-chat-empty">
                <strong>Could not load feed.</strong>
                <span>{feedError}</span>
              </div>
            ) : posts.length ? posts.map((post) => (
              <article className="community-post-card" key={post.id}>
                <div className="post-head">
                  <img src={post.avatar} alt={post.userName} />
                  <div>
                    <strong>{post.userName}</strong>
                    <span>{post.communityName}</span>
                  </div>
                  <div className="post-meta">
                    <span className="post-type-pill">{post.type}</span>
                    <small>{post.timestamp}</small>
                  </div>
                </div>

                <img className="post-image" src={post.image} alt={post.type} />
                <p className="post-caption">{post.caption}</p>

                <div className="post-actions">
                  <button type="button" onClick={() => handleFeedAction('Like', post.userName)}>
                    Like {post.likes}
                  </button>
                  <button type="button" onClick={() => handleFeedAction('Comment', post.userName)}>
                    Comment {post.comments}
                  </button>
                  <button type="button" onClick={() => handleFeedAction('Request Trade', post.userName)}>
                    Request Trade
                  </button>
                </div>
              </article>
            )) : (
              <div className="community-chat-empty">
                <strong>No community posts yet.</strong>
                <span>Publish the first live post from Supabase to start the feed.</span>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'marketplace' && (
        <>
          <div className="section-head">
            <div className="market-filter-row">
              <h4>Marketplace</h4>
              <div className="community-filter-group">
                {listingTypeOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={listingFilter === option ? 'active' : ''}
                    onClick={() => setListingFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button className="secondary-button" type="button" onClick={() => setShowListingForm((value) => !value)}>
              {showListingForm ? 'Close' : 'Add Listing'}
            </button>
          </div>

          {showListingForm && (
            <form className="community-create-form" onSubmit={handleAddListing}>
              <label>
                Item Name
                <input
                  value={listingForm.itemName}
                  onChange={(event) => updateListingForm('itemName', event.target.value)}
                  placeholder="Fresh harvest listing"
                />
              </label>
              <label>
                Quantity
                <input
                  value={listingForm.quantity}
                  onChange={(event) => updateListingForm('quantity', event.target.value)}
                  placeholder="500g"
                />
              </label>
              <label>
                Area
                <input
                  value={listingForm.area}
                  onChange={(event) => updateListingForm('area', event.target.value)}
                  placeholder="Tanjung Malim"
                />
              </label>
              <label>
                Listing Type
                <select
                  value={listingForm.listingType}
                  onChange={(event) => updateListingForm('listingType', event.target.value)}
                >
                  <option>Barter</option>
                  <option>Sell</option>
                  <option>Donate</option>
                </select>
              </label>
              <label className={listingForm.listingType === 'Barter' ? '' : 'is-hidden'}>
                Requested Item
                <input
                  value={listingForm.requestedItem}
                  onChange={(event) => updateListingForm('requestedItem', event.target.value)}
                  placeholder="Spinach, kangkung, herbs"
                />
              </label>
              <label className="span-two">
                Image URL
                <input
                  value={listingForm.image}
                  onChange={(event) => updateListingForm('image', event.target.value)}
                  placeholder="Optional image URL"
                />
              </label>
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          )}

          <div className="community-market-grid">
            {marketLoading ? (
              <div className="community-chat-empty">
                <strong>Loading marketplace...</strong>
                <span>Fetching live listings from the database.</span>
              </div>
            ) : marketError ? (
              <div className="community-chat-empty">
                <strong>Could not load marketplace.</strong>
                <span>{marketError}</span>
              </div>
            ) : filteredListings.length ? filteredListings.map((listing) => (
              <article className="marketplace-card" key={listing.id}>
                <img src={listing.image} alt={listing.itemName} />
                <div className="marketplace-card-body">
                  <div className="marketplace-card-head">
                    <div>
                      <strong>{listing.itemName}</strong>
                      <span>{listing.ownerName}</span>
                    </div>
                    <span className={`listing-type-pill ${listing.listingType.toLowerCase()}`}>
                      {listing.listingType}
                    </span>
                  </div>
                  <div className="marketplace-meta">
                    <span>{listing.area}</span>
                    <span>{listing.distance}</span>
                    <span>{listing.quantity}</span>
                    {listing.listingType === 'Barter' && listing.requestedItem ? (
                      <span>Wants: {listing.requestedItem}</span>
                    ) : (
                      <span>{listing.listingType === 'Donate' ? 'Free community share' : 'Direct local exchange'}</span>
                    )}
                  </div>
                  <div className="marketplace-actions">
                    <button type="button" onClick={() => handleFeedAction('View detail', listing.itemName)}>
                      View Detail
                    </button>
                    <button type="button" onClick={() => handleOpenBarter(listing)}>
                      Request
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenChat(listing)}
                      disabled={listing.listingType === 'Sell'}
                      title={listing.listingType === 'Sell' ? 'Seller chat is offline for this demo listing.' : ''}
                    >
                      {listing.listingType === 'Sell' ? 'Offline' : 'Chat'}
                    </button>
                  </div>
                </div>
              </article>
            )) : (
              <div className="community-chat-empty">
                <strong>No marketplace listings found.</strong>
                <span>Add a listing in Supabase or publish one here to see live marketplace data.</span>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'chats' && (
        <section className="community-chat-layout">
          <div className="community-chat-list-panel">
            <div className="section-head">
              <h4>Incoming Requests</h4>
              <span className="chat-live-indicator">{pendingIncomingCount} pending</span>
            </div>

            {incomingRequests.length ? (
              <div className="incoming-requests-list">
                {incomingRequests.map((requestItem) => (
                  <article className="trade-request-card" key={requestItem.id}>
                    <div className="trade-request-head">
                      <img src={requestItem.requesterAvatar} alt={requestItem.requesterName} />
                      <div>
                        <strong>{requestItem.requesterName}</strong>
                        <span>{requestItem.requestedItemName} for {requestItem.offeredItemName}</span>
                      </div>
                      <small className={`trade-request-status ${requestItem.status}`}>{requestItem.status}</small>
                    </div>
                    <p>{requestItem.message || 'No extra message provided.'}</p>
                    <div className="trade-request-meta">
                      <span>Requested item: {requestItem.requestedItemQuantity} {requestItem.requestedItemName}</span>
                      <span>Offered item: {requestItem.offeredItemQuantity} {requestItem.offeredItemName}</span>
                    </div>
                    <div className="marketplace-actions">
                      <button type="button" onClick={() => handleIncomingRequestAction(requestItem, 'accepted')} disabled={requestItem.status !== 'pending'}>
                        Accept
                      </button>
                      <button type="button" onClick={() => handleIncomingRequestAction(requestItem, 'rejected')} disabled={requestItem.status !== 'pending'}>
                        Reject
                      </button>
                      <button type="button" onClick={() => handleOpenTradeChat(requestItem)}>
                        Chat
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="community-chat-empty">
                <strong>No incoming requests yet.</strong>
                <span>Trade requests for your listings will appear here.</span>
              </div>
            )}

            <div className="section-head">
              <h4>My Trades</h4>
              <span className="chat-live-indicator">{myTrades.length} requests</span>
            </div>

            {myTrades.length ? (
              <div className="incoming-requests-list">
                {myTrades.map((trade) => (
                  <article className="trade-request-card" key={trade.id}>
                    <div className="trade-request-head">
                      <img src={trade.requesterAvatar} alt={trade.requesterName} />
                      <div>
                        <strong>{trade.ownerName}</strong>
                        <span>{trade.offeredItemName} for {trade.requestedItemName}</span>
                      </div>
                      <small className={`trade-request-status ${trade.status}`}>{trade.status}</small>
                    </div>
                    <div className="trade-request-meta">
                      <span>You give: {trade.offeredItemQuantity} {trade.offeredItemName}</span>
                      <span>You get: {trade.requestedItemQuantity} {trade.requestedItemName}</span>
                    </div>
                    <div className="marketplace-actions">
                      <button type="button" onClick={() => handleOpenTradeChat(trade)}>
                        Chat
                      </button>
                      <button type="button" onClick={() => navigate(`/barter/success/${trade.id}`)}>
                        View Summary
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="community-chat-empty">
                <strong>No trade requests sent yet.</strong>
                <span>Start from marketplace chat, then make a barter offer to populate this section.</span>
              </div>
            )}

            <div className="section-head">
              <h4>Marketplace Chats</h4>
              <span className="chat-live-indicator">Demo chat memory</span>
            </div>
            {roomsLoading ? (
              <div className="community-chat-empty">Loading marketplace chats...</div>
            ) : chatLoading && !chatRooms.length ? (
              <div className="community-chat-empty">Opening marketplace chat...</div>
            ) : chatRooms.length ? (
              <div className="community-chat-list">
                {chatRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={`chat-room-preview ${activeChatSummary?.id === room.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChatRoom(room);
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        next.set('tab', 'chats');
                        next.set('chat', room.id);
                        return next;
                      });
                    }}
                  >
                    <img src={room.itemImage} alt={room.itemName} />
                    <div className="chat-room-preview-copy">
                      <div className="chat-room-preview-head">
                        <strong>{room.itemName}</strong>
                        <small>{room.lastMessageTime || 'New'}</small>
                      </div>
                      <span>{room.otherUserName}</span>
                      <p>{room.lastMessage || 'Start a conversation about this harvest.'}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="community-chat-empty">
                <strong>No marketplace chats yet.</strong>
                <span>Start a conversation about this harvest.</span>
              </div>
            )}
          </div>

          <div className="community-chat-room-panel">
            {activeChatSummary ? (
              <>
                <header className="chat-room-header">
                  <img src={activeChatSummary.itemImage} alt={activeChatSummary.itemName} />
                  <div className="chat-room-header-copy">
                    <strong>{activeChatSummary.itemName}</strong>
                    <span>
                      {[activeChatSummary.quantity, activeChatSummary.ownerName, activeChatSummary.listingType].filter(Boolean).join(' | ')}
                    </span>
                    <small>Chatting with {activeChatSummary.otherUserName}</small>
                  </div>
                </header>

                {barterCta && (
                  <div className="chat-cta-row">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        if (latestActiveTrade?.status === 'accepted') {
                          navigate(`/barter/success/${latestActiveTrade.id}`);
                          return;
                        }
                        handleOpenBarter(buildListingFromChat(activeChatSummary), activeChatSummary.id);
                      }}
                    >
                      {barterCta.label}
                    </button>
                    <span>Use the connected barter flow to send a trade request from this chat.</span>
                  </div>
                )}

                {chatError && (
                  <div className="community-inline-note">
                    <strong>Chat issue</strong>
                    <span>{chatError}</span>
                  </div>
                )}

                <div className="chat-room-messages">
                  {chatRoomLoading && !chatMessages.length ? (
                    <div className="community-chat-empty">
                      <span>Loading conversation...</span>
                    </div>
                  ) : chatMessages.length ? (
                    chatMessages.map((message) => {
                      const messageClass = message.messageType === 'system'
                        ? 'system'
                        : message.senderId === userId ? 'self' : 'other';
                      return (
                        <article
                          key={message.id}
                          className={`chat-bubble-row ${messageClass}`}
                        >
                          {messageClass === 'other' && (
                            <img
                              className="chat-avatar"
                              src={message.senderId === activeChatSummary.ownerId ? activeChatSummary.ownerAvatar : activeChatSummary.buyerAvatar}
                              alt={message.senderId === activeChatSummary.ownerId ? activeChatSummary.ownerName : activeChatSummary.buyerName}
                            />
                          )}
                          <div className={`chat-bubble ${messageClass}`}>
                            <p>{message.message}</p>
                            <small>{message.createdAtLabel}</small>
                            {message.actionLabel && message.tradeRequestId && getTradeRequestById(message.tradeRequestId)?.status === 'accepted' && (
                              <Link className="inline-chat-action" to={message.actionTo}>
                                {message.actionLabel}
                              </Link>
                            )}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="community-chat-empty">
                      <strong>No messages yet.</strong>
                      <span>Start a conversation about this harvest.</span>
                    </div>
                  )}
                </div>

                <form className="chat-compose-bar" onSubmit={handleSendMessage}>
                  <input
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Type your message..."
                  />
                  <button className="primary-button" type="submit" disabled={chatLoading || !chatDraft.trim()}>
                    {chatLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="community-chat-empty tall">
                <strong>Select a marketplace listing or chat room.</strong>
                <span>Open a listing chat to talk directly with the grower about barter, sale, or donation details.</span>
              </div>
            )}
          </div>
        </section>
      )}
    </article>
  );
}

function mapFeedPost(post) {
  return {
    id: post.id,
    type: post.type,
    userName: post.user_name,
    communityName: post.community_name,
    timestamp: post.timestamp,
    avatar: post.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    image: post.image_url || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    caption: post.caption,
    likes: post.likes || 0,
    comments: post.comments || 0,
  };
}

function mapMarketplaceListing(listing) {
  return {
    id: listing.id,
    itemName: listing.item_name,
    ownerName: listing.owner_name,
    ownerId: listing.owner_id,
    area: listing.area || 'Nearby',
    distance: listing.distance || 'Nearby',
    quantity: listing.quantity || '',
    listingType: listing.listing_type,
    requestedItem: listing.requested_item || '',
    image: listing.image_url || 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=80',
  };
}

function buildListingFromChat(room) {
  return {
    id: room.marketplaceItemId,
    itemName: room.itemName,
    ownerName: room.ownerName,
    ownerId: room.ownerId,
    quantity: room.quantity,
    listingType: room.listingType,
    requestedItem: room.requestedItem,
    image: room.itemImage,
    area: room.communityName || 'Tanjung Malim',
  };
}

function buildListingFromRequest(requestItem) {
  return {
    id: requestItem.marketplaceItemId,
    itemName: requestItem.requestedItemName,
    ownerName: requestItem.ownerName,
    ownerId: requestItem.ownerId,
    quantity: requestItem.requestedItemQuantity,
    listingType: requestItem.listingType,
    requestedItem: requestItem.offeredItemName,
    image: requestItem.itemImage,
    area: requestItem.communityName || 'Tanjung Malim',
  };
}
