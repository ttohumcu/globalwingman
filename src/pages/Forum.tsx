import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Plus, MessageCircle, Trash2 } from 'lucide-react';

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'forumPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedPost) return;

    const q = query(collection(db, 'forumReplies'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repliesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((r: any) => r.postId === selectedPost.id);
      setReplies(repliesData);
    });

    return () => unsubscribe();
  }, [selectedPost]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'forumPosts'), {
        title: newTitle.trim(),
        content: newContent.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Pilot',
        repliesCount: 0,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'stats', 'global'), {
        totalForumPosts: increment(1)
      }).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'stats', 'global'), { totalForumPosts: increment(1) }, { merge: true });
      });

      setNewTitle('');
      setNewContent('');
      setShowNewPost(false);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPost || !newReply.trim()) return;

    setSubmittingReply(true);
    try {
      await addDoc(collection(db, 'forumReplies'), {
        postId: selectedPost.id,
        content: newReply.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Pilot',
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'forumPosts', selectedPost.id), {
        repliesCount: increment(1)
      });
      
      setNewReply('');
    } catch (error) {
      console.error("Error creating reply:", error);
      alert("Failed to post reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'forumPosts', postId));
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      setConfirmDeleteId(null);
      
      await updateDoc(doc(db, 'stats', 'global'), {
        totalForumPosts: increment(-1)
      }).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'stats', 'global'), { totalForumPosts: 0 }, { merge: true });
      });
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const isAdmin = user?.email === 'ttohumcu@gmail.com';

  if (!user) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view the community forum.</p>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto w-full p-6">
        <button 
          onClick={() => setSelectedPost(null)}
          className="text-blue-600 hover:text-blue-800 font-medium mb-6 inline-flex items-center"
        >
          &larr; Back to Forum
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6 relative">
          {(user.uid === selectedPost.authorId || isAdmin) && (
            <div className="absolute top-6 right-6">
              {confirmDeleteId === selectedPost.id ? (
                <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-lg">
                  <span className="text-xs text-red-800 font-medium">Delete?</span>
                  <button onClick={() => handleDeletePost(selectedPost.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Yes</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(selectedPost.id)}
                  className="text-slate-400 hover:text-red-500 transition"
                  title="Delete Topic"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 mb-2 pr-8">{selectedPost.title}</h1>
          <div className="text-sm text-slate-500 mb-6 flex items-center">
            <span className="font-medium text-slate-700 mr-2">{selectedPost.authorName}</span>
            &bull; <span className="ml-2">{selectedPost.createdAt?.toDate().toLocaleString()}</span>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{selectedPost.content}</p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-bold text-slate-800">Replies ({replies.length})</h3>
          {replies.map(reply => (
            <div key={reply.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="text-sm text-slate-500 mb-3 flex items-center">
                <span className="font-medium text-slate-700 mr-2">{reply.authorName}</span>
                &bull; <span className="ml-2">{reply.createdAt?.toDate().toLocaleString()}</span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateReply} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h4 className="font-bold text-slate-800 mb-4">Add a Reply</h4>
          <textarea
            value={newReply}
            onChange={e => setNewReply(e.target.value)}
            className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 h-24 px-3 py-2 border resize-none mb-4"
            placeholder="Write your reply..."
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReply || !newReply.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {submittingReply ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-slate-50">
      {/* Hero Header */}
      <div className="relative bg-slate-900 text-white py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80" 
            alt="Drone pilot" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4 flex items-center">
            <MessageSquare className="w-10 h-10 mr-4 text-blue-400" />
            Community Forum
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Connect with pilots worldwide. Share tips, ask questions, and discuss everything from gear to global travel.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 -mt-8 relative z-20">
        <div className="flex justify-end mb-8">
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" /> New Topic
          </button>
        </div>

      {showNewPost && (
        <form onSubmit={handleCreatePost} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Topic</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                placeholder="What do you want to discuss?"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 h-32 px-3 py-2 border resize-none"
                placeholder="Share your thoughts, ask questions, or provide tips..."
                required
                maxLength={10000}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNewPost(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newTitle.trim() || !newContent.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Topic'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading forum...</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No topics yet</h3>
          <p className="text-slate-500">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition cursor-pointer relative"
            >
              {(user.uid === post.authorId || isAdmin) && (
                <div className="absolute top-6 right-6">
                  {confirmDeleteId === post.id ? (
                    <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-lg" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-red-800 font-medium">Delete?</span>
                      <button onClick={() => handleDeletePost(post.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(post.id);
                      }}
                      className="text-slate-400 hover:text-red-500 transition"
                      title="Delete Topic"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2 pr-8">{post.title}</h3>
              <p className="text-slate-600 line-clamp-2 mb-4">{post.content}</p>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center">
                  <span className="font-medium text-slate-700 mr-2">{post.authorName}</span>
                  &bull; <span className="ml-2">{post.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-blue-600 font-medium">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.repliesCount || 0} replies
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
