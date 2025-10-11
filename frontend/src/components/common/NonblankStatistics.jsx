import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../utils/api';
import * as d3 from 'd3';

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

  // Refs for D3 charts
  const classificationChartRef = useRef();
  const confidenceChartRef = useRef();
  const speciesChartRef = useRef();
  const monthlyChartRef = useRef();

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (!loading && stats.totalImages > 0) {
      renderClassificationChart();
      renderConfidenceChart();
      renderSpeciesChart();
      renderMonthlyChart();
    }
  }, [stats, loading]);

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const mediaData = await makeRequest('media');
      console.log('Raw API response for NonblankStatistics:', mediaData);
        const processedStats = processStatistics(mediaData);
      console.log('Processed stats for NonblankStatistics:', processedStats);
        setStats(processedStats);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

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

    console.log('Processing statistics for media list:', mediaList);

    mediaList.forEach(media => {
      console.log('Processing media for statistics:', media);
      console.log('Media classification:', media.classification, 'Has predictions:', !!media.predictions);
      
      // Handle both 'non-blank' and 'non_blank' classifications
      if (media.classification === 'non-blank' || media.classification === 'non_blank') {
        console.log('Found non-blank media for statistics:', media.id, media.classification);
        nonBlankCount++;
        
        if (media.predictions) {
          try {
            const predictions = typeof media.predictions === 'string' 
              ? JSON.parse(media.predictions) 
              : media.predictions;
            
            console.log('Parsed predictions for statistics:', predictions);
            
            if (Array.isArray(predictions)) {
              totalAnimals += predictions.length;
              
              // The ML service returns class_name field for species
              predictions.forEach(prediction => {
                const species = prediction.class_name || 'Unknown';
                speciesCount[species] = (speciesCount[species] || 0) + 1;
              });
            }
          } catch (e) {
            console.warn('Error parsing predictions for statistics:', e);
          }
        }
      } else {
        blankCount++;
      }

      if (media.confidence) {
        totalConfidence += media.confidence;
        confidenceCount++;
      }

      if (media.uploaded_at) {
        const month = new Date(media.uploaded_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }

      if (media.is_processed) {
        processingStatus.processed++;
      } else {
        processingStatus.pending++;
      }
    });

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const confidenceStats = {
      average: averageConfidence,
      high: mediaList.filter(m => m.confidence && m.confidence >= 0.8).length,
      medium: mediaList.filter(m => m.confidence && m.confidence >= 0.5 && m.confidence < 0.8).length,
      low: mediaList.filter(m => m.confidence && m.confidence < 0.5).length
    };

    const topSpecies = Object.entries(speciesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([species, count]) => ({ species, count }));

    console.log('Final statistics - Total animals:', totalAnimals, 'Species count:', Object.keys(speciesCount).length, 'Top species:', topSpecies);

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

  const renderClassificationChart = () => {
    const data = [
      { label: 'Non-Blank', value: stats.nonBlankCount, color: '#10b981' },
      { label: 'Blank', value: stats.blankCount, color: '#6b7280' }
    ].filter(d => d.value > 0);

    const width = 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    d3.select(classificationChartRef.current).selectAll("*").remove();

    const svg = d3.select(classificationChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Animated bars
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.label))
      .attr("y", height - margin.bottom)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", d => d.color)
      .attr("rx", 4)
      .transition()
      .duration(800)
      .delay((d, i) => i * 200)
      .attr("y", d => y(d.value))
      .attr("height", d => height - margin.bottom - y(d.value));

    // Value labels
    svg.selectAll(".value-label")
      .data(data)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.label) + x.bandwidth() / 2)
      .attr("y", height - margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .text(d => d.value)
      .transition()
      .duration(800)
      .delay((d, i) => i * 200)
      .attr("y", d => y(d.value) - 5);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "11px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "11px");
  };

  const renderConfidenceChart = () => {
    const data = [
      { label: 'High', value: stats.confidenceStats.high, color: '#10b981' },
      { label: 'Medium', value: stats.confidenceStats.medium, color: '#f59e0b' },
      { label: 'Low', value: stats.confidenceStats.low, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const width = 300;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;

    d3.select(confidenceChartRef.current).selectAll("*").remove();

    const svg = d3.select(confidenceChartRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Animated pie chart
    const arcs = svg.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("fill", d => d.data.color)
      .attr("d", arc)
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 300)
      .style("opacity", 1);

    // Labels
    const labelArc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    svg.selectAll(".pie-label")
      .data(pie(data))
      .join("text")
      .attr("class", "pie-label")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .text(d => d.data.value)
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 300 + 500)
      .style("opacity", 1);
  };

  const renderSpeciesChart = () => {
    const data = stats.topSpecies.slice(0, 5);
    const width = 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 80 };

    d3.select(speciesChartRef.current).selectAll("*").remove();

    const svg = d3.select(speciesChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.species))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    // Animated horizontal bars
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("y", d => y(d.species))
      .attr("x", margin.left)
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .attr("fill", "#3b82f6")
      .attr("rx", 3)
      .transition()
      .duration(800)
      .delay((d, i) => i * 150)
      .attr("width", d => x(d.count) - margin.left);

    // Species labels
    svg.selectAll(".species-label")
      .data(data)
      .join("text")
      .attr("class", "species-label")
      .attr("x", margin.left - 5)
      .attr("y", d => y(d.species) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "11px")
      .text(d => d.species.charAt(0).toUpperCase() + d.species.slice(1));

    // Count labels
    svg.selectAll(".count-label")
      .data(data)
      .join("text")
      .attr("class", "count-label")
      .attr("x", d => x(d.count) + 5)
      .attr("y", d => y(d.species) + y.bandwidth() / 2)
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .text(d => d.count)
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 150 + 400)
      .style("opacity", 1);

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");
  };

  const renderMonthlyChart = () => {
    const data = Object.entries(stats.monthlyBreakdown)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([month, count]) => ({ month, count }));

    if (data.length === 0) return;

    const width = 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    d3.select(monthlyChartRef.current).selectAll("*").remove();

    const svg = d3.select(monthlyChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Line generator
    const line = d3.line()
      .x(d => x(d.month) + x.bandwidth() / 2)
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // Animated line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#8b5cf6")
      .attr("stroke-width", 3)
      .attr("d", line)
      .style("opacity", 0)
      .transition()
      .duration(1200)
      .style("opacity", 1);

    // Animated points
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.month) + x.bandwidth() / 2)
      .attr("cy", height - margin.bottom)
      .attr("r", 4)
      .attr("fill", "#8b5cf6")
      .transition()
      .duration(800)
      .delay((d, i) => i * 200)
      .attr("cy", d => y(d.count));

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
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
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
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Image Analysis Dashboard</h2>
        <p className="text-sm text-gray-600">Comprehensive statistics on blank vs non-blank image classification</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{stats.totalImages}</div>
          <div className="text-sm text-gray-600">Total Images</div>
            </div>
        <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="text-2xl font-bold text-green-700">{stats.nonBlankCount}</div>
          <div className="text-sm text-green-600">Non-Blank</div>
          <div className="text-xs text-green-500">{stats.nonBlankPercentage.toFixed(1)}%</div>
          </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">{stats.blankCount}</div>
          <div className="text-sm text-gray-600">Blank</div>
          <div className="text-xs text-gray-500">
            {stats.totalImages > 0 ? ((stats.blankCount / stats.totalImages) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="text-center p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="text-2xl font-bold text-blue-700">{stats.averageAnimalsPerImage.toFixed(1)}</div>
          <div className="text-sm text-blue-600">Avg Animals</div>
          <div className="text-xs text-blue-500">per image</div>
          </div>
        </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classification Breakdown */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Image Classification</h3>
          <svg ref={classificationChartRef} className="w-full"></svg>
          {stats.totalImages === 0 && (
            <div className="text-center text-gray-500 py-8">No classification data available</div>
          )}
      </div>

        {/* Confidence Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confidence Distribution</h3>
          <svg ref={confidenceChartRef} className="w-full"></svg>
          {stats.confidenceStats.high + stats.confidenceStats.medium + stats.confidenceStats.low === 0 && (
            <div className="text-center text-gray-500 py-8">No confidence data available</div>
          )}
      </div>

      {/* Top Species */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Detected Species</h3>
          <svg ref={speciesChartRef} className="w-full"></svg>
          {stats.topSpecies.length === 0 && (
            <div className="text-center text-gray-500 py-8">No species data available</div>
          )}
          </div>

        {/* Monthly Activity */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Activity Trend</h3>
          <svg ref={monthlyChartRef} className="w-full"></svg>
          {Object.keys(stats.monthlyBreakdown).length === 0 && (
            <div className="text-center text-gray-500 py-8">No monthly data available</div>
          )}
            </div>
          </div>

      {/* Processing Status */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="text-xl font-bold text-blue-700">{stats.processingStatus.processed}</div>
          <div className="text-sm text-blue-600">Processed</div>
              </div>
        <div className="text-center p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="text-xl font-bold text-yellow-700">{stats.processingStatus.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
            </div>
        <div className="text-center p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-xl font-bold text-red-700">{stats.processingStatus.failed}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
      </div>

      {/* Empty State */}
      {stats.totalImages === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <div className="text-gray-400 text-4xl mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Upload images to generate classification statistics</p>
        </div>
      )}
    </div>
  );
}