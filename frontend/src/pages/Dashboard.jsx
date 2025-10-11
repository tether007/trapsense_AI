import React from 'react';
import HeatmapMap from "../components/common/HeatmapViwer";

function Dashboard() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to your dashboard! Here you can manage your account and view your activity.</p>

      <section>
        <h2 className="text-lg font-semibold mb-2">Wildlife Heatmap (Serengeti)</h2>
        <div className="rounded-lg overflow-hidden shadow">
          <HeatmapMap />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
