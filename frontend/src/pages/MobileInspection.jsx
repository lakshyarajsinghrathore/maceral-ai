import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, WifiOff, Wifi, Save, CheckCircle } from 'lucide-react';
import { fetchMines } from '../api/client';
import { saveOfflineInspection, syncOfflineInspections, cacheMinesForOffline, getCachedMines } from '../api/offlineSync';
import api from '../api/client';

const MobileInspection = () => {
  const [mines, setMines] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Form State
  const [formData, setFormData] = useState({
    mine_id: '',
    inspector_id: 'INSP-101', // Example default ID
    inspector_name: 'Field Officer', // Example default name
    violations_found: 0,
    inspector_notes: '',
  });

  const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineInspections(); // defined in offlineSync, also auto-bound there
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Mines on load
  useEffect(() => {
    const loadMines = async () => {
      try {
        if (isOnline) {
          const res = await fetchMines();
          setMines(res);
          cacheMinesForOffline(res);
        } else {
          const cached = await getCachedMines();
          setMines(cached);
        }
      } catch (err) {
        console.error("Failed to load mines", err);
        const cached = await getCachedMines();
        setMines(cached);
      }
    };
    loadMines();
  }, [isOnline]);

  const requestGeolocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        console.error(err);
        alert("Failed to fetch location. Please enable GPS permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    const payload = {
      ...formData,
      violations_found: parseInt(formData.violations_found, 10) || 0,
      checklist_data: { "standard_inspection": true }, // Minimal payload for now
      gps_lat: location.lat,
      gps_lng: location.lng,
      geo_accuracy_meters: location.accuracy,
      inspected_at: new Date().toISOString(),
      is_offline_synced: !isOnline
    };

    try {
      if (isOnline) {
        // Direct Submit
        await api.post('/api/inspections/', payload);
        setSuccessMsg("Inspection synced live to headquarters.");
      } else {
        // Offline Save
        await saveOfflineInspection(payload);
        setSuccessMsg("Saved to device offline storage. Will sync when online.");
      }

      // Reset Form
      setFormData({
        mine_id: '', inspector_id: formData.inspector_id, inspector_name: formData.inspector_name, violations_found: 0, inspector_notes: ''
      });
      setLocation({ lat: null, lng: null, accuracy: null });

    } catch (err) {
      console.error(err);
      alert("Error submitting. Please try again or go offline.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 font-sans max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Field Report (PWA)
        </h1>
        <div className="flex items-center space-x-2 text-sm font-semibold">
          {isOnline ? (
            <span className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200">
              <Wifi className="w-4 h-4 mr-1" /> Online
            </span>
          ) : (
            <span className="flex items-center text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
              <WifiOff className="w-4 h-4 mr-1" /> Offline
            </span>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-800">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">

        {/* Mine Selection */}
        <div>
          <label className="block text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Target Mine Location</label>
          <select
            name="mine_id"
            value={formData.mine_id}
            onChange={handleInputChange}
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="" disabled>Select Mine...</option>
            {mines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </select>
        </div>

        {/* GPS Capture */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600 uppercase tracking-wider font-bold">GPS Coordinates</span>
            <button
              type="button"
              onClick={requestGeolocation}
              disabled={locating}
              className="text-xs flex items-center bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg transition-colors"
            >
              <Navigation className="w-3 h-3 mr-1" />
              {locating ? "Acquiring..." : (location.lat ? "Retake GPS" : "Capture GPS")}
            </button>
          </div>
          <div className="text-sm font-mono text-gray-700">
            {location.lat ? (
              <div className="space-y-1">
                <p>Lat: <span className="text-gray-900 font-semibold">{location.lat.toFixed(6)}</span></p>
                <p>Lng: <span className="text-gray-900 font-semibold">{location.lng.toFixed(6)}</span></p>
                <p className="text-xs text-gray-500">Accuracy: {Math.round(location.accuracy)}m</p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No GPS data captured yet.</p>
            )}
          </div>
        </div>

        {/* Violations Count */}
        <div>
          <label className="block text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Violations / Flags</label>
          <input
            type="number"
            name="violations_found"
            min="0"
            value={formData.violations_found}
            onChange={handleInputChange}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Inspector Notes</label>
          <textarea
            name="inspector_notes"
            rows={4}
            value={formData.inspector_notes}
            onChange={handleInputChange}
            placeholder="Document any hazards, equipment issues, or compliance breaches..."
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm"
          ></textarea>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shadow-blue-500/20 active:bg-blue-800 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{isOnline ? "Submit to Headquarters" : "Save Offline securely"}</span>
        </button>
      </form>
    </div>
  );
};

export default MobileInspection;