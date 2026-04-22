import React from 'react'

export default function AdminDashboard() {
  return (
    <div className="w-full">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 text-center sm:text-left shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">Total Bugs</p>
          <p className="text-3xl font-bold text-slate-800">123</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-center sm:text-left shadow-sm">
          <p className="text-amber-700 text-sm font-medium uppercase tracking-wider mb-1">Open</p>
          <p className="text-3xl font-bold text-amber-600">45</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-6 text-center sm:text-left shadow-sm">
          <p className="text-emerald-700 text-sm font-medium uppercase tracking-wider mb-1">Resolved</p>
          <p className="text-3xl font-bold text-emerald-600">78</p>
        </div>
      </div>
    </div>
  )
}
