import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Flame, 
  Wind, 
  Scale, 
  Droplet, 
  ShieldAlert, 
  Layers, 
  MapPin, 
  Radio, 
  Activity, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { MINE_POLYGONS, IOT_SENSORS, TILE_LAYERS } from '../data/gisData';

// Fix for default Leaflet marker assets in Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

// Helper component for smooth programmatic camera flying
function MapFlyToController({ targetCoords, targetZoom }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount to ensure Leaflet calculates accurate coordinates under any scale
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (targetCoords && targetCoords.length === 2) {
      map.flyTo(targetCoords, targetZoom || 13, { duration: 1.5 });
    }
  }, [targetCoords, targetZoom, map]);
  return null;
}

// 1. Sleek CSS Teardrop Markers for Mine Centers
const createMineIcon = (colorCode) => {
  return new L.divIcon({
    className: 'bg-transparent border-0',
    html: `
      <div style="
        background-color: ${colorCode};
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        cursor: pointer;
      ">
        <div style="transform: rotate(45deg); width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -34]
  });
};

const mineIcons = {
  green: createMineIcon('#10B981'),
  amber: createMineIcon('#F59E0B'),
  red: createMineIcon('#EF4444'),
  blue: createMineIcon('#3B82F6')
};

// 2. Specialized Glowing Beacon Markers for Live IoT Sensors
const createSensorIcon = (type, status) => {
  const colors = {
    safe: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444'
  };
  const color = colors[status] || '#3B82F6';

  let iconSvg = '';
  if (type === 'methane') {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
  } else if (type === 'dust') {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7A7.5 7.5 0 1 0 5 14a4 4 0 0 0 .7 8h12.6a4.5 4.5 0 0 0 .4-9z"/></svg>`;
  } else if (type === 'weighbridge') {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;
  } else {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`;
  }

  const pulseAnimation = status === 'critical' 
    ? 'box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' 
    : '';

  return new L.divIcon({
    className: 'bg-transparent border-0',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ${pulseAnimation}
        ">
          ${iconSvg}
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
};

const INDIA_CENTER = [22.9074872, 79.1466487];

export default function GISMap({ mines = [], scores = [], alerts = [] }) {
  // Map Controller State
  const [activeBaseLayer, setActiveBaseLayer] = useState('satellite');
  const [showPolygons, setShowPolygons] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showHazardCircles, setShowHazardCircles] = useState(true);
  const [flyTarget, setFlyTarget] = useState({ coords: INDIA_CENTER, zoom: 5 });

  // Merge mine baseline data with runtime compliance scores
  const mapMines = useMemo(() => {
    return mines.map(mine => {
      // Find matching polygon data for coordinates if available
      const mineKey = Object.keys(MINE_POLYGONS).find(k => 
        mine.name.toLowerCase().includes(k) || 
        mine.id.toLowerCase().includes(k)
      );

      const lat = mine.latitude || (mineKey ? MINE_POLYGONS[mineKey].center[0] : (23.5 + (Math.random() - 0.5) * 4));
      const lng = mine.longitude || (mineKey ? MINE_POLYGONS[mineKey].center[1] : (83.0 + (Math.random() - 0.5) * 4));
      
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
          hazardZone = true;
        }
      }

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
        activeAlerts: mineAlerts,
        polygonKey: mineKey
      };
    });
  }, [mines, scores, alerts]);

  // Handle Quick Fly-To Selection
  const handleFlyTo = (key) => {
    if (key === 'all') {
      setFlyTarget({ coords: INDIA_CENTER, zoom: 5 });
    } else if (MINE_POLYGONS[key]) {
      setFlyTarget({ coords: MINE_POLYGONS[key].center, zoom: 13.5 });
    }
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm relative">
      {/* 1. Geospatial Command & Control Toolbar */}
      <div className="p-3 bg-white/95 backdrop-blur-md border-b border-gray-200 z-20 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Quick Fly-To Mine Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Target Mine:</span>
          </div>
          <select 
            onChange={(e) => handleFlyTo(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">🇮🇳 All Coalfields (National Overview)</option>
            <option value="gevra">Gevra OCP (SECL - 52.5 MT)</option>
            <option value="kusmunda">Kusmunda OCP (SECL - 45.0 MT)</option>
            <option value="dipka">Dipka OCP (SECL - 35.0 MT)</option>
            <option value="moonidih">Moonidih UG (BCCL - Jharia)</option>
            <option value="rajmahal">Rajmahal OCP (ECL - 20.0 MT)</option>
            <option value="lakhanpur">Lakhanpur OCP (MCL - 21.0 MT)</option>
          </select>
        </div>

        {/* Layer Visibility Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input 
              type="checkbox" 
              checked={showPolygons} 
              onChange={() => setShowPolygons(!showPolygons)}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-medium text-gray-700">Lease Boundaries</span>
          </label>

          <label className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input 
              type="checkbox" 
              checked={showSensors} 
              onChange={() => setShowSensors(!showSensors)}
              className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-medium text-gray-700">IoT Sensors</span>
          </label>

          <label className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input 
              type="checkbox" 
              checked={showHazardCircles} 
              onChange={() => setShowHazardCircles(!showHazardCircles)}
              className="rounded text-red-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-medium text-gray-700">Hazard Buffers</span>
          </label>
        </div>

        {/* Base Tile Layer Switcher */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveBaseLayer('satellite')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              activeBaseLayer === 'satellite' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setActiveBaseLayer('street')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              activeBaseLayer === 'street' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setActiveBaseLayer('dark')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              activeBaseLayer === 'dark' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Night Dark
          </button>
        </div>
      </div>

      {/* 2. Interactive Leaflet Map Container */}
      <div className="flex-1 relative w-full min-h-[460px]">
        <MapContainer 
          center={INDIA_CENTER} 
          zoom={5} 
          scrollWheelZoom={true} 
          className="w-full h-full min-h-[460px] z-10"
        >
          {/* Programmatic Fly-To Controller */}
          <MapFlyToController targetCoords={flyTarget.coords} targetZoom={flyTarget.zoom} />

          {/* Active Dynamic Base Tile Layer */}
          <TileLayer
            key={activeBaseLayer}
            attribution={TILE_LAYERS[activeBaseLayer].attribution}
            url={TILE_LAYERS[activeBaseLayer].url}
            maxZoom={TILE_LAYERS[activeBaseLayer].maxZoom}
          />
          
          {/* A. Polygonal Leasehold Boundaries, Active Excavation Pits & Overburden Dumps */}
          {showPolygons && Object.values(MINE_POLYGONS).map((poly) => (
            <React.Fragment key={poly.mineId}>
              {/* 1. Statutory Leasehold Perimeter */}
              <Polygon
                positions={poly.leasehold}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: '#3B82F6',
                  fillOpacity: activeBaseLayer === 'satellite' ? 0.15 : 0.08,
                  weight: 2,
                  dashArray: '2, 4'
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <p className="font-bold text-blue-700">{poly.name} &mdash; Statutory Leasehold</p>
                    <p className="text-gray-600">{poly.subsidiary} | {poly.state}</p>
                    <p className="text-gray-500 font-mono mt-0.5">Area: {poly.totalAreaHa.toLocaleString()} Hectares</p>
                  </div>
                </Tooltip>
              </Polygon>

              {/* 2. Active Excavation Pit & Shovel Benches */}
              <Polygon
                positions={poly.activePit}
                pathOptions={{
                  color: '#F59E0B',
                  fillColor: '#F59E0B',
                  fillOpacity: activeBaseLayer === 'satellite' ? 0.28 : 0.18,
                  weight: 2.5
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <p className="font-bold text-amber-700">Active Excavation Pit & Benches</p>
                    <p className="text-gray-600">Capacity: {poly.annualCapacityMT} MT/Year</p>
                    <p className="text-amber-600 font-medium mt-0.5">Continuous Shovel-Dumper Operations</p>
                  </div>
                </Tooltip>
              </Polygon>

              {/* 3. Overburden (OB) Dump & Waste Rock Zone */}
              <Polygon
                positions={poly.obDump}
                pathOptions={{
                  color: '#92400E',
                  fillColor: '#B45309',
                  fillOpacity: activeBaseLayer === 'satellite' ? 0.35 : 0.22,
                  weight: 1.5,
                  dashArray: '3, 3'
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <p className="font-bold text-yellow-900">Overburden (OB) Dump Yard</p>
                    <p className="text-gray-600">Slope Stability Monitored</p>
                    <p className="text-emerald-700 font-medium">Reclamation & Afforestation Zone</p>
                  </div>
                </Tooltip>
              </Polygon>
            </React.Fragment>
          ))}

          {/* B. Mine Center Point Markers */}
          {mapMines.map((mine, idx) => (
            <React.Fragment key={mine.id || idx}>
              <Marker position={[mine.displayLat, mine.displayLng]} icon={mineIcons[mine.status]}>
                <Popup className="rounded-xl">
                  <div className="p-1 min-w-[210px]">
                    <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                      <h3 className="font-bold text-sm text-gray-900">
                        {mine.name}
                      </h3>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                        mine.status === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                        mine.status === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {mine.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 mb-2">
                      <p><strong>Subsidiary:</strong> {mine.subsidiary} ({mine.region})</p>
                      <p><strong>State:</strong> {mine.state}</p>
                      <p><strong>Type:</strong> {mine.mine_type}</p>
                      <div className="flex items-center justify-between pt-2 border-t text-xs font-mono">
                        <span className="text-gray-500">Statutory Rating:</span>
                        <strong className={
                          mine.status === 'green' ? 'text-green-600 font-bold' :
                          mine.status === 'amber' ? 'text-amber-600 font-bold' :
                          'text-red-600 font-bold'
                        }>
                          {mine.scoreVal}/100
                        </strong>
                      </div>
                    </div>
                    
                    {mine.activeAlerts?.length > 0 && (
                      <div className="bg-red-50 text-red-700 p-2 rounded-lg text-xs mt-2 font-mono border border-red-100">
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                          <span>Critical Hazards Active</span>
                        </div>
                        <ul className="list-disc pl-3 mt-1 text-[11px] space-y-0.5">
                          {mine.activeAlerts.map(a => (
                            <li key={a.id} className="truncate">{a.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
              
              {/* 25 km Hazard Buffer Zone for Flagged Mines */}
              {showHazardCircles && mine.hazardZone && (
                <Circle
                  center={[mine.displayLat, mine.displayLng]}
                  radius={25000}
                  pathOptions={{ 
                    color: '#EF4444', 
                    fillColor: '#EF4444', 
                    fillOpacity: 0.12, 
                    dashArray: '6, 6' 
                  }}
                />
              )}
            </React.Fragment>
          ))}

          {/* C. Real-Time IoT Telemetry Sensors Overlay */}
          {showSensors && IOT_SENSORS.map((sensor) => (
            <Marker
              key={sensor.id}
              position={sensor.coords}
              icon={createSensorIcon(sensor.type, sensor.status)}
            >
              <Popup className="rounded-xl">
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-200">
                      {sensor.id}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                      sensor.status === 'safe' ? 'bg-green-50 text-green-700 border-green-200' :
                      sensor.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    }`}>
                      {sensor.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-gray-900 leading-snug">{sensor.name}</h4>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{sensor.mineName}</p>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 my-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-gray-500 font-medium">Live Telemetry:</span>
                      <span className={`text-sm font-extrabold font-mono ${
                        sensor.status === 'critical' ? 'text-red-600' :
                        sensor.status === 'warning' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {sensor.value}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1 pt-1 border-t border-gray-200/60">
                      <span>Threshold: {sensor.threshold}</span>
                      <span>Power: {sensor.battery}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                    {sensor.description}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 text-emerald-500 animate-ping" />
                      Live Feed
                    </span>
                    <span>Ping: {sensor.lastPing}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3. Bottom Spatial Legend & Status HUD */}
      <div className="p-2.5 bg-gray-50/95 border-t border-gray-200 z-20 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Optimal (85+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Warning (70-85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span>Critical (&lt;70)</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 border border-blue-500 bg-blue-100/60 inline-block rounded-sm"></span>
            <span>Leasehold Perimeter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 border border-amber-500 bg-amber-200/60 inline-block rounded-sm"></span>
            <span>Active Pit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 border border-amber-900 bg-yellow-700/60 inline-block rounded-sm"></span>
            <span>OB Dump</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            <Radio className="w-3 h-3 text-emerald-600" />
            10 IoT Nodes Online
          </span>
          <span>CRS: EPSG:4326 (WGS 84)</span>
        </div>
      </div>
    </div>
  );
}
