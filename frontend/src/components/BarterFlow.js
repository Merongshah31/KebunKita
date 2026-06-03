import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../api/client';
import {
  appendLocalChatMessage,
  buildLocalMessage,
  createLocalChatRoom,
  createTradeRequest,
  getTradeRequestById,
  splitPreferredItems,
  updateTradeRequestStatus,
} from '../utils/tradeDemo';
import '../styles/agents.css';

function normalizePlant(plant) {
  return {
    ...plant,
    name: plant.name || 'Garden item',
    category: plant.category || plant.plant_type || 'Vegetable',
    location: plant.location || plant.garden_location || 'Home garden',
    image_url:
      plant.image_url ||
      plant.photo_url ||
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80',
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
    image:
      listing.image_url ||
      'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=80',
  };
}

export function BarterPage({ user, onError }) {
  const { marketplaceItemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const listingFromState = location.state?.listing || null;
  const incomingChatRoomId = location.state?.chatRoomId || '';

  const [listing, setListing] = useState(listingFromState);
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [offeredQuantity, setOfferedQuantity] = useState('2kg');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tradeResult, setTradeResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const [listingResult, plantsResult] = await Promise.all([
          listingFromState
            ? Promise.resolve({ data: [listingFromState] })
            : apiService.listMarketplace(),
          apiService.listPlants(user.id),
        ]);

        if (!active) return;

        const liveListing = listingFromState || (Array.isArray(listingResult.data)
          ? listingResult.data.map(mapMarketplaceListing).find((item) => String(item.id) === String(marketplaceItemId))
          : null);

        setListing(liveListing || null);
        setPlants(Array.isArray(plantsResult.data) ? plantsResult.data.map(normalizePlant) : []);
      } catch (error) {
        if (!active) return;
        onError(`Load barter page failed: ${error.debugInfo?.message || error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [listingFromState, marketplaceItemId, onError, user?.id]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) || null,
    [plants, selectedPlantId]
  );

  const ownerPreferredItems = splitPreferredItems(listing?.requestedItem);

  const handleSubmitTrade = async () => {
    if (!user?.id) {
      onError('Create a guest session first before making a barter offer.');
      return;
    }

    if (!listing) {
      onError('Marketplace listing not found for this barter flow.');
      return;
    }

    if (!selectedPlant) {
      onError('Select one item from My Garden before sending a trade request.');
      return;
    }

    setSubmitting(true);

    try {
      const room = createLocalChatRoom({
        buyerId: user.id,
        buyerName: user.full_name || 'Guest Grower',
        currentViewerId: user.id,
        listing,
      });

      const chatRoomId = incomingChatRoomId || room.id;
      const tradeRequest = createTradeRequest({
        chatRoomId,
        marketplaceItemId: listing.id,
        requesterId: user.id,
        requesterName: user.full_name || 'Guest Grower',
        ownerId: listing.ownerId || room.ownerId,
        ownerName: listing.ownerName,
        requestedItemName: listing.itemName,
        requestedItemQuantity: listing.quantity || '500g',
        offeredItemName: selectedPlant.name,
        offeredItemQuantity: offeredQuantity.trim() || '2kg',
        message: message.trim(),
        itemImage: listing.image,
        listingType: listing.listingType,
        communityName: listing.area || 'Tanjung Malim',
      });

      appendLocalChatMessage(
        user.id,
        chatRoomId,
        buildLocalMessage('system', 'Trade request sent.', { isRead: true, messageType: 'system', tradeRequestId: tradeRequest.id })
      );

      window.setTimeout(() => {
        updateTradeRequestStatus(tradeRequest.id, 'accepted');
        appendLocalChatMessage(
          user.id,
          chatRoomId,
          buildLocalMessage(room.ownerId, 'Saya terima trade ini. Jom teruskan pertukaran.', { isRead: false })
        );
        appendLocalChatMessage(
          user.id,
          chatRoomId,
          buildLocalMessage('system', 'Trade accepted.', {
            isRead: true,
            messageType: 'system',
            tradeRequestId: tradeRequest.id,
            actionLabel: 'View Trade Summary',
            actionTo: `/barter/success/${tradeRequest.id}`,
          })
        );
        setTradeResult({ ...tradeRequest, status: 'accepted' });
      }, 1000);

      setTradeResult(tradeRequest);
    } catch (error) {
      onError(`Trade request failed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="page-shell">
        <section className="empty-state">
          <h3>Guest login required</h3>
          <p>Create a guest account first before making a barter offer.</p>
          <Link className="primary-link" to="/guest">Sign up as guest</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell barter-page">
      <section className="garden-info-card reveal reveal-up">
        <div className="section-head">
          <div>
            <span className="agent-kicker">Barter flow</span>
            <h2>Make a barter offer</h2>
          </div>
          <Link className="text-button" to="/dashboard?module=community&tab=chats">Back to chat</Link>
        </div>

        {loading ? (
          <div className="community-chat-empty">
            <strong>Loading barter setup...</strong>
            <span>Fetching the listing and your live garden items.</span>
          </div>
        ) : !listing ? (
          <div className="community-chat-empty">
            <strong>Listing not found.</strong>
            <span>Open the marketplace again and start the barter flow from chat.</span>
          </div>
        ) : (
          <>
            <div className="barter-hero-card">
              <img src={listing.image} alt={listing.itemName} />
              <div className="barter-hero-copy">
                <span className="listing-type-pill barter">{listing.listingType}</span>
                <h3>{listing.itemName}</h3>
                <p>{listing.quantity} from {listing.ownerName}</p>
                <small>
                  {ownerPreferredItems.length
                    ? `Owner prefers: ${ownerPreferredItems.join(', ')}`
                    : `Community: ${listing.area || 'Tanjung Malim'}`}
                </small>
              </div>
            </div>

            <section className="garden-info-card">
              <div className="section-head">
                <h4>Select from My Garden</h4>
                <span className="chat-live-indicator">{plants.length} live plants</span>
              </div>

              {!plants.length ? (
                <div className="community-chat-empty">
                  <strong>No garden items yet.</strong>
                  <span>Add a plant in My Garden first, then return here to make the barter offer.</span>
                </div>
              ) : (
                <div className="barter-plant-grid">
                  {plants.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      className={`barter-plant-card ${selectedPlantId === plant.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlantId(plant.id)}
                    >
                      <img src={plant.image_url} alt={plant.name} />
                      <div>
                        <strong>{plant.name}</strong>
                        <span>{plant.category}</span>
                        <small>{plant.location}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="garden-info-card">
              <h4>Offer summary</h4>
              <div className="barter-summary-grid">
                <div className="barter-summary-box">
                  <span className="result-label">You get</span>
                  <strong>{listing.quantity}</strong>
                  <p>{listing.itemName}</p>
                </div>
                <div className="barter-summary-box">
                  <span className="result-label">You give</span>
                  <strong>{offeredQuantity || '2kg'}</strong>
                  <p>{selectedPlant?.name || 'Select one garden item'}</p>
                </div>
              </div>

              <div className="agent-form two-column">
                <label>
                  Offered quantity
                  <input value={offeredQuantity} onChange={(event) => setOfferedQuantity(event.target.value)} placeholder="2kg" />
                </label>
                <label>
                  Optional message
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Hi Abu, saya boleh offer kangkung segar dari kebun saya."
                  />
                </label>
              </div>

              <button className="primary-button" type="button" disabled={submitting || !selectedPlant} onClick={handleSubmitTrade}>
                {submitting ? 'Sending trade...' : 'Trade'}
              </button>

              {tradeResult && (
                <div className="community-inline-note">
                  <strong>{tradeResult.status === 'accepted' ? 'Trade accepted' : 'Trade request sent'}</strong>
                  <span>
                    {tradeResult.status === 'accepted'
                      ? `${tradeResult.ownerName} accepted your offer.`
                      : 'Waiting for the demo auto-accept reply from the owner.'}
                  </span>
                  {tradeResult.status === 'accepted' && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate(`/barter/success/${tradeResult.id}`)}
                    >
                      View Trade Summary
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export function TradeSummaryPage() {
  const { tradeRequestId } = useParams();
  const trade = getTradeRequestById(tradeRequestId);

  if (!trade) {
    return (
      <main className="page-shell">
        <section className="community-chat-empty tall">
          <strong>Trade summary not found.</strong>
          <span>The demo trade may have been cleared from browser storage.</span>
          <Link className="primary-link" to="/dashboard?module=community&tab=chats">Return to chat</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell barter-page">
      <section className="garden-info-card trade-summary-card reveal reveal-up">
        <span className="agent-kicker">Trade summary</span>
        <h2>{trade.status === 'accepted' ? 'Trade Accepted' : 'Trade Completed'}</h2>
        <p>Your community barter flow is now connected from chat to exchange summary.</p>

        <div className="barter-summary-grid">
          <div className="barter-summary-box">
            <span className="result-label">You give</span>
            <strong>{trade.offeredItemQuantity}</strong>
            <p>{trade.offeredItemName}</p>
          </div>
          <div className="barter-summary-box">
            <span className="result-label">You get</span>
            <strong>{trade.requestedItemQuantity}</strong>
            <p>{trade.requestedItemName}</p>
          </div>
        </div>

        <div className="mini-list">
          <span><strong>Trade partner:</strong> {trade.ownerName}</span>
          <span><strong>Status:</strong> {trade.status}</span>
        </div>

        <div className="post-actions">
          <Link className="primary-link" to={`/dashboard?module=community&tab=chats&chat=${encodeURIComponent(trade.chatRoomId)}`}>
            Return to Chat
          </Link>
          <Link className="secondary-link" to="/">
            Return Home
          </Link>
          <Link className="secondary-link" to="/dashboard?module=community&tab=chats&section=my-trades">
            View My Trades
          </Link>
        </div>
      </section>
    </main>
  );
}
