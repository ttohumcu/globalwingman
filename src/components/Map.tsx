import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Navigation, MapPin as MapPinIcon, Plus, Trash2, List } from 'lucide-react';
import MeetupModal from './MeetupModal';
import AddSpotModal from './AddSpotModal';

const pilotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pilotAvailableIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const spotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const regulationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Pilot {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  homeBase?: { lat: number; lng: number; name: string };
  status: string;
  certifications?: { country: string; name: string }[];
  bio?: string;
}

interface FlightSpot {
  id: string;
  name: string;
  description?: string;
  radius?: number;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  authorId: string;
  recommendedApps?: string;
}

const MapAutoZoom = ({ homeBase, mapCenter, draftSpot }: { homeBase?: { lat: number, lng: number }, mapCenter?: { lat: number, lng: number, zoom?: number } | null, draftSpot?: {lat: number, lng: number} | null }) => {
  const map = useMap();
  const hasZoomed = useRef(false);

  useEffect(() => {
    if (map && draftSpot) {
      map.setView([draftSpot.lat, draftSpot.lng], 12);
    } else if (map && mapCenter) {
      map.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom || 10);
    } else if (map && homeBase && !hasZoomed.current) {
      map.setView([homeBase.lat, homeBase.lng], 10);
      hasZoomed.current = true;
    }
  }, [map, homeBase, mapCenter, draftSpot]);

  return null;
};

const MapEvents = ({ isAddingSpot, onMapClick, onMapInteract }: { isAddingSpot: boolean, onMapClick: (lat: number, lng: number) => void, onMapInteract?: () => void }) => {
  useMapEvents({
    click(e) {
      if (isAddingSpot) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
      if (onMapInteract) onMapInteract();
    },
    dragstart() {
      if (onMapInteract) onMapInteract();
    },
    zoomstart() {
      if (onMapInteract) onMapInteract();
    }
  });
  return null;
};

const MapPanToSpot = ({ spot }: { spot: FlightSpot | null }) => {
  const map = useMap();
  useEffect(() => {
    if (spot && map) {
      map.setView([spot.lat, spot.lng], 14, { animate: true });
    }
  }, [spot, map]);
  return null;
};

