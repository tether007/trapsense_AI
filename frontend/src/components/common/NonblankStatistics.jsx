import React, { useState, useEffect } from 'react';
import { useApi } from '../../utils/api';

export default function NonblankStatistics() {
  const [stats, setStats] = useState({
    totalImages: 0,
    nonBlankCount: 0,
    blankCount: 0,
    nonBlankPercentage: 0,
    averageAnimalsPerImage: 0,
    topSpecies: [],
    confidenceStats: {
      average: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    monthlyBreakdown: {},
    processingStatus: {
      processed: 0,
      pending: 0,
      failed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Fetch user's media data
        const mediaData = await makeRequest('media');
        console.log('Fetched media data for statistics:', mediaData);
        
        // Process the data to calculate statistics
        const processedStats = processStatistics(mediaData);
        setStats(processedStats);
        
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const processStatistics = (mediaList) => {
    let totalImages = mediaList.length;
    let nonBlankCount = 0;
    let blankCount = 0;
    let totalAnimals = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    const speciesCount = {};
    const monthlyData = {};
    const processingStatus = { processed: 0, pending: 0, failed: 0 };

    mediaList.forEach(media => {
      // Count classification
      if (media.classification === 'non-blank') {
        nonBlankCount++;
        
        // Count animals in predictions
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
                speciesCount[species] = (speciesCount[species] || 0) + 1;
              });
            }
          } catch (e) {
            console.warn('Error parsing predictions:', e);
          }
        }
      } else {
        blankCount++;
      }

      // Process confidence
      if (media.confidence) {
        totalConfidence += media.confidence;
        confidenceCount++;
      }

      // Monthly breakdown
      if (media.uploaded_at) {
        const month = new Date(media.uploaded_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }

      // Processing status
      if (media.is_processed) {
        processingStatus.processed++;
      } else {
        processingStatus.pending++;
      }
    });

    // Calculate confidence categories
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const confidenceStats = {
      average: averageConfidence,
      high: mediaList.filter(m => m.confidence && m.confidence >= 0.8).length,
      medium: mediaList.filter(m => m.confidence && m.confidence >= 0.5 && m.confidence < 0.8).length,
      low: mediaList.filter(m => m.confidence && m.confidence < 0.5).length
    };

    // Top species
    const topSpecies = Object.entries(speciesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([species, count]) => ({ species, count }));

    return {
      totalImages,
      nonBlankCount,
      blankCount,
      nonBlankPercentage: totalImages > 0 ? (nonBlankCount / totalImages) * 100 : 0,
      averageAnimalsPerImage: nonBlankCount > 0 ? totalAnimals / nonBlankCount : 0,
      topSpecies,
      confidenceStats,
      monthlyBreakdown: monthlyData,
      processingStatus
    };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
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
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Statistics</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Image Analysis Statistics</h2>
        <p className="text-gray-600">Detailed breakdown of your wildlife detection data</p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Images</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalImages}</p>
            </div>
            <div className="text-3xl">📸</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Non-Blank</p>
              <p className="text-2xl font-bold text-green-700">{stats.nonBlankCount}</p>
              <p className="text-xs text-green-600">{stats.nonBlankPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-3xl">🦓</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Blank</p>
              <p className="text-2xl font-bold text-gray-700">{stats.blankCount}</p>
              <p className="text-xs text-gray-600">{((stats.blankCount / stats.totalImages) * 100).toFixed(1)}%</p>
            </div>
            <div className="text-3xl">📷</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Avg Animals</p>
              <p className="text-2xl font-bold text-orange-700">{stats.averageAnimalsPerImage.toFixed(1)}</p>
              <p className="text-xs text-orange-600">per image</p>
            </div>
            <div className="text-3xl">🦒</div>
          </div>
        </div>
      </div>

      {/* Confidence Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Confidence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">High Confidence</p>
                <p className="text-xl font-bold text-green-700">{stats.confidenceStats.high}</p>
                <p className="text-xs text-green-600">≥80%</p>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Medium Confidence</p>
                <p className="text-xl font-bold text-yellow-700">{stats.confidenceStats.medium}</p>
                <p className="text-xs text-yellow-600">50-79%</p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Low Confidence</p>
                <p className="text-xl font-bold text-red-700">{stats.confidenceStats.low}</p>
                <p className="text-xs text-red-600">&lt;50%</p>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Species */}
      {stats.topSpecies.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Detected Species</h3>
          <div className="space-y-2">
            {stats.topSpecies.map(({ species, count }, index) => (
              <div key={species} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 capitalize">{species}</p>
                    <p className="text-sm text-gray-600">{count} detection{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Processed</p>
                <p className="text-xl font-bold text-blue-700">{stats.processingStatus.processed}</p>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-xl font-bold text-yellow-700">{stats.processingStatus.pending}</p>
              </div>
              <div className="text-2xl">⏳</div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Failed</p>
                <p className="text-xl font-bold text-red-700">{stats.processingStatus.failed}</p>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {Object.keys(stats.monthlyBreakdown).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Activity</h3>
          <div className="space-y-2">
            {Object.entries(stats.monthlyBreakdown)
              .sort(([a], [b]) => new Date(a) - new Date(b))
              .map(([month, count]) => (
                <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📅</div>
                    <div>
                      <p className="font-medium text-gray-800">{month}</p>
                      <p className="text-sm text-gray-600">{count} image{count !== 1 ? 's' : ''} uploaded</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{count}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalImages === 0 && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-500">Upload some images to see detailed statistics!</p>
        </div>
      )}
    </div>
  );
}
