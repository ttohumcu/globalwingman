import React, { useEffect, useState, useRef } from 'react';
import Map from '../components/Map';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, onSnapshot, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db, signInWithGoogle } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Drone, UserPlus, Search, MessageCircle, ShieldCheck, MapPin, Users, Globe, MessageSquare, LocateFixed, X, Award } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [needsHomeBase, setNeedsHomeBase] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number, zoom?: number } | null>(null);
  const [pilots, setPilots] = useState<any[]>([]);
  const [totalConnections, setTotalConnections] = useState(0);
  const [totalForumPosts, setTotalForumPosts] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showCountriesModal, setShowCountriesModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [pilotsInCountry, setPilotsInCountry] = useState(0);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingSpot, setIsAddingSpot] = useState(false);

  const showExpanded = !user || isExpanded;

  // Calculate stats
  const totalPilots = pilots.length;
  const totalDronesCount = pilots.reduce((acc, p) => acc + (p.drones?.length || 0), 0);
  const totalCertificationsCount = pilots.reduce((acc, p) => acc + (p.certifications?.length || 0), 0);
  const uniqueCountries = new Set(
    pilots
      .map(p => {
        if (!p.homeBase?.name) return null;
        const parts = p.homeBase.name.split(',');
        return parts[parts.length - 1].trim();
      })
      .filter(Boolean)
  ).size;

  useEffect(() => {
    const unsubscribePilots = onSnapshot(collection(db, 'users'), (snapshot) => {
      const pilotsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPilots(pilotsData);
    });

    const unsubscribeRequests = onSnapshot(doc(db, 'stats', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setTotalConnections(snapshot.data().totalConnections || 0);
        setTotalForumPosts(snapshot.data().totalForumPosts || 0);
      } else {
        setTotalConnections(0);
        setTotalForumPosts(0);
      }
    });

    // Admin sync for stats
    if (user?.email === 'ttohumcu@gmail.com') {
      const syncStats = async () => {
        try {
          const forumPostsSnap = await getDocs(collection(db, 'forumPosts'));
          const meetupRequestsSnap = await getDocs(query(collection(db, 'meetupRequests'), where('status', '==', 'accepted')));
          
          await setDoc(doc(db, 'stats', 'global'), {
            totalForumPosts: forumPostsSnap.size,
            totalConnections: meetupRequestsSnap.size
          }, { merge: true });
        } catch (error) {
          console.error("Admin sync failed:", error);
        }
      };
      syncStats();
    }

    return () => {
      unsubscribePilots();
      unsubscribeRequests();
    };
  }, [user]);

  const pilotsRef = useRef<any[]>([]);
  useEffect(() => {
    pilotsRef.current = pilots;
  }, [pilots]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const results = await response.json();
      
      setIsSearching(false);
      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        
        // Extract country name
        let countryName = searchQuery;
        if (place.display_name) {
           const parts = place.display_name.split(',');
           countryName = parts[parts.length - 1].trim();
        }
        
        setMapCenter({ lat, lng, zoom: 5 });
        setSelectedCountry(countryName);
        setSearchQuery(countryName);

        // Count pilots in this country
        const count = pilotsRef.current.filter(p => p.homeBase?.name?.includes(countryName)).length;
        setPilotsInCountry(count);
        setIsExpanded(false); // Collapse after successful search
      } else {
        alert("Could not find that location. Please try another search.");
      }
    } catch (error) {
      setIsSearching(false);
      alert("Error searching for location.");
    }
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.address) {
              const country = data.address.country;
              setMapCenter({ lat, lng, zoom: 6 });
              setSelectedCountry(country);
              setSearchQuery(country);
              
              const count = pilotsRef.current.filter(p => p.homeBase?.name?.includes(country)).length;
              setPilotsInCountry(count);
              setIsExpanded(false);
            }
          } catch (error) {
            alert("Could not determine your location.");
          }
        },
        (err) => alert("Could not fetch geolocation. Please allow location access in your browser.")
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleStatClick = (type: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (type === 'countries') {
      setShowCountriesModal(true);
    } else if (type === 'pilots') {
      navigate('/dashboard?tab=users');
    } else if (type === 'connections') {
      navigate('/dashboard?tab=users');
    } else if (type === 'posts') {
      navigate('/dashboard?tab=posts');
    } else if (type === 'drones') {
      navigate('/dashboard?tab=drones');
    } else if (type === 'certs') {
      navigate('/dashboard?tab=certs');
    }
  };

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists() && !snap.data().homeBase) {
          setNeedsHomeBase(true);
          // Redirect immediately to profile to enforce profile creation
          navigate('/profile');
        } else {
          setNeedsHomeBase(false);
        }
      });
    } else {
      setNeedsHomeBase(false);
    }
  }, [user, navigate]);

  return (
    <div className="flex-grow flex flex-col relative min-h-[calc(100vh-64px-68px)]">
      {needsHomeBase && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-blue-600 text-white px-4 py-3 shadow-md flex items-center justify-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-medium mr-4">You're not on the map yet!</span>
          <Link to="/profile" className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-bold hover:bg-blue-50 transition">
            Set Home Base
          </Link>
        </div>
      )}
      
      <div className="fixed inset-0 top-[64px] z-0">
        <Map mapCenter={mapCenter} onMapInteract={() => setIsExpanded(false)} onAddingSpotChange={setIsAddingSpot} isSearchExpanded={showExpanded} />
      </div>

      {!isAddingSpot && (
        <div className={`relative z-10 pointer-events-none flex flex-col items-center px-4 pb-12 transition-all duration-500 ${needsHomeBase ? 'pt-24' : showExpanded ? 'pt-6 md:pt-8' : 'pt-4'}`}>
        
        <div className="flex flex-col items-center w-full max-w-5xl mx-auto pointer-events-none gap-6">
          {/* Unified Stats Boxes (Top) */}
          {showExpanded && (
            <div className="flex flex-row flex-wrap justify-center gap-3 w-full pointer-events-auto">
              <button onClick={() => handleStatClick('pilots')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Users className="w-5 sm:w-6 h-5 sm:h-6 text-blue-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalPilots}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Pilots</div>
              </button>
              <button onClick={() => handleStatClick('drones')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Drone className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalDronesCount}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Drones</div>
              </button>
              <button onClick={() => handleStatClick('certs')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Award className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalCertificationsCount}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Certifications</div>
              </button>
              <button onClick={() => handleStatClick('countries')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Globe className="w-5 sm:w-6 h-5 sm:h-6 text-purple-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{uniqueCountries}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Countries Covered</div>
              </button>
              <button onClick={() => handleStatClick('connections')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <MessageCircle className="w-5 sm:w-6 h-5 sm:h-6 text-green-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalConnections}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Connections Made</div>
              </button>
              <button onClick={() => handleStatClick('posts')} className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl text-center flex-1 min-w-[120px] flex flex-col items-center justify-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalForumPosts}</span>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Forum Topics</div>
              </button>
            </div>
          )}

          {/* Main Search Box */}
          <div 
            className={`bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl pointer-events-auto border border-slate-100 w-full transition-all duration-500 text-center mx-auto ${showExpanded ? 'p-6 sm:p-8 w-full cursor-default' : 'p-3 sm:p-4 max-w-xl hover:bg-white cursor-pointer'}`}
            onClick={() => !showExpanded && setIsExpanded(true)}
          >
            {showExpanded ? (
              <>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                  Traveling to a new country with Drone?
                </h1>
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-6 mb-6 text-left w-full">
                  <h2 className="text-xl font-bold text-blue-900 mb-4 text-center">Connecting Drone Pilots Globally</h2>
                  <p className="text-base text-blue-800 leading-relaxed">
                    Whether you’re an expert in your local skies or planning your next international mission, we’re better together. Join our network to help others navigate regional regulations and discover hidden gems. Give a hand, get a lead, and help a pilot out today.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center space-x-2 mb-2 text-slate-500 text-sm font-medium">
                <Search className="w-4 h-4" />
                <span>Click to expand search</span>
              </div>
            )}

            <form onSubmit={handleSearch} className={`relative mx-auto ${showExpanded ? 'max-w-3xl mb-4' : 'max-w-lg'}`} onClick={(e) => !showExpanded && e.preventDefault()}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className={`${showExpanded ? 'h-6 w-6' : 'h-4 w-4'} text-slate-400`} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What country are you traveling to? (Press Enter)"
                className={`block w-full border-2 border-slate-200 rounded-full leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition shadow-sm ${showExpanded ? 'pl-12 pr-28 py-4 text-lg' : 'pl-10 pr-24 py-2 text-sm'}`}
                readOnly={!showExpanded}
              />
              <div className="absolute inset-y-0 right-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={isSearching || !showExpanded}
                  className={`text-blue-600 rounded-full hover:bg-blue-50 transition ${showExpanded ? 'p-2.5' : 'p-1.5'}`}
                  title="Geolocate me"
                >
                  <LocateFixed className={`${showExpanded ? 'h-6 w-6' : 'h-4 w-4'}`} />
                </button>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim() || !showExpanded}
                  className={`bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition shadow-md ${showExpanded ? 'p-2.5' : 'p-1.5'}`}
                >
                  <Search className={`${showExpanded ? 'h-6 w-6' : 'h-4 w-4'}`} />
                </button>
              </div>
            </form>

            {!user && showExpanded && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl mx-auto mb-2">
                <button onClick={signInWithGoogle} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition shadow-md flex items-center justify-center transform hover:scale-105 w-full sm:w-auto">
                  <Drone className="w-4 h-4 mr-2" />
                  Get Started with Google
                </button>
                <a 
                  href="https://accounts.google.com/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-5 py-2.5 rounded-full text-sm font-bold transition shadow-sm flex items-center justify-center transform hover:scale-105 w-full sm:w-auto"
                >
                  Sign up for Google Account
                </a>
              </div>
            )}

            {selectedCountry && showExpanded && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left w-full">
                <h3 className="font-bold text-blue-900 mb-1 text-lg flex justify-between items-center">
                  <span>{pilotsInCountry} registered {pilotsInCountry === 1 ? 'pilot' : 'pilots'} in {selectedCountry}</span>
                  {!user && pilotsInCountry > 0 && (
                    <button onClick={() => setShowLoginPrompt(true)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition">
                      Login to Connect
                    </button>
                  )}
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  {user ? "Explore the map to connect with them and fly together!" : "Register to connect with them and fly together!"}
                </p>
                <div className="bg-white rounded-xl p-3 text-sm text-slate-700 border border-blue-100">
                  <span className="font-semibold block mb-1 text-blue-900">Drone Recommendation:</span>
                  For {selectedCountry}, bringing a <strong>Sub-250g drone</strong> (like DJI Mini series) is generally recommended to avoid strict regulations, but always check local laws before flying.
                </div>
              </div>
            )}
          </div>

          {/* Steps Boxes */}
          {showExpanded && !user && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full pointer-events-auto transition-opacity duration-500">
              <button onClick={() => setShowLoginPrompt(true)} className="bg-white/95 backdrop-blur-md border border-slate-100 p-6 rounded-2xl shadow-xl text-center flex flex-col items-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                  <UserPlus className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">1. Register</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Create your profile and set your home base.</p>
              </button>
              
              <button onClick={() => setShowLoginPrompt(true)} className="bg-white/95 backdrop-blur-md border border-slate-100 p-6 rounded-2xl shadow-xl text-center flex flex-col items-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-4 shadow-inner">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">2. Find a Pilot</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Search the global map for verified local experts.</p>
              </button>

              <button onClick={() => setShowLoginPrompt(true)} className="bg-white/95 backdrop-blur-md border border-slate-100 p-6 rounded-2xl shadow-xl text-center flex flex-col items-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4 shadow-inner">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">3. Connect</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Send a meetup request and plan your flight.</p>
              </button>

              <button onClick={() => setShowLoginPrompt(true)} className="bg-white/95 backdrop-blur-md border border-slate-100 p-6 rounded-2xl shadow-xl text-center flex flex-col items-center transform transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">4. Fly Safely</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Fly together using their local knowledge.</p>
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Login Required</h2>
              <p className="text-slate-600 mb-6">
                Please sign in to find all other drone pilots globally, view statistics, and make connections.
              </p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => {
                    signInWithGoogle();
                    setShowLoginPrompt(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center"
                >
                  <Drone className="w-5 h-5 mr-2" />
                  Sign in with Google
                </button>
                <button 
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCountriesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            <button 
              onClick={() => setShowCountriesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Covered Countries</h2>
                <p className="text-sm text-slate-500">Pilots are registered in {uniqueCountries} countries.</p>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-2 grid grid-cols-2 gap-2 flex-grow">
              {Array.from(new Set(
                pilots
                  .map(p => {
                    if (!p.homeBase?.name) return null;
                    const parts = p.homeBase.name.split(',');
                    return parts[parts.length - 1].trim();
                  })
                  .filter(Boolean)
              )).sort().map((country, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-700 truncate mr-2" title={country as string}>{country as string}</span>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                    {pilots.filter(p => p.homeBase?.name?.includes(country as string)).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
