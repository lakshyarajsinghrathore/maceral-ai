import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, Flame, CheckCircle, AlertTriangle } from 'lucide-react';

// Fix for default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

// Create self-contained SVG pins for compliance status (no external image CDN dependency)
const createIcon = (color) => {
  const colorMap = {
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    blue: '#3B82F6'
  };
  const hex = colorMap[color] || '#3B82F6';

  return L.divIcon({
    className: 'custom-mine-pin',
    html: `
      <div style="position: relative; width: 28px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg viewBox="0 0 24 32" width="28" height="36" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="${hex}" stroke="#FFFFFF" stroke-width="1.5" />
          <circle cx="12" cy="11" r="5" fill="#FFFFFF" />
          <circle cx="12" cy="11" r="3" fill="${hex}" />
        </svg>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36]
  });
};

const icons = {
  green: createIcon('green'),
  amber: createIcon('amber'),
  red: createIcon('red'),
  blue: createIcon('blue')
};

export default function GISMap({ mines = [], scores = [], alerts = [] }) {
  // Center map on India roughly
  const center = [22.9074872, 79.1466487];

  // Merge mine baseline data with runtime compliance scores
  const mapData = useMemo(() => {
    return mines.map(mine => {
      // If coordinates are missing (e.g. backend seed issue), generate randomized fallback coordinates in major India coal belts
      // Dhanbad: ~23.79, 86.43 | Singrauli: ~24.2, 82.6 | Godavari: ~17.6, 80.6
      const lat = mine.latitude || (23.5 + (Math.random() - 0.5) * 5);
      const lng = mine.longitude || (83.0 + (Math.random() - 0.5) * 5);
      
      let status = 'blue';
      let hazardZone = false;
      let scoreVal = mine.compliance_score || 'N/A';

      const mineScore = scores.find(s => s.mine_id === mine.id || s.mine_name === mine.name);
      if (mineScore && mineScore.overall_score) {
        scoreVal = mineScore.overall_score;
      }

      if (scoreVal !== 'N/A') {
        const numericScore = parseFloat(scoreVal);
        if (numericScore >= 85) status = 'green';
        else if (numericScore >= 70) status = 'amber';
        else {
          status = 'red';
          hazardZone = true; // Highlight red mines with a hazard buffer
        }
      }

      // Check if there are active severe alerts for this mine
      const mineAlerts = alerts.filter(a => a.mine_id === mine.id && a.severity === 'critical' && a.status === 'pending');
      if (mineAlerts.length > 0) {
        status = 'red';
        hazardZone = true;
      }

      return {
        ...mine,
        displayLat: lat,
        displayLng: lng,
        status,
        hazardZone,
        scoreVal,
        activeAlerts: mineAlerts
      };
    });
  }, [mines, scores, alerts]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 z-10 relative shadow-sm">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={true} 
        className="w-full h-full min-h-[400px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {mapData.map((mine, idx) => (
          <React.Fragment key={mine.id || idx}>
            <Marker position={[mine.displayLat, mine.displayLng]} icon={icons[mine.status]}>
              <Popup className="rounded-xl">
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-bold text-sm text-gray-900 border-b pb-1 mb-2">
                    {mine.name}
                  </h3>
                  <div className="text-xs text-gray-600 space-y-1 mb-2">
                    <p><strong>Region:</strong> {mine.region}, {mine.state}</p>
                    <p><strong>Subsidiary:</strong> {mine.subsidiary}</p>
                    <p><strong>Type:</strong> {mine.mine_type}</p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm font-mono">
                      <span>Compliance Score:</span>
                      <strong className={
                        mine.status === 'green' ? 'text-green-600' :
                        mine.status === 'amber' ? 'text-amber-600' :
                        mine.status === 'red' ? 'text-red-600' : 'text-blue-600'
                      }>
                        {mine.scoreVal}
                      </strong>
                    </div>
                  </div>
                  
                  {mine.activeAlerts?.length > 0 && (
                    <div className="bg-red-50 text-red-700 p-2 rounded text-xs mt-2 font-mono flex items-start gap-1.5 border border-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Critical Alerts Active</strong>
                        <ul className="list-disc pl-3 mt-1">
                          {mine.activeAlerts.map(a => (
                            <li key={a.id} className="truncate">{a.title}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Render Hazard Zone Buffer for Red Status Mines */}
            {mine.hazardZone && (
              <Circle
                center={[mine.displayLat, mine.displayLng]}
                radius={25000} // 25 km buffer
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, dashArray: '4' }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
