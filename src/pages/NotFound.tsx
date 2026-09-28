import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 max-w-lg text-center">
        <div className="bg-amber-100 text-amber-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          The flight path you're looking for doesn't exist or might have been moved. 
          Double-check the URL or return to base.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm"
        >
          <Home className="w-5 h-5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
