import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, ShieldAlert, Trash2, Activity, MessageCircle, MapPin, BookOpen, Edit2, Drone, Award } from 'lucide-react';
import MeetupModal from '../components/MeetupModal';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [flightSpots, setFlightSpots] = useState<any[]>([]);
  const [regulations, setRegulations] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalConnections: 0, totalForumPosts: 0 });
  const [settings, setSettings] = useState({ checklistUrl: 'https://studio--drone-preflight-checklist.us-central1.hosted.app/' });
  const [selectedPilot, setSelectedPilot] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'spots' | 'regulations' | 'connections' | 'logs' | 'settings' | 'drones' | 'certs'>((searchParams.get('tab') as any) || 'users');

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (tab && ['users', 'posts', 'spots', 'regulations', 'connections', 'logs', 'settings', 'drones', 'certs'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'users' | 'posts' | 'spots' | 'regulations' | 'connections' | 'logs' | 'settings' | 'drones' | 'certs') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'global'), { checklistUrl: settings.checklistUrl }, { merge: true });
      alert("Settings saved successfully.");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    }
  };

  const [itemToDelete, setItemToDelete] = useState<{ collection: string, id: string, name: string } | null>(null);
  const [itemToEdit, setItemToEdit] = useState<{ collection: string, id: string, data: any } | null>(null);

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

  useEffect(() => {
    if (!user || user.email !== 'ttohumcu@gmail.com') {
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

    const unsubscribeConnections = onSnapshot(collection(db, 'meetupRequests'), (snapshot) => {
      setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeAuditLogs = onSnapshot(query(collection(db, 'auditLogs')), (snapshot) => {
      // Sort in descending order on client since index might not exist
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logs.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setAuditLogs(logs);
    });

    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setStats({
          totalConnections: snapshot.data().totalConnections || 0,
          totalForumPosts: snapshot.data().totalForumPosts || 0
        });
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().checklistUrl) {
        setSettings({ checklistUrl: snapshot.data().checklistUrl });
      }
    });

    syncStats();

    return () => {
      unsubscribeUsers();
      unsubscribePosts();
      unsubscribeSpots();
      unsubscribeRegulations();
      unsubscribeConnections();
      unsubscribeAuditLogs();
      unsubscribeStats();
      unsubscribeSettings();
    };
  }, [user, navigate]);

  const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !currentBanStatus
      });
    } catch (error) {
      console.error("Error updating ban status:", error);
    }
  };

  const getConnectionStatus = (otherUserId: string) => {
    if (!user) return 'none';
    const relatedRequest = connections.find(req => 
      (req.senderId === user.uid && req.receiverId === otherUserId) ||
      (req.receiverId === user.uid && req.senderId === otherUserId)
    );
    if (!relatedRequest) return 'none';
    if (relatedRequest.status === 'accepted') return 'connected';
    return 'pending';
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.collection === 'users') {
        const connectionsRef = collection(db, 'meetupRequests');
        const qSender = query(connectionsRef, where('senderId', '==', itemToDelete.id));
        const qReceiver = query(connectionsRef, where('receiverId', '==', itemToDelete.id));
        
        const [senderSnapshot, receiverSnapshot] = await Promise.all([
          getDocs(qSender),
          getDocs(qReceiver)
        ]);

        const deletePromises: Promise<void>[] = [];
        senderSnapshot.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
        receiverSnapshot.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
        
        await Promise.all(deletePromises);
      }

      await deleteDoc(doc(db, itemToDelete.collection, itemToDelete.id));
      setItemToDelete(null);
      syncStats();
    } catch (error) {
      console.error(`Error deleting from ${itemToDelete.collection}:`, error);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;
    try {
      await updateDoc(doc(db, itemToEdit.collection, itemToEdit.id), itemToEdit.data);
      setItemToEdit(null);
    } catch (error) {
      console.error(`Error updating ${itemToEdit.collection}:`, error);
    }
  };

  if (!user || user.email !== 'ttohumcu@gmail.com') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center">
          <ShieldAlert className="w-8 h-8 mr-3 text-red-500" />
          Admin Dashboard
        </h1>
        <p className="text-slate-500 mt-2">Manage users, view statistics, and monitor site activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
        <button onClick={() => handleTabChange('users')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mb-2 sm:mb-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Users</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('drones')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl mb-2 sm:mb-0">
            <Drone className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Drones</p>
            <p className="text-2xl font-bold text-slate-900">{users.reduce((acc, u) => acc + (u.drones?.length || 0), 0)}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('certs')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl mb-2 sm:mb-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Certs</p>
            <p className="text-2xl font-bold text-slate-900">{users.reduce((acc, u) => acc + (u.certifications?.length || 0), 0)}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('connections')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl mb-2 sm:mb-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Connections</p>
            <p className="text-2xl font-bold text-slate-900">{connections.filter(c => c.status === 'accepted').length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('posts')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl mb-2 sm:mb-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Forum</p>
            <p className="text-2xl font-bold text-slate-900">{forumPosts.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('spots')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl mb-2 sm:mb-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Spots</p>
            <p className="text-2xl font-bold text-slate-900">{flightSpots.length}</p>
          </div>
        </button>
        <button onClick={() => handleTabChange('regulations')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:flex-row sm:space-x-4 hover:shadow-md transition text-left cursor-pointer">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-xl mb-2 sm:mb-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-500">Rules</p>
            <p className="text-2xl font-bold text-slate-900">{regulations.length}</p>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => handleTabChange('users')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Users
        </button>
        <button
          onClick={() => handleTabChange('drones')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'drones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Drones
        </button>
        <button
          onClick={() => handleTabChange('certs')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'certs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Certifications
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'connections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Connections
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
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Settings
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'settings' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Global Application Settings</h2>
            <form onSubmit={handleSettingsSave} className="max-w-xl space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Pre-Flight Checklist URL</label>
                <input
                  type="url"
                  value={settings.checklistUrl}
                  onChange={e => setSettings({ ...settings, checklistUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-sm text-slate-500 mt-2">This is the link used for the Pre-Flight Checklist in the navigation bar.</p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'logs' && (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-800 flex items-center">
                 <ShieldAlert className="w-5 h-5 mr-2 text-slate-500" />
                 Audit Logs
               </h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                     <th className="p-4 font-medium">Date & Time</th>
                     <th className="p-4 font-medium">Action</th>
                     <th className="p-4 font-medium">User Name</th>
                     <th className="p-4 font-medium">Email</th>
                     <th className="p-4 font-medium">User ID</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {auditLogs.map(log => (
                     <tr key={log.id} className="hover:bg-slate-50 transition">
                       <td className="p-4 text-sm text-slate-600">
                         {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString() : 'Unknown'}
                       </td>
                       <td className="p-4">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                           log.action === 'Login' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                         }`}>
                           {log.action}
                         </span>
                       </td>
                       <td className="p-4 font-medium text-slate-900">{log.userName || '-'}</td>
                       <td className="p-4 text-sm text-slate-600">{log.userEmail || '-'}</td>
                       <td className="p-4 text-xs font-mono text-slate-500">{log.userId || '-'}</td>
                     </tr>
                   ))}
                   {auditLogs.length === 0 && (
                     <tr>
                       <td colSpan={5} className="p-8 text-center text-slate-500">
                         No audit logs found.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </>
        )}

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
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Home Base</th>
                    <th className="p-4 font-medium">Registered Date</th>
                    <th className="p-4 font-medium text-right">Actions</th>
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
                      <td className="p-4 text-sm text-slate-600">
                        {u.email || <span className="text-slate-400 italic">No email</span>}
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
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleBanUser(u.id, !!u.isBanned)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                            u.isBanned ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          onClick={() => setItemToDelete({ collection: 'users', id: u.id, name: u.displayName || 'User' })}
                          className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition"
                        >
                          Delete
                        </button>
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

        {activeTab === 'connections' && (
          <>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Pilot Connections</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Sender</th>
                    <th className="p-4 font-medium">Receiver</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {connections.map(conn => {
                    const sender = users.find(u => u.id === conn.senderId);
                    const receiver = users.find(u => u.id === conn.receiverId);
                    return (
                      <tr key={conn.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {sender?.photoURL ? (
                              <img src={sender.photoURL} alt={sender.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {sender?.displayName?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{sender?.displayName || 'Unknown User'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {receiver?.photoURL ? (
                              <img src={receiver.photoURL} alt={receiver.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {receiver?.displayName?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{receiver?.displayName || 'Unknown User'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            conn.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                            conn.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {conn.status.charAt(0).toUpperCase() + conn.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {conn.createdAt?.toDate ? new Date(conn.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setItemToDelete({ collection: 'meetupRequests', id: conn.id, name: `Connection between ${sender?.displayName || 'Unknown'} and ${receiver?.displayName || 'Unknown'}` })}
                            className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {connections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No connections found.
                      </td>
                    </tr>
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
                    <th className="p-4 font-medium">Replies</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forumPosts.map(post => (
                    <tr key={post.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <p className="font-medium text-slate-900 line-clamp-1">{post.title}</p>
                        <p className="text-xs text-slate-500">{new Date(post.createdAt?.toDate()).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{post.authorName}</td>
                      <td className="p-4 text-sm text-slate-600">{post.repliesCount || 0}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => window.open(`/forum?post=${post.id}`, '_blank')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setItemToEdit({ collection: 'forumPosts', id: post.id, data: post })}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setItemToDelete({ collection: 'forumPosts', id: post.id, name: post.title })}
                          className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition"
                        >
                          Delete
                        </button>
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
                    <th className="p-4 font-medium">Coordinates</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flightSpots.map(spot => {
                    const author = users.find(u => u.id === spot.authorId);
                    return (
                    <tr key={spot.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-900">{spot.name}</td>
                      <td className="p-4 text-sm text-slate-600">{spot.addedByName || (author ? author.displayName : 'Unknown')}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {[spot.city, spot.state, spot.country].filter(Boolean).join(', ') || 'Unknown'}
                      </td>
                      <td className="p-4 text-sm text-slate-500 font-mono">
                        {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setItemToEdit({ collection: 'flightSpots', id: spot.id, data: spot })}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setItemToDelete({ collection: 'flightSpots', id: spot.id, name: spot.name })}
                          className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition"
                        >
                          Delete
                        </button>
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
                    <th className="p-4 font-medium">Added By</th>
                    <th className="p-4 font-medium">Region</th>
                    <th className="p-4 font-medium">Drone Type</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regulations.map(reg => {
                    const author = users.find(u => u.id === reg.updatedBy);
                    return (
                    <tr key={reg.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-900">{reg.country}</td>
                      <td className="p-4 text-sm text-slate-600">{reg.addedByName || (author ? author.displayName : 'Unknown')}</td>
                      <td className="p-4 text-sm text-slate-600">{reg.region || '-'}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <span className="inline-block px-2 py-1 bg-slate-100 rounded-md text-xs">
                          {reg.droneType}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => window.open('/regulations', '_blank')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setItemToEdit({ collection: 'regulations', id: reg.id, data: reg })}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setItemToDelete({ collection: 'regulations', id: reg.id, name: `${reg.country} Regulation` })}
                          className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{itemToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {itemToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                Edit {itemToEdit.collection === 'forumPosts' ? 'Forum Post' : itemToEdit.collection === 'flightSpots' ? 'Flight Spot' : 'Regulation'}
              </h3>
              <button onClick={() => setItemToEdit(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-4">
                {itemToEdit.collection === 'forumPosts' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={itemToEdit.data.title || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, title: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                      <textarea
                        value={itemToEdit.data.content || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, content: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
                        required
                      />
                    </div>
                  </>
                )}
                {itemToEdit.collection === 'flightSpots' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={itemToEdit.data.name || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, name: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        value={itemToEdit.data.description || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, description: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          value={itemToEdit.data.city || ''}
                          onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, city: e.target.value } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                        <input
                          type="text"
                          value={itemToEdit.data.state || ''}
                          onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, state: e.target.value } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={itemToEdit.data.country || ''}
                          onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, country: e.target.value } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
                {itemToEdit.collection === 'regulations' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={itemToEdit.data.country || ''}
                          onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, country: e.target.value } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                        <input
                          type="text"
                          value={itemToEdit.data.region || ''}
                          onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, region: e.target.value } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Drone Type</label>
                      <input
                        type="text"
                        value={itemToEdit.data.droneType || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, droneType: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
                      <textarea
                        value={itemToEdit.data.summary || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, summary: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Official Link</label>
                      <input
                        type="url"
                        value={itemToEdit.data.officialLink || ''}
                        onChange={(e) => setItemToEdit({ ...itemToEdit, data: { ...itemToEdit.data, officialLink: e.target.value } })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setItemToEdit(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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
