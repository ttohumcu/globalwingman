import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDocs, where, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Activity, MessageCircle, MapPin, BookOpen, ShieldAlert, Send, Drone, Award } from 'lucide-react';
import MeetupModal from '../components/MeetupModal';

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [flightSpots, setFlightSpots] = useState<any[]>([]);
  const [regulations, setRegulations] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalConnections: 0, totalForumPosts: 0 });
  const [selectedPilot, setSelectedPilot] = useState<any>(null);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'spots' | 'regulations' | 'drones' | 'certs'>((searchParams.get('tab') as any) || 'users');

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (tab && ['users', 'posts', 'spots', 'regulations', 'drones', 'certs'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'users' | 'posts' | 'spots' | 'regulations' | 'drones' | 'certs') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribePosts = onSnapshot(collection(db, 'forumPosts'), (snapshot) => {
      setForumPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeSpots = onSnapshot(collection(db, 'flightSpots'), (snapshot) => {
      setFlightSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeRegulations = onSnapshot(collection(db, 'regulations'), (snapshot) => {
      setRegulations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setStats({
          totalConnections: snapshot.data().totalConnections || 0,
          totalForumPosts: snapshot.data().totalForumPosts || 0
        });
      }
    });

    const unsubscribeSent = onSnapshot(query(collection(db, 'meetupRequests'), where('senderId', '==', user.uid)), (snapshot) => {
      setSentRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeReceived = onSnapshot(query(collection(db, 'meetupRequests'), where('receiverId', '==', user.uid)), (snapshot) => {
      setReceivedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeUsers();
      unsubscribePosts();
      unsubscribeSpots();
      unsubscribeRegulations();
      unsubscribeStats();
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [user, navigate]);

  const getConnectionStatus = (otherUserId: string) => {
    const allRequests = [...sentRequests, ...receivedRequests];
    const relatedRequest = allRequests.find(req => 
      (req.senderId === user?.uid && req.receiverId === otherUserId) ||
      (req.receiverId === user?.uid && req.senderId === otherUserId)
    );
    
    if (!relatedRequest) return 'none';
    if (relatedRequest.status === 'accepted') return 'connected';
    return 'pending';
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center">
          <Activity className="w-8 h-8 mr-3 text-blue-500" />
          User Dashboard
        </h1>
        <p className="text-slate-500 mt-2">View global statistics and monitor site activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
        <button onClick={() => handleTabChange('users')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer w-full focus:outline-none">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mb-2 sm:mb-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Users</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('drones')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left w-full focus:outline-none cursor-pointer">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl mb-2 sm:mb-0">
            <Drone className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Drones</p>
            <p className="text-2xl font-bold text-slate-900">{users.reduce((acc, u) => acc + (u.drones?.length || 0), 0)}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('certs')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left w-full focus:outline-none cursor-pointer">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl mb-2 sm:mb-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Certs</p>
            <p className="text-2xl font-bold text-slate-900">{users.reduce((acc, u) => acc + (u.certifications?.length || 0), 0)}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('users')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer w-full focus:outline-none">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl mb-2 sm:mb-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Connections</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalConnections}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('posts')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer w-full focus:outline-none">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl mb-2 sm:mb-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Forum Posts</p>
            <p className="text-2xl font-bold text-slate-900">{forumPosts.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('spots')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer w-full focus:outline-none">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl mb-2 sm:mb-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Flight Spots</p>
            <p className="text-2xl font-bold text-slate-900">{flightSpots.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('regulations')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer w-full focus:outline-none">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-xl mb-2 sm:mb-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Regulations</p>
            <p className="text-2xl font-bold text-slate-900">{regulations.length}</p>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('drones')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'drones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Drones
        </button>
        <button
          onClick={() => setActiveTab('certs')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'certs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Certifications
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Forum Posts
        </button>
        <button
          onClick={() => setActiveTab('spots')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'spots' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Flight Spots
        </button>
        <button
          onClick={() => setActiveTab('regulations')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'regulations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Regulations
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'users' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Registered Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Home Base</th>
                    <th className="p-4 font-medium">Registered Date</th>
                    <th className="p-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                              {u.displayName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{u.displayName}</p>
                            <p className="text-xs text-slate-500">{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {u.isBanned ? 'Banned' : 'Active'}
                        </span>
                        {u.role === 'admin' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {u.homeBase ? [u.homeBase.city, u.homeBase.state, u.homeBase.country].filter(Boolean).join(', ') || u.homeBase.name : 'Not set'}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="p-4 text-right">
                        {u.id !== user?.uid && (
                          getConnectionStatus(u.id) === 'connected' ? (
                            <span className="inline-flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                              <span>Connected</span>
                            </span>
                          ) : getConnectionStatus(u.id) === 'pending' ? (
                            <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                              <span>Requested</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedPilot(u)}
                              className="inline-flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                            >
                              <Send className="w-4 h-4" />
                              <span>Connect</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'drones' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Pilots' Drones</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Make</th>
                    <th className="p-4 font-medium">Model</th>
                    <th className="p-4 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.flatMap(u => (u.drones || []).map((d: any, i: number) => ({ ...d, owner: u, key: `${u.id}-${i}` }))).map((item: any) => (
                    <tr key={item.key} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm font-medium text-slate-900">{item.make === 'Other' ? item.customMake || 'Custom' : item.make}</td>
                      <td className="p-4 text-sm text-slate-600">{item.model}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden">
                            {item.owner.photoURL ? <img src={item.owner.photoURL} alt="user" /> : (item.owner.displayName?.charAt(0) || '?')}
                          </div>
                          <button
                            onClick={() => item.owner.id !== user?.uid ? setSelectedPilot(item.owner) : null}
                            className={`font-medium ${item.owner.id !== user?.uid ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-slate-900 cursor-default'}`}
                          >
                            {item.owner.displayName}
                          </button>
                          {item.owner.id !== user?.uid && getConnectionStatus(item.owner.id) === 'connected' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                              Connected
                            </span>
                          )}
                          {item.owner.id !== user?.uid && getConnectionStatus(item.owner.id) === 'pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                              Requested
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.reduce((acc, u) => acc + (u.drones?.length || 0), 0) === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">No drones registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'certs' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Pilots' Certifications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Country</th>
                    <th className="p-4 font-medium">Certification</th>
                    <th className="p-4 font-medium">Pilot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.flatMap(u => (u.certifications || []).map((c: any, i: number) => ({ ...c, owner: u, key: `${u.id}-${i}` }))).map((item: any) => (
                    <tr key={item.key} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm font-medium text-slate-900">{item.country}</td>
                      <td className="p-4 text-sm text-slate-600">{item.name}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden">
                            {item.owner.photoURL ? <img src={item.owner.photoURL} alt="user" /> : (item.owner.displayName?.charAt(0) || '?')}
                          </div>
                          <button
                            onClick={() => item.owner.id !== user?.uid ? setSelectedPilot(item.owner) : null}
                            className={`font-medium ${item.owner.id !== user?.uid ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-slate-900 cursor-default'}`}
                          >
                            {item.owner.displayName}
                          </button>
                          {item.owner.id !== user?.uid && getConnectionStatus(item.owner.id) === 'connected' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                              Connected
                            </span>
                          )}
                          {item.owner.id !== user?.uid && getConnectionStatus(item.owner.id) === 'pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                              Requested
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.reduce((acc, u) => acc + (u.certifications?.length || 0), 0) === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">No certifications registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'posts' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Forum Posts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Author</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Replies</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forumPosts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm font-medium text-slate-900 max-w-xs truncate">{p.title}</td>
                      <td className="p-4 text-sm text-slate-600">{p.authorName}</td>
                      <td className="p-4 text-sm text-slate-600">{p.category}</td>
                      <td className="p-4 text-sm text-slate-600">{p.replies || 0}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {p.createdAt?.toDate ? new Date(p.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'spots' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Flight Spots</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Added By</th>
                    <th className="p-4 font-medium">Location</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flightSpots.map(s => {
                    const spotAuthor = users.find(user => user.id === s.authorId);
                    return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm font-medium text-slate-900">{s.name}</td>
                      <td className="p-4 text-sm text-slate-600">{s.addedByName || (spotAuthor ? spotAuthor.displayName : 'Unknown')}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {s.createdAt?.toDate ? new Date(s.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'regulations' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Regulations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Country</th>
                    <th className="p-4 font-medium">Location</th>
                    <th className="p-4 font-medium">Drone Type</th>
                    <th className="p-4 font-medium">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regulations.map(r => {
                    const spotAuthor = users.find(user => user.id === r.updatedBy);
                    return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm font-medium text-slate-900">{r.country}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {[r.city, r.state].filter(Boolean).join(', ') || 'National'}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{r.droneType}</td>
                      <td className="p-4 text-sm text-slate-600">{r.addedByName || (spotAuthor ? spotAuthor.displayName : 'Unknown')}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedPilot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setSelectedPilot(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              ✕
            </button>
            <div className="flex items-center space-x-3 mb-2">
              {selectedPilot.photoURL ? (
                <img src={selectedPilot.photoURL} alt={selectedPilot.displayName} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                  {selectedPilot.displayName?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-slate-900">Connect with Pilot</h3>
                <p className="text-sm text-slate-500">Sending request to {selectedPilot.displayName}</p>
              </div>
            </div>
            <MeetupModal pilot={selectedPilot} onClose={() => setSelectedPilot(null)} startOpen={true} />
          </div>
        </div>
      )}
    </div>
  );
}
