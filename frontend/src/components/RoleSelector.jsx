import React from "react";
import AUDIENCES from "../audiences";

export default function RoleSelector({ onSelect }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-indigo-400">Prism</span>
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Enterprise Intelligence Platform
        </p>
        <p className="mt-1 text-sm text-gray-600">
          One source of truth. Every audience, perfectly framed.
        </p>
        <p className="mt-8 text-sm font-medium text-gray-300">
          Select your role to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {AUDIENCES.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            className="group text-left rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-950/40 hover:shadow-lg hover:shadow-indigo-500/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            <div className="font-semibold text-sm text-gray-100 group-hover:text-indigo-300 transition-colors">
              {a.label}
            </div>
            <div className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">
              {a.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
