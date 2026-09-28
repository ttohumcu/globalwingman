import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Plus, ExternalLink, AlertTriangle, BookOpen, Globe, MapPin, Smartphone, ChevronDown, Edit2, Trash2, LocateFixed } from 'lucide-react';
import { allCountries } from '../data/countries';

interface Regulation {
  id: string;
  country: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
  droneType: string;
  summary: string;
  officialLink?: string;
  noFlyWarnings?: string;
  updatedAt: any;
  updatedBy?: string;
}

const MAJOR_AUTHORITIES = [
  { country: 'United States', flag: '🇺🇸', name: 'FAA', url: 'https://www.faa.gov/uas', desc: 'Federal Aviation Administration' },
  { country: 'European Union', flag: '🇪🇺', name: 'EASA', url: 'https://www.easa.europa.eu/en/domains/civil-drones', desc: 'European Union Aviation Safety Agency' },
  { country: 'United Kingdom', flag: '🇬🇧', name: 'CAA', url: 'https://www.caa.co.uk/drones/', desc: 'Civil Aviation Authority' },
  { country: 'Canada', flag: '🇨🇦', name: 'Transport Canada', url: 'https://tc.canada.ca/en/aviation/drone-safety', desc: 'Transport Canada Civil Aviation' },
  { country: 'Australia', flag: '🇦🇺', name: 'CASA', url: 'https://www.casa.gov.au/drones', desc: 'Civil Aviation Safety Authority' },
];

