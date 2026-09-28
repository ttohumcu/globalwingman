import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin } from 'lucide-react';

const GOV_APPS = [
  { country: 'United States', app: 'B4UFLY / AutoPylot' },
  { country: 'United Kingdom', app: 'Drone Assist' },
  { country: 'Canada', app: 'NAV Drone' },
  { country: 'Australia', app: 'OpenSky' },
  { country: 'New Zealand', app: 'AirShare' },
  { country: 'European Union', app: 'EASA Drone Rules (or local equivalent)' },
  { country: 'Other', app: 'Check local aviation authority' }
];

export default function AddSpotModal({
  draftSpot,
  onClose,
  onPinOnMap,
  onLocationUpdate
}: {
  draftSpot: {lat: number, lng: number, address?: string} | null,
  onClose: () => void,
  onPinOnMap: (searchQuery?: string) => void,
  onLocationUpdate: (lat: number, lng: number, address?: string) => void
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [radius, setRadius] = useState('500'); // Default 500 meters
  const [govApp, setGovApp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState(draftSpot?.address || '');
  const [isSearching, setIsSearching] = useState(false);

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`);
      const results = await response.json();
      
      setIsSearching(false);
      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        const address = place.display_name;
        
        const addressDetails = place.address || {};
        setCity(addressDetails.city || addressDetails.town || addressDetails.village || '');
        setState(addressDetails.state || '');
        setCountry(addressDetails.country || '');

        onLocationUpdate(lat, lng, address);
        if (!name) {
          setName(address.split(',')[0]);
        }
      } else {
        alert("Could not find that location. Please try another search.");
      }
    } catch (error) {
      setIsSearching(false);
      alert("Error searching for location.");
    }
  };

  // Reverse geocode when pinned on map
  useEffect(() => {
    if (draftSpot && !draftSpot.address) {
      const fetchAddress = async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${draftSpot.lat}&lon=${draftSpot.lng}&addressdetails=1`);
          const place = await response.json();
          if (place && place.address) {
            const addressDetails = place.address;
            setCity(addressDetails.city || addressDetails.town || addressDetails.village || '');
            setState(addressDetails.state || '');
            setCountry(addressDetails.country || '');
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
        }
      };
      fetchAddress();
    }
  }, [draftSpot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draftSpot) {
      alert("Please select a location first by searching an address or pinning on the map.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'flightSpots'), {
        name,
        description,
        radius: parseInt(radius, 10) || 500,
        lat: draftSpot.lat,
        lng: draftSpot.lng,
        city,
        state,
        country,
        authorId: user.uid,
        recommendedApps: govApp,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error("Error adding spot:", error);
      alert("Failed to add spot.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Add Safe Fly Spot</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Step 1: Search City to Zoom</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g., San Francisco, CA"
                  className="flex-1 border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center border border-blue-200 disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Step 2: Pin Location on Map</label>
              <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => onPinOnMap(searchQuery)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center"
                >
                  <MapPin className="w-4 h-4 mr-2" /> Select on Map
                </button>
                {draftSpot ? (
                  <p className="text-xs text-green-600 mt-2 font-bold">✓ Location selected: {draftSpot.lat.toFixed(4)}, {draftSpot.lng.toFixed(4)}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 font-medium">Required: Identify the exact spot</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Step 3: Spot Name *</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm" placeholder="e.g., Sunset Beach Park" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Step 4: Flight Radius (meters)</label>
            <input type="number" min="10" max="5000" value={radius} onChange={e => setRadius(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm" placeholder="e.g., 500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Step 5: Notes / Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 h-20 px-3 py-2 border resize-none text-sm" placeholder="Why is this a good spot? Any hazards? Best time to fly?" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Step 6: Gov Approved App / Rules</label>
            <select 
              value={govApp} 
              onChange={e => setGovApp(e.target.value)}
              className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm bg-white"
            >
              <option value="">Select an app (Optional)</option>
              {GOV_APPS.map((app, idx) => (
                <option key={idx} value={app.app}>{app.country} - {app.app}</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-800 mb-2">Step 7: Finalize</label>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-bold transition text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !draftSpot} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition disabled:opacity-50 text-sm shadow-md">
                {submitting ? 'Saving...' : 'Submit Spot'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
