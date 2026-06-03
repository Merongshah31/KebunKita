import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

const blankForm = {
  name: '',
  category: 'Vegetable',
  planted_date: '',
  location: '',
  sunlight: 'Full Sun',
  watering_frequency: 'Daily',
  image_url: '',
};

const daysSince = (dateValue) => {
  if (!dateValue) return 'Not set';
  const planted = new Date(dateValue);
  if (Number.isNaN(planted.getTime())) return 'Not set';
  const today = new Date();
  const days = Math.max(0, Math.round((today - planted) / (1000 * 60 * 60 * 24)));
  return `${days} days ago`;
};

const readableDate = (dateValue) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' });
};

const nextWatering = (frequency) => {
  if (!frequency) return 'Next watering today';
  if (frequency.toLowerCase().includes('2')) return 'Next watering in 48h';
  if (frequency.toLowerCase().includes('weekly')) return 'Next watering this week';
  return 'Next watering today';
};

const normalizePlant = (plant) => ({
  ...plant,
  category: plant.category || plant.plant_type || 'Vegetable',
  location: plant.location || plant.garden_location || 'Home garden',
  planted_date: plant.planted_date || plant.created_at || '',
  estimated_harvest_date: plant.estimated_harvest_date || '',
  growth_percentage: plant.growth_percentage ?? plant.growth_percent ?? plant.growth_progress ?? 0,
  sunlight: plant.sunlight || plant.sunlight_requirement || plant.sunlight_condition || 'Full Sun',
  watering_frequency: plant.watering_frequency || plant.watering_schedule || 'Daily',
  image_url:
    plant.image_url ||
    plant.photo_url ||
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80',
});