const OTHER_AUTHORITIES = [
  { country: 'Turkey', name: 'SHGM', url: 'https://iha.shgm.gov.tr/' },
  { country: 'Brazil', name: 'ANAC', url: 'https://www.gov.br/anac/pt-br/assuntos/drones' },
  { country: 'India', name: 'Digital Sky (DGCA)', url: 'https://digitalsky.dgca.gov.in/' },
  { country: 'Ireland', name: 'IAA', url: 'https://www.iaa.ie/general-aviation/drones' },
  { country: 'Japan', name: 'MLIT', url: 'https://www.mlit.go.jp/koku/koku_tk10_000003.html' },
  { country: 'New Zealand', name: 'CAA NZ', url: 'https://www.aviation.govt.nz/drones/' },
  { country: 'Singapore', name: 'CAAS', url: 'https://www.caas.gov.sg/public-passengers/unmanned-aircraft-systems' },
  { country: 'South Africa', name: 'SACAA', url: 'https://www.caa.co.za/industry-information/unmanned-aircraft-systems/' },
  { country: 'Switzerland', name: 'FOCA', url: 'https://www.bazl.admin.ch/bazl/en/home/drohnen.html' },
  { country: 'UAE', name: 'GCAA', url: 'https://www.gcaa.gov.ae/en/pages/uas.aspx' },
  { country: 'Mexico', name: 'AFAC', url: 'https://www.gob.mx/afac/acciones-y-programas/rpas-drones' },
  { country: 'China', name: 'CAAC', url: 'http://www.caac.gov.cn/en/SY/' },
  { country: 'South Korea', name: 'MOLIT', url: 'http://www.molit.go.kr/english/USR/BORD0201/m_28286/BRD.jsp' },
  { country: 'Thailand', name: 'CAAT', url: 'https://www.caat.or.th/en/archives/27220' },
  { country: 'Philippines', name: 'CAAP', url: 'https://caap.gov.ph/' },
  { country: 'Malaysia', name: 'CAAM', url: 'https://www.caam.gov.my/sectors-divisions/flight-operations/unmanned-aircraft-system-uas/' },
  { country: 'Indonesia', name: 'DGCA', url: 'http://hubud.dephub.go.id/' },
  { country: 'Argentina', name: 'ANAC', url: 'https://www.argentina.gob.ar/anac/drones' },
  { country: 'Chile', name: 'DGAC', url: 'https://www.dgac.gob.cl/rpas-drones/' },
  { country: 'Colombia', name: 'Aerocivil', url: 'https://www.aerocivil.gov.co/autoridad-de-la-aviacion-civil/sistemas-de-aeronaves-no-tripuladas-uas' },
  { country: 'Peru', name: 'MTC / DGAC', url: 'https://www.gob.pe/mtc' },
  { country: 'Israel', name: 'CAAI', url: 'https://www.gov.il/en/departments/civil_aviation_authority/eng' },
  { country: 'Kenya', name: 'KCAA', url: 'https://www.kcaa.or.ke/rpas' },
  { country: 'Nigeria', name: 'NCAA', url: 'https://ncaa.gov.ng/' },
  { country: 'Norway', name: 'CAA Norway', url: 'https://luftfartstilsynet.no/en/drones/' },
  { country: 'Iceland', name: 'ICETRA', url: 'https://www.icetra.is/aviation/drones/' },
  { country: 'Vietnam', name: 'Ministry of Defence', url: 'http://mod.gov.vn/' },
  { country: 'Saudi Arabia', name: 'GACA', url: 'https://gaca.gov.sa/' },
  { country: 'Taiwan', name: 'CAA', url: 'https://www.caa.gov.tw/article.aspx?a=3214&lang=2' },
  { country: 'Hong Kong', name: 'CAD', url: 'https://www.cad.gov.hk/english/sua.html' },
  { country: 'Macau', name: 'AACM', url: 'https://www.aacm.gov.mo/' },
  { country: 'Sri Lanka', name: 'CAA', url: 'https://www.caa.lk/en/faqs/for-drone-users' },
  { country: 'Nepal', name: 'CAAN', url: 'https://caanepal.gov.np/drone' },
  { country: 'Maldives', name: 'MNDF / CAA', url: 'https://www.caa.gov.mv/drones' },
  { country: 'Fiji', name: 'CAAF', url: 'https://caaf.org.fj/' },
  { country: 'Bahamas', name: 'CAA', url: 'https://www.bcaa.gov.bs/' },
  { country: 'Costa Rica', name: 'DGAC', url: 'https://www.dgac.go.cr/' },
  { country: 'Panama', name: 'AAC', url: 'https://www.aeronautica.gob.pa/' },
  { country: 'Dominican Republic', name: 'IDAC', url: 'https://www.idac.gob.do/rpas-drones/' },
  { country: 'Jamaica', name: 'JCAA', url: 'https://www.jcaa.gov.jm/' },
  { country: 'Trinidad and Tobago', name: 'TTCAA', url: 'https://caa.gov.tt/' },
  { country: 'Qatar', name: 'QCAA', url: 'https://www.caa.gov.qa/' },
  { country: 'Oman', name: 'CAA', url: 'https://www.caa.gov.om/' },
  { country: 'Kuwait', name: 'DGCA', url: 'https://www.dgca.gov.kw/' },
  { country: 'Bahrain', name: 'MTT', url: 'https://www.mtt.gov.bh/' },
  { country: 'Jordan', name: 'CARC', url: 'https://carc.gov.jo/' },
  { country: 'Lebanon', name: 'DGCA', url: 'https://www.dgca.gov.lb/' },
  { country: 'Rwanda', name: 'RCAA', url: 'https://www.caa.gov.rw/' },
  { country: 'Tanzania', name: 'TCAA', url: 'https://www.tcaa.go.tz/' },
  { country: 'Uganda', name: 'UCAA', url: 'https://caa.go.ug/' },
  { country: 'Ghana', name: 'GCAA', url: 'https://www.gcaa.com.gh/' },
  { country: 'Zambia', name: 'ZCAA', url: 'https://www.zcaa.co.zm/' },
  { country: 'Zimbabwe', name: 'CAAZ', url: 'https://www.caaz.co.zw/' },
  { country: 'Botswana', name: 'CAAB', url: 'https://www.caab.co.bw/' },
  { country: 'Namibia', name: 'NCAA', url: 'https://www.ncaa.com.na/' },
  { country: 'Mauritius', name: 'DCA', url: 'https://civil-aviation.govmu.org/' },
  { country: 'Seychelles', name: 'SCAA', url: 'https://www.scaa.sc/' }
].sort((a, b) => a.country.localeCompare(b.country));

