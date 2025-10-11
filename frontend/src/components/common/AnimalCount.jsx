import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../utils/api';
import * as d3 from 'd3';

export default function AnimalStatistics() {
  const [statistics, setStatistics] = useState({
    totalImages: 0,
    nonBlankImages: 0,
    totalDetections: 0,
    speciesDistribution: [],
    detectionTrend: [],
    confidenceMetrics: {
      average: 0,
      distribution: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'week', 'month', 'all'
  const { makeRequest } = useApi();

  // Refs for D3 containers
  const speciesChartRef = useRef();
  const trendChartRef = useRef();
  const confidenceChartRef = useRef();

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const mediaData = await makeRequest('media');
      console.log('Raw API response for AnimalCount:', mediaData);
      const processedData = processStatistics(mediaData);
      console.log('Processed data for AnimalCount:', processedData);
      setStatistics(processedData);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const processStatistics = (mediaList) => {
    let totalDetections = 0;
    const speciesCount = {};
    const dateCounts = {};
    const confidenceScores = [];

    console.log('Processing media list:', mediaList);

    mediaList.forEach(media => {
      console.log('Processing media:', media);
      console.log('Media classification:', media.classification, 'Has predictions:', !!media.predictions);
      
      // Handle both 'non-blank' and 'non_blank' classifications
      if ((media.classification === 'non-blank' || media.classification === 'non_blank') && media.predictions) {
        console.log('Found non-blank media with predictions:', media.id, media.classification);
        try {
          const predictions = typeof media.predictions === 'string' 
            ? JSON.parse(media.predictions) 
            : media.predictions;
          
          console.log('Parsed predictions for media', media.id, ':', predictions);
          
          if (Array.isArray(predictions)) {
            totalDetections += predictions.length;

            // Count species - the ML service returns class_name field
            predictions.forEach(prediction => {
              const species = prediction.class_name || 'Unknown';
              speciesCount[species] = (speciesCount[species] || 0) + 1;
              
              // Collect confidence scores
              if (prediction.confidence !== undefined && prediction.confidence !== null) {
                confidenceScores.push(prediction.confidence);
              }
            });

            // Track by date
            const date = new Date(media.uploaded_at).toISOString().split('T')[0];
            dateCounts[date] = (dateCounts[date] || 0) + predictions.length;
          }
        } catch (e) {
          console.warn('Error parsing predictions for media', media.id, ':', e);
        }
      }
    });

    // Process species distribution
    const speciesDistribution = Object.entries(speciesCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalDetections > 0 ? (count / totalDetections) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    console.log('Species distribution:', speciesDistribution);
    console.log('Final statistics - Total detections:', totalDetections, 'Species count:', Object.keys(speciesCount).length);

    // Process trend data
    const detectionTrend = Object.entries(dateCounts)
      .map(([date, count]) => ({
        date: new Date(date),
        count
      }))
      .sort((a, b) => a.date - b.date);

    // Process confidence metrics
    const averageConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
      : 0;

    // Confidence distribution (0-1 in 0.1 increments)
    const confidenceDistribution = d3.range(0, 1.1, 0.1).map(threshold => ({
      range: `${(threshold * 100).toFixed(0)}%`,
      count: confidenceScores.filter(score => 
        score >= threshold && score < threshold + 0.1
      ).length
    }));

    return {
      totalImages: mediaList.length,
      nonBlankImages: mediaList.filter(m => m.classification === 'non-blank').length,
      totalDetections,
      speciesDistribution,
      detectionTrend,
      confidenceMetrics: {
        average: averageConfidence,
        distribution: confidenceDistribution
      }
    };
  };

  // D3 Chart Components
  useEffect(() => {
    if (statistics.speciesDistribution.length > 0) {
      renderSpeciesChart();
    }
    if (statistics.detectionTrend.length > 0) {
      renderTrendChart();
    }
    if (statistics.confidenceMetrics.distribution.length > 0) {
      renderConfidenceChart();
    }
  }, [statistics]);

  const renderSpeciesChart = () => {
    const data = statistics.speciesDistribution.slice(0, 8); // Top 8 species
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    d3.select(speciesChartRef.current).selectAll("*").remove();

    const svg = d3.select(speciesChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", "#10b981")
      .attr("rx", 2);

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Y-axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  const renderTrendChart = () => {
    const data = statistics.detectionTrend;
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    d3.select(trendChartRef.current).selectAll("*").remove();

    const svg = d3.select(trendChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Line
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Points
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.count))
      .attr("r", 3)
      .attr("fill", "#3b82f6");

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  const renderConfidenceChart = () => {
    const data = statistics.confidenceMetrics.distribution;
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    d3.select(confidenceChartRef.current).selectAll("*").remove();

    const svg = d3.select(confidenceChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.range))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars with gradient based on confidence
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.range))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", (d, i) => d3.interpolateGreens(i / data.length))
      .attr("rx", 2);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-center text-red-600">
          <div className="text-lg font-semibold mb-2">Error Loading Statistics</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Detection Statistics</h2>
        <p className="text-sm text-gray-600">Comprehensive analysis of wildlife detections</p>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.totalImages}</div>
          <div className="text-sm text-gray-600">Total Images</div>
        </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.nonBlankImages}</div>
          <div className="text-sm text-gray-600">With Wildlife</div>
        </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.totalDetections}</div>
          <div className="text-sm text-gray-600">Total Detections</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Species Distribution</h3>
          <svg ref={speciesChartRef} className="w-full"></svg>
          {statistics.speciesDistribution.length === 0 && (
            <div className="text-center text-gray-500 py-8">No species data available</div>
          )}
        </div>

        {/* Detection Trend */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detection Trend</h3>
          <svg ref={trendChartRef} className="w-full"></svg>
          {statistics.detectionTrend.length === 0 && (
            <div className="text-center text-gray-500 py-8">No trend data available</div>
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Confidence Distribution
            {statistics.confidenceMetrics.average > 0 && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Avg: {(statistics.confidenceMetrics.average * 100).toFixed(1)}%)
              </span>
            )}
          </h3>
          <svg ref={confidenceChartRef} className="w-full"></svg>
          {statistics.confidenceMetrics.distribution.length === 0 && (
            <div className="text-center text-gray-500 py-8">No confidence data available</div>
          )}
        </div>

        {/* Data Summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unique Species:</span>
              <span className="font-medium">{statistics.speciesDistribution.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Detection Rate:</span>
              <span className="font-medium">
                {statistics.totalImages > 0 
                  ? ((statistics.nonBlankImages / statistics.totalImages) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg Detections per Image:</span>
              <span className="font-medium">
                {statistics.nonBlankImages > 0
                  ? (statistics.totalDetections / statistics.nonBlankImages).toFixed(1)
                  : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {statistics.totalImages === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Upload images to generate detection statistics</p>
        </div>
      )}
    </div>
  );
}