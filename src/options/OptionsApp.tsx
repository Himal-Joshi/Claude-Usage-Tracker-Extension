import React from 'react';

const OptionsApp: React.FC = () => {
  return (
    <div className="min-h-screen max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-indigo-400">Claude Usage Tracker</h1>
      
      <div className="bg-[#1e1e2e] p-6 rounded-2xl shadow-xl border border-white/5">
        <h2 className="text-xl font-semibold mb-4 text-white">Settings</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Anthropic API Key (Optional)</label>
          <p className="text-xs text-gray-500 mb-2">
            Provide your own Anthropic API key to use Mode A (100% exact token counts). If left blank, the extension uses safe, local estimation (Mode B) completely inside your browser.
          </p>
          <input 
            type="password" 
            placeholder="sk-ant-api03-..." 
            className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default OptionsApp;
