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
    <div className="min-h-screen bg-[#0C1222] text-slate-200 p-4 font-sans max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-indigo-400" />
          Field Report (PWA)
        </h1>
        <div className="flex items-center space-x-2 text-sm font-semibold">
          {isOnline ? (
            <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-500/20">
              <Wifi className="w-4 h-4 mr-1" /> Online
            </span>
          ) : (
            <span className="flex items-center text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md border border-amber-500/20">
              <WifiOff className="w-4 h-4 mr-1" /> Offline
            </span>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded-lg flex items-center text-emerald-300">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">

        {/* Mine Selection */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Target Mine Location</label>
          <select
            name="mine_id"
            value={formData.mine_id}
            onChange={handleInputChange}
            required
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Select Mine...</option>
            {mines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </select>
        </div>

        {/* GPS Capture */}
        <div className="p-4 bg-[#0a0f1c] border border-slate-800/80 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">GPS Coordinates</span>
            <button
              type="button"
              onClick={requestGeolocation}
              disabled={locating}
              className="text-xs flex items-center bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 px-3 py-1 rounded-lg transition-colors"
            >
              <Navigation className="w-3 h-3 mr-1" />
              {locating ? "Acquiring..." : (location.lat ? "Retake GPS" : "Capture GPS")}
            </button>
          </div>
          <div className="text-sm font-mono text-slate-300">
            {location.lat ? (
              <div className="space-y-1">
                <p>Lat: <span className="text-emerald-400">{location.lat.toFixed(6)}</span></p>
                <p>Lng: <span className="text-emerald-400">{location.lng.toFixed(6)}</span></p>
                <p className="text-xs text-slate-500">Accuracy: {Math.round(location.accuracy)}m</p>
              </div>
            ) : (
              <p className="text-slate-500 italic">No GPS data captured yet.</p>
            )}
          </div>
        </div>

        {/* Violations Count */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Violations / Flags</label>
          <input
            type="number"
            name="violations_found"
            min="0"
            value={formData.violations_found}
            onChange={handleInputChange}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Inspector Notes</label>
          <textarea
            name="inspector_notes"
            rows={4}
            value={formData.inspector_notes}
            onChange={handleInputChange}
            placeholder="Document any hazards, equipment issues, or compliance breaches..."
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 resize-none text-sm"
          ></textarea>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md transition-all"
        >
          <Save className="w-5 h-5" />
          <span>{isOnline ? "Submit to Headquarters" : "Save Offline securely"}</span>
        </button>
      </form>
    </div>
  );
};

export default MobileInspection;