export default function SmartFarming({ userId, onError }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creatingPlant, setCreatingPlant] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [previewImage, setPreviewImage] = useState('');
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [plantsError, setPlantsError] = useState('');
  const [careLogs, setCareLogs] = useState([]);
  const [careLogsLoading, setCareLogsLoading] = useState(false);

  const visiblePlants = useMemo(() => plants.map(normalizePlant), [plants]);
  const activePlant = selectedPlant ? normalizePlant(selectedPlant) : null;

  const refreshPlants = useCallback(async () => {
    setPlantsLoading(true);
    setPlantsError('');
    try {
      const response = await apiService.listPlants(userId);
      const backendPlants = Array.isArray(response.data) ? response.data : [];
      setPlants(backendPlants);
      setSelectedPlant((current) => {
        if (!current) return null;
        return backendPlants.find((plant) => plant.id === current.id) || null;
      });
    } catch (error) {
      setPlants([]);
      const message = error.debugInfo?.message || error.message;
      setPlantsError(message);
      onError(`Load plants failed: ${message}`);
    } finally {
      setPlantsLoading(false);
    }
  }, [onError, userId]);

  useEffect(() => {
    refreshPlants();
  }, [refreshPlants]);

  const refreshCareLogs = useCallback(async (plantId) => {
    if (!plantId) {
      setCareLogs([]);
      return;
    }
    setCareLogsLoading(true);
    try {
      const response = await apiService.listCareLogs(plantId, userId);
      setCareLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setCareLogs([]);
      onError(`Load care history failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setCareLogsLoading(false);
    }
  }, [onError, userId]);

  useEffect(() => {
    if (selectedPlant?.id) {
      refreshCareLogs(selectedPlant.id);
    }
  }, [refreshCareLogs, selectedPlant?.id]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    updateForm('image_url', objectUrl);
  };

  const handleAddPlant = async (event) => {
    event.preventDefault();
    setCreatingPlant(true);

    const payload = {
      user_id: userId,
      name: form.name,
      category: form.category,
      location: form.location,
      sunlight: form.sunlight,
      watering_frequency: form.watering_frequency,
      planted_date: form.planted_date,
      image_url: form.image_url || previewImage,
    };

    try {
      await apiService.createPlant(payload);
      setForm(blankForm);
      setPreviewImage('');
      setShowAddForm(false);
      await refreshPlants();
    } catch (error) {
      onError(`Add plant failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setCreatingPlant(false);
    }
  };

  const handleWater = async (plant) => {
    try {
      await apiService.waterPlant(plant.id, userId);
      await refreshPlants();
      await refreshCareLogs(plant.id);
    } catch (error) {
      onError(`Water log failed: ${error.debugInfo?.message || error.message}`);
    }
  };

  const handleCareAction = async (plant, actionType) => {
    try {
      await apiService.createCareLog(plant.id, {
        user_id: userId,
        action_type: actionType,
        note: actionType === 'fertilized' ? 'Logged from My Garden detail' : 'Added from My Garden detail',
      });
      await refreshCareLogs(plant.id);
    } catch (error) {
      onError(`Care log failed: ${error.debugInfo?.message || error.message}`);
    }
  };

  if (activePlant) {
    return (
      <article className="agent-panel garden-module">
        <div className="crop-detail-hero">
          <button className="text-button" type="button" onClick={() => setSelectedPlant(null)}>
            Back to My Garden
          </button>
          <img src={activePlant.image_url} alt={activePlant.name} />
          <div className="crop-detail-card">
            <span className="plant-status-pill">Active growth</span>
            <h3>{activePlant.name}</h3>
            <p>{activePlant.location}</p>
            <div className="growth-ring">{activePlant.growth_percentage}%</div>
          </div>
        </div>

        <div className="crop-detail-grid">
          <section className="garden-info-card">
            <span className="agent-kicker">Growth status</span>
            <h4>{activePlant.growth_percentage}% Grown</h4>
            <div className="progress-track">
              <span style={{ width: `${activePlant.growth_percentage}%` }} />
            </div>
            <div className="crop-date-row">
              <span>Planted: {readableDate(activePlant.planted_date)}</span>
              <span>Harvest: {readableDate(activePlant.estimated_harvest_date)}</span>
            </div>
          </section>

          <section className="garden-info-card ai-support-card">
            <span className="agent-kicker">AI support</span>
            <h4>Suggested reminder</h4>
            <p>
              {activePlant.name} is in active growth. Keep soil moisture steady and check leaf color
              before the next watering cycle.
            </p>
          </section>
        </div>

        <section className="garden-info-card">
          <div className="section-head">
            <h4>Care History</h4>
            <button className="text-button" type="button" onClick={() => refreshCareLogs(activePlant.id)}>Refresh</button>
          </div>
          <div className="care-history-list">
            {careLogsLoading ? (
              <div className="care-history-item">
                <span>Loading</span>
                <strong>Fetching live care history</strong>
                <small>Please wait</small>
              </div>
            ) : careLogs.length === 0 ? (
              <div className="care-history-item">
                <span>Empty</span>
                <strong>No care history yet</strong>
                <small>Log water, fertilizer, or notes to create live records.</small>
              </div>
            ) : careLogs.map((item) => (
              <div className="care-history-item" key={item.id}>
                <span>{formatAction(item.action_type)}</span>
                <strong>{item.note || 'No note'}</strong>
                <small>{readableDate(item.created_at)}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="garden-action-bar">
          <button className="primary-button" type="button" onClick={() => handleWater(activePlant)}>
            Log Water
          </button>
          <button className="secondary-button" type="button" onClick={() => handleCareAction(activePlant, 'fertilized')}>Log Fertilizer</button>
          <button className="secondary-button" type="button" onClick={() => handleCareAction(activePlant, 'note')}>Add Note</button>
        </div>

      </article>
    );
  }

  return (
    <article className="agent-panel garden-module">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">Plant care management</span>
          <h3>My Garden</h3>
        </div>
        <button className="secondary-button" type="button" onClick={() => setShowAddForm((value) => !value)}>
          {showAddForm ? 'Close Form' : 'Add New Plant'}
        </button>
      </div>

      {showAddForm && (
        <form className="add-plant-form" onSubmit={handleAddPlant}>
          <label className="image-upload-card">
            {previewImage ? <img src={previewImage} alt="New plant preview" /> : <span>Upload plant image</span>}
            <input accept="image/*" type="file" onChange={handleImageUpload} />
          </label>
          <div className="add-plant-fields">
            <label>
              Plant name
              <input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
            </label>
            <label>
              Plant type
              <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                <option>Vegetable</option>
                <option>Fruit</option>
                <option>Herb</option>
                <option>Leafy Green</option>
              </select>
            </label>
            <label>
              Planted date
              <input
                required
                type="date"
                value={form.planted_date}
                onChange={(event) => updateForm('planted_date', event.target.value)}
              />
            </label>
            <label>
              Location
              <input
                required
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
              />
            </label>
            <label>
              Sunlight condition
              <select
                value={form.sunlight}
                onChange={(event) => updateForm('sunlight', event.target.value)}
              >
                <option>Full Sun</option>
                <option>Partial Shade</option>
                <option>Shade</option>
              </select>
            </label>
            <label>
              Watering schedule
              <select
                value={form.watering_frequency}
                onChange={(event) => updateForm('watering_frequency', event.target.value)}
              >
                <option>Daily</option>
                <option>Every 2 Days</option>
                <option>Weekly</option>
              </select>
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={creatingPlant}>
            {creatingPlant ? 'Saving Plant...' : 'Save to Garden'}
          </button>
        </form>
      )}

      <div className="my-garden-grid">
        {plantsLoading ? (
          <section className="garden-info-card">
            <h4>Loading My Garden...</h4>
            <p>Fetching live plant records from the database.</p>
          </section>
        ) : plantsError ? (
          <section className="garden-info-card">
            <h4>Could not load My Garden</h4>
            <p>{plantsError}</p>
          </section>
        ) : visiblePlants.length ? visiblePlants.map((plant) => (
          <button className="plant-management-card" type="button" key={plant.id} onClick={() => setSelectedPlant(plant)}>
            <img src={plant.image_url} alt={plant.name} />
            <div className="plant-card-content">
              <div className="plant-card-head">
                <div>
                  <strong>{plant.name}</strong>
                  <span>{plant.category}</span>
                </div>
                <small>{plant.growth_percentage}%</small>
              </div>
              <div className="progress-track">
                <span style={{ width: `${plant.growth_percentage}%` }} />
              </div>
              <div className="plant-meta-grid">
                <span>Planted {daysSince(plant.planted_date)}</span>
                <span>{plant.sunlight}</span>
                <span>{nextWatering(plant.watering_frequency)}</span>
              </div>
            </div>
          </button>
        )) : (
          <section className="garden-info-card">
            <h4>No plants in My Garden yet.</h4>
            <p>Add your first live plant record to start tracking growth, watering, and care reminders from the database.</p>
          </section>
        )}
      </div>

      <section className="garden-info-card ai-support-card">
        <span className="agent-kicker">AI support</span>
        <h4>Care reminders stay contextual</h4>
        <p>
          AI only supports the garden workflow by suggesting reminders and plant health advice based on
          plant type, growth stage, sunlight, and watering schedule.
        </p>
      </section>

    </article>
  );
}

function formatAction(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
