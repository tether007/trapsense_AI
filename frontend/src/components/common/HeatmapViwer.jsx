import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useApi } from '../../utils/api';

const SERENGETI_BOUNDS = [[-2.8, 34.4], [-0.9, 35.8]]; // [southWest, northEast]
const SERENGETI_CENTER = [-1.85, 35.1];

function HeatLayer({ points, intensity = 0.8 }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Remove existing heat layers (if any)
    map.eachLayer(layer => {
      if (layer && layer._heat) {
        map.removeLayer(layer);
      }
    });

    if (!points || points.length === 0) return;

    // Convert points to heat layer format: [lat, lng, intensity]
    const heatPoints = points.map(p => [p.lat, p.lon, intensity]);

    const heat = L.heatLayer(heatPoints, { radius: 25, blur: 30, maxZoom: 17, gradient: {0.2: 'cyan', 0.4: 'lime', 0.6: 'orange', 0.9: 'red'} });
    // mark for removal detection
    heat._heat = true;
    heat.addTo(map);

    return () => {
      heat.remove();
    };
  }, [map, points, intensity]);

  return null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function HeatmapMap({ className = 'h-[600px] w-full' }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        // Use the central API helper so the Clerk token is attached
        const data = await makeRequest('media/heatmap');
        setPoints(data.points || []);
      } catch (e) {
        console.error('Heatmap fetch error:', e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, []);

  return (
    <div className={className}>
      <MapContainer
        center={SERENGETI_CENTER}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        maxBounds={SERENGETI_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        <HeatLayer points={points} />
      </MapContainer>

      {loading && (
        <div className="absolute right-4 bottom-4 bg-white/90 p-2 rounded shadow">Loading heatmap...</div>
      )}

      {error && (
        <div className="absolute right-4 bottom-4 bg-red-50 text-red-700 p-2 rounded shadow">{error}</div>
      )}
    </div>
  );
}
