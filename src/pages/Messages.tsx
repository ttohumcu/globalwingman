import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc, getDocs, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, CheckCircle, Clock, Send } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch incoming requests
    const qIncoming = query(
      collection(db, 'meetupRequests'),
      where('receiverId', '==', user.uid)
    );

    // Fetch outgoing requests
    const qOutgoing = query(
      collection(db, 'meetupRequests'),
      where('senderId', '==', user.uid)
    );

    let incomingReqs: any[] = [];
    let outgoingReqs: any[] = [];

    const processRequests = async () => {
      const allReqs = [...incomingReqs, ...outgoingReqs].sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      const reqsWithNames = await Promise.all(allReqs.map(async (data) => {
        let otherUserName = 'Pilot';
        const otherUserId = data.senderId === user.uid ? data.receiverId : data.senderId;
        if (otherUserId) {
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            otherUserName = otherUserDoc.data().displayName || 'Pilot';
          }
        }
        return { ...data, otherUserName, isOutgoing: data.senderId === user.uid };
      }));

      // Remove duplicates just in case
      const uniqueReqs = Array.from(new Map(reqsWithNames.map(item => [item.id, item])).values());
      setRequests(uniqueReqs);
      setLoading(false);
    };

    const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
      incomingReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      processRequests();
    });

    const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      outgoingReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      processRequests();
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, `meetupRequests/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleAccept = async (req: any) => {
    try {
      // Check if they already have an accepted connection
      const q1 = query(collection(db, 'meetupRequests'), where('senderId', '==', req.senderId), where('receiverId', '==', req.receiverId), where('status', '==', 'accepted'));
      const q2 = query(collection(db, 'meetupRequests'), where('senderId', '==', req.receiverId), where('receiverId', '==', req.senderId), where('status', '==', 'accepted'));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const alreadyConnected = !snap1.empty || !snap2.empty;

      await updateDoc(doc(db, 'meetupRequests', req.id), {
        status: 'accepted'
      });

      if (!alreadyConnected) {
        await updateDoc(doc(db, 'stats', 'global'), {
          totalConnections: increment(1)
        }).catch(async () => {
          // Fallback if document doesn't exist
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'stats', 'global'), { totalConnections: increment(1) }, { merge: true });
        });
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, `meetupRequests/${activeChat.id}/messages`), {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view your messages.</p>
      </div>
    );
  }

  if (activeChat) {
    return (
      <div className="max-w-4xl mx-auto w-full p-6 h-[calc(100vh-64px)] flex flex-col">
        <button 
          onClick={() => setActiveChat(null)}
          className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center self-start"
        >
          &larr; Back to Requests
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-grow overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Chat with {activeChat.otherUserName}</h2>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">No messages yet. Say hi!</div>
            ) : (
              chatMessages.map(msg => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow border-slate-300 rounded-full px-4 py-2 border focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition disabled:opacity-50 flex items-center justify-center w-10 h-10"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4 flex items-center">
            <MessageCircle className="w-10 h-10 mr-4 text-blue-400" />
            Meetup Requests & Chats
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Coordinate with other pilots, accept requests, and chat to plan your next flight together.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 -mt-8 relative z-20">

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No requests yet</h3>
          <p className="text-slate-500">When you or other pilots want to meet up, requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    req.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status === 'accepted' ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Accepted</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> Pending</>
                    )}
                  </span>
                  <span className="text-sm text-slate-500">
                    {req.createdAt?.toDate().toLocaleDateString()}
                  </span>
                  {req.isOutgoing && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Sent by you</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {req.isOutgoing ? `Request to ${req.otherUserName}` : `Request from ${req.otherUserName}`}
                </h3>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 mt-2">
                  {req.guidanceNeeded}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2 min-w-[120px]">
                {!req.isOutgoing && req.status === 'pending' && (
                  <button 
                    onClick={() => handleAccept(req)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Accept
                  </button>
                )}
                {req.status === 'accepted' && (
                  <button 
                    onClick={() => setActiveChat(req)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Open Chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
