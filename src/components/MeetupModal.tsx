import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function MeetupModal({ pilot, onClose, startOpen = false }: { pilot: any, onClose: () => void, startOpen?: boolean }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(startOpen);
  const [guidance, setGuidance] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'meetupRequests'), {
        senderId: user.uid,
        receiverId: pilot.id,
        guidanceNeeded: guidance,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Attempt to send notification email to the receiving pilot
      if (pilot.email) {
        try {
          const res = await fetch('/api/email/meetup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderName: user.displayName || 'A fellow pilot',
              receiverEmail: pilot.email,
              receiverName: pilot.displayName || 'Pilot',
              message: guidance
            })
          });
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('Failed to send meetup email notification (Server Error):', errData);
            alert(`Request saved in app, but email failed to send: ${errData.error?.message || errData.error?.name || JSON.stringify(errData)}`);
          }
        } catch (err: any) {
          console.error('Failed to send meetup email notification (Network Error)', err);
          alert(`Request saved in app, but network error prevented email: ${err.message}`);
        }
      } else {
        console.warn('Pilot has no email field', pilot);
        alert('Notice: This pilot does not have an email stored. Request created in-app only.');
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    if (user && pilot.id === user.uid) {
      return (
        <button
          disabled
          className="w-full bg-slate-200 text-slate-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed"
        >
          This is you
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
      >
        Request Meetup
      </button>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-800 p-4 rounded-lg text-center font-medium">
        Request sent successfully!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4 border-t pt-4">
      <h4 className="font-semibold text-slate-800">Meetup Details</h4>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">What kind of guidance do you need?</label>
        <textarea 
          required 
          value={guidance} 
          onChange={e => setGuidance(e.target.value)} 
          placeholder="e.g., Help with local permit laws, best sunset spots..."
          className="w-full border-slate-200 rounded-md text-sm p-2 border focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
        />
      </div>
      <div className="flex space-x-3">
        <button type="button" onClick={() => { setIsOpen(false); if (startOpen) onClose(); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
          {submitting ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </form>
  );
}
