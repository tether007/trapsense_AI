import React, { useState, useEffect } from 'react';
import { useApi } from '../../utils/api';

export default function AnimalCount() {
  const [animalData, setAnimalData] = useState({
    totalAnimals: 0,
    totalImages: 0,
    nonBlankImages: 0,
    speciesBreakdown: {},
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  useEffect(() => {
    const fetchAnimalData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's media data
        const mediaData = await makeRequest('media');
        console.log('Fetched media data:', mediaData);
        
        // Process the data to calculate statistics
        const processedData = processAnimalData(mediaData);
        setAnimalData(processedData);
        
      } catch (err) {
        console.error('Error fetching animal data:', err);
        setError(err.message || 'Failed to load animal data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnimalData();
  }, []);

  const processAnimalData = (mediaList) => {
    let totalAnimals = 0;
    let totalImages = mediaList.length;
    let nonBlankImages = 0;
    const speciesBreakdown = {};
    const recentActivity = [];

    mediaList.forEach(media => {
      if (media.classification === 'non-blank') {
        nonBlankImages++;
        
        // Parse predictions to count animals
        if (media.predictions) {
          try {
            const predictions = typeof media.predictions === 'string' 
              ? JSON.parse(media.predictions) 
              : media.predictions;
            
            if (Array.isArray(predictions)) {
              totalAnimals += predictions.length;
              
              // Count species
              predictions.forEach(prediction => {
                const species = prediction.class_name || 'Unknown';
                speciesBreakdown[species] = (speciesBreakdown[species] || 0) + 1;
              });
            }
          } catch (e) {
            console.warn('Error parsing predictions:', e);
          }
        }
        
        // Add to recent activity
        recentActivity.push({
          id: media.id,
          species: media.species,
          animalCount: media.predictions ? 
            (Array.isArray(JSON.parse(media.predictions)) ? JSON.parse(media.predictions).length : 0) : 0,
          uploadedAt: media.uploaded_at,
          confidence: media.confidence
        });
      }
    });

    // Sort recent activity by upload date
    recentActivity.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return {
      totalAnimals,
      totalImages,
      nonBlankImages,
      speciesBreakdown,
      recentActivity: recentActivity.slice(0, 5) // Show last 5
    };
  };

  const getSpeciesColor = (index) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const getSpeciesTextColor = (index) => {
    const colors = [
      'text-red-700', 'text-blue-700', 'text-green-700', 'text-yellow-700',
      'text-purple-700', 'text-pink-700', 'text-indigo-700', 'text-orange-700'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const speciesEntries = Object.entries(animalData.speciesBreakdown)
    .sort(([,a], [,b]) => b - a);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🦁 Your Wildlife Discoveries</h2>
        <p className="text-gray-600">Personal animal detection statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Animals</p>
              <p className="text-2xl font-bold text-green-700">{animalData.totalAnimals}</p>
            </div>
            <div className="text-3xl">🦓</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Images Analyzed</p>
              <p className="text-2xl font-bold text-blue-700">{animalData.totalImages}</p>
            </div>
            <div className="text-3xl">📸</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">With Wildlife</p>
              <p className="text-2xl font-bold text-orange-700">{animalData.nonBlankImages}</p>
            </div>
            <div className="text-3xl">🌿</div>
          </div>
        </div>
      </div>

      {/* Species Breakdown */}
      {speciesEntries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Species Detected</h3>
          <div className="space-y-3">
            {speciesEntries.map(([species, count], index) => {
              const percentage = (count / animalData.totalAnimals) * 100;
              return (
                <div key={species} className="flex items-center space-x-3">
                  <div className="w-16 text-sm font-medium text-gray-600 truncate">
                    {species}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`h-full ${getSpeciesColor(index)} rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {animalData.recentActivity.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Discoveries</h3>
          <div className="space-y-2">
            {animalData.recentActivity.map((activity, index) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {activity.animalCount > 3 ? '🦁' : activity.animalCount > 1 ? '🦓' : '🦒'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {activity.animalCount} animal{activity.animalCount !== 1 ? 's' : ''} detected
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.species || 'Various species'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(activity.uploadedAt).toLocaleDateString()}
                  </p>
                  {activity.confidence && (
                    <p className="text-xs text-green-600">
                      {(activity.confidence * 100).toFixed(1)}% confidence
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {animalData.totalAnimals === 0 && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Animals Detected Yet</h3>
          <p className="text-gray-500">Upload some images to start tracking wildlife!</p>
        </div>
      )}
    </div>
  );
}