const BANNED_COUNTRIES = [
  { country: 'Cuba', notes: 'Drones are strictly prohibited and will be confiscated at customs.' },
  { country: 'Egypt', notes: 'Banned without prior approval from the Ministry of Defense (rarely granted to tourists).' },
  { country: 'Morocco', notes: 'Drones are banned and will be confiscated at the border.' },
  { country: 'Iran', notes: 'Illegal to fly without explicit permits; extremely high risk of espionage charges.' },
  { country: 'Iraq', notes: 'Banned for security reasons.' },
  { country: 'North Korea', notes: 'Strictly prohibited.' },
  { country: 'Syria', notes: 'Strictly prohibited.' },
  { country: 'Nicaragua', notes: 'Banned and will be confiscated at customs.' },
  { country: 'Senegal', notes: 'Banned for tourists; requires special authorization.' },
  { country: 'Uzbekistan', notes: 'Illegal to import or fly without special permits.' },
  { country: 'Brunei', notes: 'Highly restricted, effectively banned for tourists.' },
  { country: 'Madagascar', notes: 'Often confiscated at customs without prior authorization.' }
].sort((a, b) => a.country.localeCompare(b.country));

export default function Regulations() {
  const { user } = useAuth();
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [droneType, setDroneType] = useState('Sub-250g');
  const [summary, setSummary] = useState('');
  const [officialLink, setOfficialLink] = useState('');
  const [noFlyWarnings, setNoFlyWarnings] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'regulations'), (snapshot) => {
      const regsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Regulation));
      setRegulations(regsData);
    });
    return unsubscribe;
  }, []);

  const handleSearchLocation = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!country || (!city && !state)) {
      alert("Please enter a country and at least a city or state to search.");
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
        setLat(parseFloat(place.lat));
        setLng(parseFloat(place.lon));
        alert("Coordinates found and updated!");
      } else {
        alert("Could not find that location. Please try another search.");
      }
    } catch (error) {
      alert("Error searching for location.");
    }
  };

  const handleEdit = (reg: Regulation) => {
    setEditingId(reg.id);
    setCountry(reg.country);
    setState(reg.state || '');
    setCity(reg.city || '');
    setLat(reg.lat || '');
    setLng(reg.lng || '');
    setDroneType(reg.droneType);
    setSummary(reg.summary);
    setOfficialLink(reg.officialLink || '');
    setNoFlyWarnings(reg.noFlyWarnings || '');
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this regulation?')) {
      try {
        await deleteDoc(doc(db, 'regulations', id));
      } catch (error) {
        console.error("Error deleting regulation:", error);
        alert("Failed to delete regulation.");
      }
    }
  };

  const handleAddRegulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const regData: any = {
        country,
        droneType,
        summary,
        officialLink,
        noFlyWarnings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      if (state) regData.state = state;
      if (city) regData.city = city;
      if (lat !== '') regData.lat = lat;
      if (lng !== '') regData.lng = lng;

      if (editingId) {
        await updateDoc(doc(db, 'regulations', editingId), regData);
      } else {
        await addDoc(collection(db, 'regulations'), regData);
      }
      setIsAdding(false);
      setEditingId(null);
      setCountry('');
      setState('');
      setCity('');
      setLat('');
      setLng('');
      setSummary('');
      setOfficialLink('');
      setNoFlyWarnings('');
    } catch (error) {
      console.error("Error saving regulation:", error);
      alert("Failed to save regulation.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRegulations = regulations.filter(reg => {
    const matchesSearch = reg.country.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (reg.state && reg.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (reg.city && reg.city.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'All' || reg.droneType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-grow flex flex-col bg-slate-50">
      {/* Hero Header */}
      <div className="relative bg-slate-900 text-white py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80" 
            alt="Drone flying" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4 flex items-center">
            <BookOpen className="w-10 h-10 mr-4 text-blue-400" />
            Global Drone Laws
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Search and contribute to our community-driven database of drone regulations. Navigate international drone laws with confidence.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-6 -mt-8 relative z-20">
        <div className="flex justify-end mb-8 space-x-3">
          <button 
            onClick={() => document.getElementById('drone-bans-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center whitespace-nowrap shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 mr-1" />
            Drone Bans
          </button>
          {user && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center whitespace-nowrap shadow-lg"
            >
              <Plus className="w-5 h-5 mr-1" />
              Add Regulation
            </button>
          )}
        </div>

        {/* Official Aviation Authorities */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Globe className="w-6 h-6 mr-2 text-blue-600" />
            Official Government Drone Portals
          </h2>
          
          {/* Major Countries Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {MAJOR_AUTHORITIES.map(auth => (
              <a 
                key={auth.country} 
                href={auth.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition group"
              >
                <span className="text-4xl mb-2 shadow-sm rounded-full">{auth.flag}</span>
                <span className="font-bold text-slate-900 group-hover:text-blue-700">{auth.country}</span>
                <span className="text-sm font-medium text-blue-600 mt-1">{auth.name}</span>
                <span className="text-xs text-slate-500 mt-1 line-clamp-2">{auth.desc}</span>
              </a>
            ))}
          </div>

          {/* Other Countries Dropdown/List */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 sm:mb-0">More Countries</h3>
              <div className="relative w-full sm:w-72">
                <select 
                  className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none bg-slate-50 text-slate-700 font-medium"
                  onChange={(e) => {
                    if (e.target.value) {
                      window.open(e.target.value, '_blank');
                      e.target.value = ""; // reset
                    }
                  }}
                >
                  <option value="">Select a country...</option>
                  {OTHER_AUTHORITIES.map(auth => (
                    <option key={auth.country} value={auth.url}>
                      {auth.country} - {auth.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Global Resources & Guidance Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Global Resources & Guidance</h2>
        <p className="text-slate-600 mb-6">
          Finding comprehensive drone laws requires navigating a "patchwork" of federal, state, and local regulations. The following resources are the most reliable for staying current on specific "ground-level" and international variances.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Global & International */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-600" />
              Global & International
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://pilotinstitute.com/drones/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Pilot Institute - Global Drone Laws</a>
                <p className="text-slate-500 mt-0.5">Extensive directory of drone laws for almost every country in the world.</p>
              </li>
              <li>
                <a href="https://uavcoach.com/drone-laws/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">UAV Coach - Drone Laws by Country</a>
                <p className="text-slate-500 mt-0.5">Frequently updated master list. Breaks down regulations into plain English.</p>
              </li>
              <li>
                <a href="https://feelingdrone.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Feeling Drone - Global Map</a>
                <p className="text-slate-500 mt-0.5">Interactive resource with country-specific maps and permit requirements.</p>
              </li>
            </ul>
          </div>

          {/* 2. U.S. State & Local */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              U.S. State & Local Laws
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://dronelaunchacademy.com/drone-laws-by-state/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Drone Launch Academy</a>
                <p className="text-slate-500 mt-0.5">Comprehensive directory for all 50 states highlighting specific statutes.</p>
              </li>
              <li>
                <a href="https://www.findlaw.com/injury/torts-and-personal-injuries/drone-laws-by-state.html" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">FindLaw - Drone Laws by State</a>
                <p className="text-slate-500 mt-0.5">Legal perspective on how state laws interact with federal FAA rules.</p>
              </li>
            </ul>
          </div>

          {/* 3. Real-Time Apps */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
              <Smartphone className="w-5 h-5 mr-2 text-blue-600" />
              Real-Time Airspace Apps
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://www.faa.gov/uas/getting_started/b4ufly" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">B4UFLY (AutoPylot, Air Control)</a>
                <p className="text-slate-500 mt-0.5">FAA-Approved apps to see TFRs, National Parks, and local No Fly Zones.</p>
              </li>
              <li>
                <a href="https://www.aloft.ai/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">AirMap / Aloft</a>
                <p className="text-slate-500 mt-0.5">Industry standards for checking local advisories and obtaining LAANC authorization.</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
          <h4 className="font-semibold text-slate-800 mb-3">Summary Checklist for a New Location:</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-200/50">
                <tr>
                  <th className="px-4 py-2.5 rounded-tl-lg">Level</th>
                  <th className="px-4 py-2.5">What to Check</th>
                  <th className="px-4 py-2.5 rounded-tr-lg">Best Resource</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">National</td>
                  <td className="px-4 py-3 text-slate-600">Registration & Pilot Certification</td>
                  <td className="px-4 py-3 text-slate-600">EASA (EU) or UAV Coach (Global)</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">State</td>
                  <td className="px-4 py-3 text-slate-600">Privacy laws & State Park bans</td>
                  <td className="px-4 py-3 text-slate-600">Drone Launch Academy / FindLaw</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">City/Local</td>
                  <td className="px-4 py-3 text-slate-600">Take-off/Landing ordinances</td>
                  <td className="px-4 py-3 text-slate-600">City Government website / B4UFLY</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 relative">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editingId ? 'Edit Regulation' : 'Add New Regulation'}</h2>
            <form onSubmit={handleAddRegulation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country *</label>
                  <select required value={country} onChange={e => setCountry(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="" disabled>Select Country</option>
                    {allCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State/Province</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., Florida" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., Miami" />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button 
                    onClick={handleSearchLocation}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition text-sm"
                  >
                    Search Coordinates
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                  <input type="number" step="any" value={lat} onChange={e => setLat(parseFloat(e.target.value) || '')} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., 25.7617" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                  <input type="number" step="any" value={lng} onChange={e => setLng(parseFloat(e.target.value) || '')} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., -80.1918" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drone Type *</label>
                  <select value={droneType} onChange={e => setDroneType(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="Sub-250g">Sub-250g (Recreational)</option>
                    <option value="250g+ Recreational">250g+ Recreational</option>
                    <option value="Commercial (Part 107/Specific)">Commercial (Part 107/Specific)</option>
                    <option value="FPV/Custom">FPV/Custom</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summary of Rules *</label>
                <textarea required value={summary} onChange={e => setSummary(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 h-24" placeholder="Briefly summarize the key rules (e.g., max altitude, VLOS required, registration needed...)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">No-Fly Zone Warnings</label>
                <textarea value={noFlyWarnings} onChange={e => setNoFlyWarnings(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 h-16" placeholder="e.g., National Parks are strictly prohibited. 5 mile radius around airports." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Official Link</label>
                <input type="url" value={officialLink} onChange={e => setOfficialLink(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="https://..." />
              </div>

              <div className="flex justify-end pt-4 space-x-2 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Regulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banned Countries Section */}
      <div id="drone-bans-section" className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 mt-8 mb-8">
        <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
          🚫 Warning: Drone Bans (Do Not Bring)
        </h2>
        <p className="text-red-800 mb-6 font-medium">
          The following countries have strict bans on drones for tourists. Bringing a drone to these countries will likely result in confiscation at customs, heavy fines, or even imprisonment.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BANNED_COUNTRIES.map(banned => (
            <div key={banned.country} className="bg-white border border-red-100 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">{banned.country}</h3>
              <p className="text-sm text-slate-600">{banned.notes}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 mt-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by country or region..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-slate-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-slate-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="All">All Drone Types</option>
            <option value="Sub-250g">Sub-250g (Recreational)</option>
            <option value="250g+ Recreational">250g+ Recreational</option>
            <option value="Commercial (Part 107/Specific)">Commercial (Part 107/Specific)</option>
            <option value="FPV/Custom">FPV/Custom</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRegulations.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No regulations found</h3>
            <p className="text-slate-500">Try adjusting your search or be the first to add rules for this location.</p>
          </div>
        ) : (
          filteredRegulations.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    {reg.country}
                    {(reg.state || reg.city) && <span className="text-slate-500 font-normal ml-2 text-sm">({[reg.city, reg.state].filter(Boolean).join(', ')})</span>}
                  </h3>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {reg.droneType}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {user && user.uid === reg.updatedBy && (
                    <>
                      <button onClick={() => handleEdit(reg)} className="text-slate-400 hover:text-blue-600 transition p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(reg.id)} className="text-slate-400 hover:text-red-600 transition p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {reg.officialLink && (
                    <a href={reg.officialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition">
                      Official Source <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="prose prose-sm text-slate-600 mb-4 whitespace-pre-wrap">
                {reg.summary}
              </div>

              {reg.noFlyWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <h4 className="flex items-center text-amber-800 font-semibold text-sm mb-1">
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    No-Fly Warnings
                  </h4>
                  <p className="text-amber-700 text-sm">{reg.noFlyWarnings}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
    </div>
  );
}