export default function Map({ mapCenter, onMapInteract, onAddingSpotChange, isSearchExpanded }: { mapCenter?: { lat: number, lng: number, zoom?: number } | null, onMapInteract?: () => void, onAddingSpotChange?: (isAdding: boolean) => void, isSearchExpanded?: boolean }) {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [spots, setSpots] = useState<FlightSpot[]>([]);
  const [regulations, setRegulations] = useState<any[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<FlightSpot | null>(null);
  const [selectedRegulation, setSelectedRegulation] = useState<any | null>(null);
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftSpot, setDraftSpot] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showSpotList, setShowSpotList] = useState(false);
  const { user } = useAuth();

  const currentUserProfile = pilots.find(p => p.uid === user?.uid);

  const handleDeleteSpot = async () => {
    if (!selectedSpot) return;
    try {
      await deleteDoc(doc(db, 'flightSpots', selectedSpot.id));
      setSelectedSpot(null);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error("Error deleting spot", error);
    }
  };

  useEffect(() => {
    const unsubscribePilots = onSnapshot(collection(db, 'users'), (snapshot) => {
      const pilotsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pilot));
      setPilots(pilotsData);
    });
    
    const unsubscribeRegulations = onSnapshot(collection(db, 'regulations'), (snapshot) => {
      const regsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegulations(regsData);
    });

    let unsubscribeSpots = () => {};
    if (user) {
      unsubscribeSpots = onSnapshot(collection(db, 'flightSpots'), (snapshot) => {
        const spotsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightSpot));
        setSpots(spotsData);
      });
    } else {
      setSpots([]);
    }
    
    return () => {
      unsubscribePilots();
      unsubscribeSpots();
      unsubscribeRegulations();
    };
  }, [user]);

  const groupedSpots = spots.reduce((acc, spot) => {
    const country = spot.country || 'Unknown Country';
    const state = spot.state || 'Unknown State';
    const city = spot.city || 'Unknown City';

    if (!acc[country]) acc[country] = {};
    if (!acc[country][state]) acc[country][state] = {};
    if (!acc[country][state][city]) acc[country][state][city] = [];

    acc[country][state][city].push(spot);
    return acc;
  }, {} as Record<string, Record<string, Record<string, FlightSpot[]>>>);

  return (
    <div className="flex-grow relative w-full h-full">
      {user && (
        <div className="absolute bottom-24 left-6 z-[1000]">
          <button
            onClick={() => {
              setShowSpotList(!showSpotList);
              if (onMapInteract) onMapInteract();
            }}
            className={`bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-lg flex items-center transition border border-slate-200 ${!showSpotList ? 'animate-pulse ring-2 ring-blue-500 ring-offset-2' : ''}`}
          >
            <List className="w-5 h-5 mr-2" /> {showSpotList ? 'Hide Spots List' : 'View Spots List'}
          </button>
          
          {showSpotList && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl w-80 max-h-[60vh] overflow-y-auto border border-slate-100 flex flex-col">
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h3 className="font-bold text-slate-800">Safe Fly Spots</h3>
                <p className="text-xs text-slate-500">{spots.length} spots available</p>
              </div>
              <div className="divide-y divide-slate-100">
                {spots.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No spots added yet.</div>
                ) : (
                  Object.entries(groupedSpots as any).map(([country, states]: [string, any]) => (
                    <div key={country} className="p-2">
                      <h4 className="font-bold text-slate-700 text-sm px-2 py-1 bg-slate-50 rounded">{country}</h4>
                      {Object.entries(states as any).map(([state, cities]: [string, any]) => (
                        <div key={state} className="ml-2 mt-1">
                          <h5 className="font-semibold text-slate-600 text-xs px-2 py-1">{state}</h5>
                          {Object.entries(cities as any).map(([city, citySpots]: [string, any]) => (
                            <div key={city} className="ml-2 mt-1">
                              <h6 className="font-medium text-slate-500 text-xs px-2">{city}</h6>
                              <div className="mt-1 space-y-1">
                                {(citySpots as FlightSpot[]).map(spot => (
                                  <button
                                    key={spot.id}
                                    onClick={() => {
                                      setSelectedSpot(spot);
                                      setSelectedPilot(null);
                                      if (window.innerWidth < 768) {
                                        setShowSpotList(false);
                                      }
                                      if (onMapInteract) onMapInteract();
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-50 transition flex flex-col rounded-md border border-transparent hover:border-slate-200"
                                  >
                                    <span className="font-medium text-slate-800 text-sm">{spot.name}</span>
                                    {spot.description && <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{spot.description}</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {user && !isSearchExpanded && (
        <div className="absolute top-6 right-6 z-[1000]">
          <button
            onClick={() => {
              if (onMapInteract) onMapInteract();
              if (isAddingSpot) {
                setIsAddingSpot(false);
                if (onAddingSpotChange) onAddingSpotChange(false);
              } else {
                setShowAddModal(true);
                setDraftSpot(null);
                if (onAddingSpotChange) onAddingSpotChange(true);
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium shadow-lg flex items-center transition ${
              isAddingSpot ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isAddingSpot ? 'Cancel Pinning' : (
              <>
                <Plus className="w-5 h-5 mr-1" /> Add Safe Fly Spot
              </>
            )}
          </button>
          {isAddingSpot && (
            <div className="mt-2 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md text-sm text-slate-700 border border-slate-200">
              Click anywhere on the map to place a spot.
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={[20, 0]}
        zoom={3}
        className={`w-full h-full absolute inset-0 z-0 ${isAddingSpot ? 'cursor-crosshair' : ''}`}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAutoZoom homeBase={currentUserProfile?.homeBase} mapCenter={mapCenter} draftSpot={draftSpot} />
        <MapPanToSpot spot={selectedSpot} />
        <MapEvents 
          isAddingSpot={isAddingSpot} 
          onMapClick={(lat, lng) => {
            setDraftSpot({ lat, lng });
            setIsAddingSpot(false);
            setShowAddModal(true);
          }} 
          onMapInteract={onMapInteract}
        />
        
        <MarkerClusterGroup chunkedLoading>
          {pilots.map((pilot) => {
            if (!pilot.homeBase) return null;
            return (
              <Marker
                key={pilot.id}
                position={[pilot.homeBase.lat, pilot.homeBase.lng]}
                icon={pilot.status === 'Available to Guide' ? pilotAvailableIcon : pilotIcon}
                interactive={!!user}
                eventHandlers={{
                  click: () => {
                    if (!user) return;
                    setSelectedPilot(pilot);
                    setSelectedSpot(null);
                    setSelectedRegulation(null);
                  },
                }}
              />
            );
          })}
        </MarkerClusterGroup>

        {spots.map((spot) => (
          <React.Fragment key={spot.id}>
            <Marker
              position={[spot.lat, spot.lng]}
              icon={spotIcon}
              interactive={!!user}
              eventHandlers={{
                click: () => {
                  if (!user) return;
                  setSelectedSpot(spot);
                  setSelectedPilot(null);
                  setSelectedRegulation(null);
                  setIsConfirmingDelete(false);
                },
              }}
            />
            {spot.radius && (
              <Circle 
                center={[spot.lat, spot.lng]} 
                radius={spot.radius} 
                pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.2, weight: 2 }} 
                interactive={false}
              />
            )}
          </React.Fragment>
        ))}

        {regulations.map((reg) => {
          if (!reg.lat || !reg.lng) return null;
          return (
            <Marker
              key={reg.id}
              position={[reg.lat, reg.lng]}
              icon={regulationIcon}
              interactive={true}
              eventHandlers={{
                click: () => {
                  setSelectedRegulation(reg);
                  setSelectedSpot(null);
                  setSelectedPilot(null);
                },
              }}
            />
          );
        })}
      </MapContainer>

      {showAddModal && (
        <AddSpotModal 
          draftSpot={draftSpot} 
          onClose={() => { setShowAddModal(false); setDraftSpot(null); setIsAddingSpot(false); if (onAddingSpotChange) onAddingSpotChange(false); }} 
          onPinOnMap={() => { setShowAddModal(false); setIsAddingSpot(true); if (onAddingSpotChange) onAddingSpotChange(true); }}
          onLocationUpdate={(lat, lng, address) => { setDraftSpot({lat, lng, address}); }}
        />
      )}

      {selectedRegulation && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-[1000] border border-slate-100">
          <button 
            onClick={() => setSelectedRegulation(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <MapPinIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedRegulation.country}</h3>
              <p className="text-sm text-slate-500">Regulation</p>
            </div>
          </div>
          
          <div className="mb-4">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {selectedRegulation.droneType}
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{selectedRegulation.summary}</p>

          {selectedRegulation.noFlyWarnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <h4 className="text-amber-800 font-semibold text-xs mb-1">No-Fly Warnings</h4>
              <p className="text-amber-700 text-sm">{selectedRegulation.noFlyWarnings}</p>
            </div>
          )}

          {selectedRegulation.officialLink && (
            <a href={selectedRegulation.officialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Official Source →
            </a>
          )}
        </div>
      )}

      {selectedSpot && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-[1000] border border-slate-100">
          <button 
            onClick={() => setSelectedSpot(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <MapPinIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedSpot.name}</h3>
              <p className="text-sm text-slate-500">Safe Fly Location</p>
            </div>
          </div>
          
          {selectedSpot.description && (
            <p className="text-sm text-slate-600 mb-4">{selectedSpot.description}</p>
          )}

          {selectedSpot.radius && (
            <p className="text-sm text-slate-600 mb-4 font-medium">
              Flight Radius: {selectedSpot.radius} meters
            </p>
          )}

          {selectedSpot.recommendedApps && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommended Apps/Links</h4>
              <p className="text-sm text-blue-600">{selectedSpot.recommendedApps}</p>
            </div>
          )}

          {(user?.uid === selectedSpot.authorId || user?.email === 'ttohumcu@gmail.com') && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              {isConfirmingDelete ? (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-800 mb-2 font-medium">Delete this spot permanently?</p>
                  <div className="flex space-x-2">
                    <button onClick={() => setIsConfirmingDelete(false)} className="flex-1 bg-white text-slate-600 border border-slate-200 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50">Cancel</button>
                    <button onClick={handleDeleteSpot} className="flex-1 bg-red-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-red-700">Yes, Delete</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingDelete(true)} className="w-full flex items-center justify-center text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-medium transition">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Spot
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {selectedPilot && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-[1000] border border-slate-100">
          <button 
            onClick={() => setSelectedPilot(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
          <div className="flex items-center space-x-4 mb-4">
            {selectedPilot.photoURL ? (
              <img src={selectedPilot.photoURL} alt={selectedPilot.displayName} className="w-16 h-16 rounded-full border-2 border-blue-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-500">{selectedPilot.displayName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedPilot.displayName}</h3>
              <p className="text-sm text-slate-500 flex items-center mt-1">
                <Navigation className="w-4 h-4 mr-1" />
                {selectedPilot.homeBase?.name || 'Unknown Location'}
              </p>
            </div>
          </div>
          
          {user ? (
            <>
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedPilot.status === 'Available to Guide' ? 'bg-green-100 text-green-800' : 
                  selectedPilot.status === 'Looking to Fly' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {selectedPilot.status}
                </span>
              </div>
              
              {selectedPilot.bio && (
                <p className="text-sm text-slate-600 mb-4">{selectedPilot.bio}</p>
              )}

              {selectedPilot.certifications && selectedPilot.certifications.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Certifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPilot.certifications.map((cert, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {cert.country}: {cert.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPilot.socials && (selectedPilot.socials.x || selectedPilot.socials.instagram || selectedPilot.socials.youtube) && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Socials</h4>
                  <div className="flex space-x-3">
                    {selectedPilot.socials.x && (
                      <a href={selectedPilot.socials.x} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    )}
                    {selectedPilot.socials.instagram && (
                      <a href={selectedPilot.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                    {selectedPilot.socials.youtube && (
                      <a href={selectedPilot.socials.youtube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-red-600 transition">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <MeetupModal pilot={selectedPilot} onClose={() => setSelectedPilot(null)} />
            </>
          ) : (
            <div className="bg-slate-50 p-4 rounded-lg text-center mt-4">
              <p className="text-sm text-slate-600">Sign in to view full profile, certifications, and request a meetup.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
