import React, { useEffect, useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function SmartFarming({ userId, onError }) {
  const [plantName, setPlantName] = useState('Birds Eye Chili');
  const [budgetRm, setBudgetRm] = useState('50');
  const [loading, setLoading] = useState(false);
  const [creatingPlant, setCreatingPlant] = useState(false);
  const [result, setResult] = useState(null);
  const [plants, setPlants] = useState([]);

  const refreshPlants = async () => {
    try {
      const response = await apiService.listPlants(userId);
      setPlants(response.data);
    } catch {
      setPlants([]);
    }
  };

  useEffect(() => {
    refreshPlants();
  }, [userId]);

  const handlePlan = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiService.createFarmingPlan(userId, plantName, budgetRm);
      setResult(response.data);
    } catch (error) {
      onError(`Care plan failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlant = async () => {
    setCreatingPlant(true);
    try {
      await apiService.createPlant({
        user_id: userId,
        name: plantName,
        plant_type: 'vegetable',
        variety: plantName,
        garden_location: 'Balcony',
        sunlight_requirement: 'Full sun',
        watering_frequency: 'Daily',
      });
      await refreshPlants();
    } catch (error) {
      onError(`Add plant failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setCreatingPlant(false);
    }
  };

  const handleWater = async (plantId) => {
    try {
      await apiService.waterPlant(plantId, userId);
      await refreshPlants();
    } catch (error) {
      onError(`Water log failed: ${error.debugInfo?.message || error.message}`);
    }
  };

  return (
    <article className="agent-panel">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">Garden assistant</span>
          <h3>Generate today care tasks</h3>
        </div>
        <button className="secondary-button" type="button" onClick={handleAddPlant} disabled={creatingPlant}>
          {creatingPlant ? 'Adding...' : 'Add plant'}
        </button>
      </div>

      <form className="agent-form two-column" onSubmit={handlePlan}>
        <label>
          Plant name
          <input value={plantName} onChange={(event) => setPlantName(event.target.value)} />
        </label>
        <label>
          Budget RM
          <input
            type="number"
            min="0"
            value={budgetRm}
            onChange={(event) => setBudgetRm(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? 'Planning...' : 'Generate care plan'}
        </button>
      </form>

      {plants.length > 0 && (
        <div className="plant-grid">
          {plants.map((plant) => (
            <div className="garden-card" key={plant.id}>
              <div>
                <strong>{plant.name}</strong>
                <span>{plant.growth_percent || 0} percent grown</span>
              </div>
              <button type="button" onClick={() => handleWater(plant.id)}>
                Log water
              </button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="result-card">
          <h4>{result.plant_name} tasks</h4>
          <div className="task-list">
            {result.tasks.map((task) => (
              <div className="task-item" key={`${task.time}-${task.task}`}>
                <span>{task.time}</span>
                <strong>{task.task}</strong>
                <p>{task.reason}</p>
              </div>
            ))}
          </div>
          <small>{result.telegram_hint}</small>
        </div>
      )}
    </article>
  );
}
