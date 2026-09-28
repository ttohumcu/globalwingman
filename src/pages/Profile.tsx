import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Navigate, useNavigate } from 'react-router-dom';
import { MapPin, Award, Shield, Save, LocateFixed, AlertCircle } from 'lucide-react';
import { droneCertifications, countries } from '../data/certifications';
import { droneMakers, makerList } from '../data/drones';
import { allCountries } from '../data/countries';
import { usStates } from '../data/states';

export default function Profile() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          setProfile(snap.data());
        }
      });
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (!profile) return <div className="p-8 text-center">Loading profile...</div>;

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const profileToSave = { ...profile };
      
      // Clean up homeBase if it's incomplete
      if (profileToSave.homeBase) {
        const { country, state, city, lat, lng } = profileToSave.homeBase;
        
        if (!country || country.trim() === '') {
          setErrorMsg("Please provide a Country for your Home Base.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setSaving(false);
          return;
        }

        const normCountry = country.trim().toLowerCase();
        if (normCountry === 'united states' || normCountry === 'us' || normCountry === 'usa' || normCountry === 'united states of america') {
          if (!city || city.trim() === '' || !state || state.trim() === '') {
            setErrorMsg("For United States, both City and State are mandatory.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSaving(false);
            return;
          }
        } else {
          if ((!city || city.trim() === '') && (!state || state.trim() === '')) {
            setErrorMsg("Please provide either a City or State so we have an exact location for your home base.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSaving(false);
            return;
          }
        }
        
        // Construct name if not provided by search
        if (!profileToSave.homeBase.name) {
          const parts = [];
          if (city) parts.push(city);
          if (state) parts.push(state);
          if (country) parts.push(country);
          profileToSave.homeBase.name = parts.join(', ');
        }

        if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
          // Auto-fetch coordinates during save so user doesn't have to hit "Search" manually
          try {
            const query = encodeURIComponent(profileToSave.homeBase.name);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            if (data && data.length > 0) {
              profileToSave.homeBase.lat = parseFloat(data[0].lat);
              profileToSave.homeBase.lng = parseFloat(data[0].lon);
            } else {
              setErrorMsg("Could not find coordinates for this location. Please check your spelling or use 'Search Coordinates'.");
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setSaving(false);
              return;
            }
          } catch (e) {
            console.error("Geocoding error:", e);
            setErrorMsg("Error fetching location coordinates. Please try again.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSaving(false);
            return;
          }
        }
      }

      // Clean up certifications if they are empty
      if (profileToSave.certifications) {
        profileToSave.certifications = profileToSave.certifications.filter((cert: any) => cert.country && cert.name);
      }

      // Clean up drones if they are empty
      if (profileToSave.drones) {
        profileToSave.drones = profileToSave.drones.filter((drone: any) => drone.make && drone.model);
      }

      await updateDoc(doc(db, 'users', user.uid), profileToSave);
      setProfile(profileToSave);
      setSuccessMsg('Profile saved successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error("Error saving profile", error);
      setErrorMsg('Failed to save profile.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleGetLocation = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const name = data.display_name || 'My Current Location';
            
            setProfile({
              ...profile,
              homeBase: {
                ...profile.homeBase,
                lat,
                lng,
                name
              }
            });
            setSuccessMsg("Location found successfully!");
          } catch (e) {
            setProfile({
              ...profile,
              homeBase: {
                ...profile.homeBase,
                lat,
                lng,
                name: profile.homeBase?.name || 'My Current Location'
              }
            });
          }
        },
        (error) => {
          setErrorMsg("Could not get location. Please ensure location permissions are granted.");
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
    }
  };

  const handleSearchLocation = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const { city, state, country } = profile.homeBase || {};
    if (!country || (!city && !state)) {
      setErrorMsg("Please enter a country and at least a city or state to search.");
      return;
    }
    
    const queryParts = [];
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    if (country) queryParts.push(country);
    const query = queryParts.join(', ');
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const results = await response.json();
      
      if (results && results.length > 0) {
        const place = results[0];
        setProfile({
          ...profile,
          homeBase: {
            ...profile.homeBase,
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            name: place.display_name
          }
        });
        setSuccessMsg("Location found and updated in coordinates!");
      } else {
        setErrorMsg("Could not find that location. Please try another search.");
      }
    } catch (error) {
      setErrorMsg("Error searching for location.");
    }
  };

  const addCertification = () => {
    setProfile({
      ...profile,
      certifications: [...(profile.certifications || []), { country: '', name: '' }]
    });
  };

  const updateCertification = (index: number, field: string, value: string) => {
    const newCerts = [...(profile.certifications || [])];
    newCerts[index][field] = value;
    // Reset name if country changes
    if (field === 'country') {
      newCerts[index].name = '';
    }
    setProfile({ ...profile, certifications: newCerts });
  };

  const removeCertification = (index: number) => {
    const newCerts = [...(profile.certifications || [])];
    newCerts.splice(index, 1);
    setProfile({ ...profile, certifications: newCerts });
  };

  const addDrone = () => {
    setProfile({
      ...profile,
      drones: [...(profile.drones || []), { make: '', model: '' }]
    });
  };

  const updateDrone = (index: number, field: string, value: string) => {
    const newDrones = [...(profile.drones || [])];
    newDrones[index][field] = value;
    if (field === 'make') {
      newDrones[index].model = ''; // Reset model if make changes
    }
    setProfile({ ...profile, drones: newDrones });
  };

  const removeDrone = (index: number) => {
    const newDrones = [...(profile.drones || [])];
    newDrones.splice(index, 1);
    setProfile({ ...profile, drones: newDrones });
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-50">
      {/* Hero Header */}
      <div className="relative bg-slate-900 text-white py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1524143986875-3b098d78b363?auto=format&fit=crop&q=80" 
            alt="Drone landscape" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4 flex items-center">
            <Award className="w-10 h-10 mr-4 text-blue-400" />
            Pilot Profile
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Manage your home base, certifications, and gear to help other pilots find you.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 -mt-8 relative z-20">
        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start shadow-lg">
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Error</h4>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-start shadow-lg">
            <Award className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Success</h4>
              <p className="text-sm mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {(!profile.homeBase || !profile.homeBase.name) && !errorMsg && !successMsg && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-start shadow-lg">
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Welcome to Drone Connect!</h4>
              <p className="text-sm mt-1">Please complete your profile by setting your <strong>Home Base</strong> (City, State, Country) to appear on the global map and connect with other pilots.</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-10 text-white relative">
            <div className="flex items-center space-x-6 relative z-10">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-800" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold">
                {profile.displayName?.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{profile.displayName}</h1>
              <p className="text-blue-400 font-medium text-sm">{user?.email}</p>
              <p className="text-slate-400 mt-1 text-xs">Manage your pilot profile and certifications</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Account Info */}
          <div className="pb-6 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Account Information</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-1">Registered Email</label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-600 text-sm font-mono">
                {user?.email}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">Your registered email cannot be changed from the profile editor.</p>
            </div>
          </div>

          {/* Step 1: Status */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">1</span>
              <Shield className="w-5 h-5 mr-2 text-blue-500" />
              Pick Pilot Status
            </h3>
            <select 
              value={profile.status} 
              onChange={e => setProfile({...profile, status: e.target.value})}
              className="w-full max-w-md border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="Available to Guide">Available to Guide</option>
              <option value="Looking to Fly">Looking to Fly</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          {/* Step 2 & 3: Home Base */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">2</span>
                <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                Home Base
              </h3>
              <button 
                onClick={handleSearchLocation}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition text-sm"
              >
                Search Coordinates
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4 font-medium">Setting your Home Base adds you to the global pilot map. Please search coordinates after entering your location.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country *</label>
                <select 
                  value={profile.homeBase?.country || ''} 
                  onChange={e => {
                    const newCountry = e.target.value;
                    const isNewUS = newCountry === 'United States of America' || newCountry === 'United States';
                    const isOldUS = profile.homeBase?.country === 'United States of America' || profile.homeBase?.country === 'United States';
                    
                    // Clear the state if switching between US / non-US to prevent invalid free-text states in US or rigid states in non-US
                    let newState = profile.homeBase?.state;
                    if (isNewUS !== isOldUS) {
                      newState = '';
                    }

                    setProfile({...profile, homeBase: {...profile.homeBase, country: newCountry, state: newState}});
                  }}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Country</option>
                  {allCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State / Province {profile.homeBase?.country === 'United States of America' || profile.homeBase?.country === 'United States' ? '*' : ''}
                </label>
                {profile.homeBase?.country === 'United States of America' || profile.homeBase?.country === 'United States' ? (
                  <select
                    value={profile.homeBase?.state || ''}
                    onChange={e => setProfile({...profile, homeBase: {...profile.homeBase, state: e.target.value}})}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="" disabled>Select State</option>
                    {usStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={profile.homeBase?.state || ''} 
                    onChange={e => setProfile({...profile, homeBase: {...profile.homeBase, state: e.target.value}})}
                    placeholder={profile.homeBase?.country ? "e.g., Province/Region" : "Select country first"}
                    disabled={!profile.homeBase?.country}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City {profile.homeBase?.country === 'United States of America' || profile.homeBase?.country === 'United States' ? '*' : ''}
                </label>
                <input 
                  type="text" 
                  value={profile.homeBase?.city || ''} 
                  onChange={e => setProfile({...profile, homeBase: {...profile.homeBase, city: e.target.value}})}
                  placeholder="e.g., Miami"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">3</span>
                Automatic Location
              </h3>
              <button 
                onClick={handleGetLocation}
                className="text-sm flex items-center text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                <LocateFixed className="w-4 h-4 mr-1.5" />
                Use Current Location
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={profile.homeBase?.lat || ''} 
                  onChange={e => setProfile({...profile, homeBase: {...profile.homeBase, lat: parseFloat(e.target.value)}})}
                  placeholder="25.7617"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={profile.homeBase?.lng || ''} 
                  onChange={e => setProfile({...profile, homeBase: {...profile.homeBase, lng: parseFloat(e.target.value)}})}
                  placeholder="-80.1918"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Certifications */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">4</span>
                <Award className="w-5 h-5 mr-2 text-blue-500" />
                Certifications
              </h3>
              <button 
                onClick={addCertification}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Certification
              </button>
            </div>
            
            <div className="space-y-3">
              {(!profile.certifications || profile.certifications.length === 0) && (
                <p className="text-slate-500 text-sm italic">No certifications added yet.</p>
              )}
              {profile.certifications?.map((cert: any, idx: number) => (
                <div key={idx} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-start">
                  <div className="flex-1 w-full">
                    <select 
                      value={cert.country}
                      onChange={e => updateCertification(idx, 'country', e.target.value)}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Region/Country</option>
                      {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-[2] w-full flex space-x-2">
                    <select 
                      value={cert.name}
                      onChange={e => updateCertification(idx, 'name', e.target.value)}
                      disabled={!cert.country}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="" disabled>Select Certification</option>
                      {cert.country && droneCertifications[cert.country]?.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => removeCertification(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 5: Drones */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">5</span>
                My Drones
              </h3>
              <button 
                onClick={addDrone}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Drone
              </button>
            </div>
            
            <div className="space-y-3">
              {(!profile.drones || profile.drones.length === 0) && (
                <p className="text-slate-500 text-sm italic">No drones added yet.</p>
              )}
              {profile.drones?.map((drone: any, idx: number) => (
                <div key={idx} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-start">
                  <div className="flex-1 w-full">
                    <select 
                      value={makerList.includes(drone.make) ? drone.make : (drone.make ? 'Other' : '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          updateDrone(idx, 'make', 'Other'); // Will replace with text input logic inside UI
                        } else {
                          updateDrone(idx, 'make', val);
                        }
                      }}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Make</option>
                      {makerList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {drone.make === 'Other' && (
                      <input 
                        type="text" 
                        placeholder="Custom Make"
                        value={drone.customMake || ''} // Handle custom tracking
                        onChange={e => {
                           const newDrones = [...profile.drones];
                           newDrones[idx].customMake = e.target.value;
                           // Make sure to overwrite actual model too in cleanup or final save
                           setProfile({...profile, drones: newDrones});
                        }}
                        onBlur={e => updateDrone(idx, 'make', e.target.value)} 
                        className="w-full mt-2 border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    )}
                  </div>
                  <div className="flex-[2] w-full flex space-x-2">
                    {drone.make && droneMakers[drone.make] && droneMakers[drone.make].length > 0 && droneMakers[drone.make][0] !== 'Other' ? (
                      <select 
                        value={drone.model}
                        onChange={e => updateDrone(idx, 'model', e.target.value)}
                        className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="" disabled>Select Model</option>
                        {droneMakers[drone.make].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={drone.model} 
                        onChange={e => updateDrone(idx, 'model', e.target.value)}
                        placeholder="Enter Model / Details text"
                        className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    )}
                    <button 
                      onClick={() => removeDrone(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 6: Socials */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">6</span>
                Social Links
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">X (Twitter) Profile URL</label>
                <input 
                  type="url" 
                  value={profile.socials?.x || ''} 
                  onChange={e => setProfile({...profile, socials: {...profile.socials, x: e.target.value}})}
                  placeholder="https://x.com/yourusername"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instagram Profile URL</label>
                <input 
                  type="url" 
                  value={profile.socials?.instagram || ''} 
                  onChange={e => setProfile({...profile, socials: {...profile.socials, instagram: e.target.value}})}
                  placeholder="https://instagram.com/yourusername"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">YouTube Channel URL</label>
                <input 
                  type="url" 
                  value={profile.socials?.youtube || ''} 
                  onChange={e => setProfile({...profile, socials: {...profile.socials, youtube: e.target.value}})}
                  placeholder="https://youtube.com/@yourchannel"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Step 7: Save Button */}
          <div className="pt-6 border-t border-slate-100 flex flex-col items-end">
            {errorMsg && (
              <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start text-sm font-medium">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center w-full justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2">7</span>
                <h3 className="text-lg font-semibold text-slate-900">Save Changes</h3>
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition flex items-center disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
