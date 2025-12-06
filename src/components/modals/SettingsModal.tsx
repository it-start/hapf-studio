
import React, { useState } from 'react';
import { X, Settings, Key, Workflow, Database, Download } from 'lucide-react';
import { AIProvider, ProviderConfig, N8nConfig, LogLevel } from '../../types';
import { PIPELINE_EXAMPLES } from '../../examples/index';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Record<AIProvider, ProviderConfig>;
  toggleProvider: (key: AIProvider) => void;
  updateProviderKey: (key: AIProvider, apiKey: string) => void;
  n8nConfig: N8nConfig;
  setN8nConfig: (config: N8nConfig) => void;
  onLog: (msg: string, level: LogLevel, source: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, providers, toggleProvider, updateProviderKey, n8nConfig, setN8nConfig, onLog
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'models' | 'integrations' | 'system'>('models');

  if (!isOpen) return null;

  const handleExportLibrary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(PIPELINE_EXAMPLES, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "hapf_examples_library.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    onLog("Exported HAPF Examples Library.", LogLevel.SUCCESS, "SYSTEM");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-hapf-panel border border-hapf-border w-[600px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
           <div className="p-6 border-b border-hapf-border bg-black/20 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18} /> Studio Settings</h2>
              <button onClick={onClose} className="text-hapf-muted hover:text-white"><X size={20}/></button>
          </div>

          <div className="flex border-b border-hapf-border bg-black/40">
              <button 
                  onClick={() => setActiveSettingsTab('models')}
                  className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'models' ? 'border-hapf-primary text-hapf-primary bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
              >
                  MODEL REGISTRY
              </button>
              <button 
                   onClick={() => setActiveSettingsTab('integrations')}
                   className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'integrations' ? 'border-hapf-accent text-hapf-accent bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
              >
                  INTEGRATIONS
              </button>
              <button 
                   onClick={() => setActiveSettingsTab('system')}
                   className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'system' ? 'border-hapf-success text-hapf-success bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
              >
                  SYSTEM
              </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
              {/* MODEL REGISTRY TAB */}
              {activeSettingsTab === 'models' && (
                  <div className="space-y-3">
                      {/* Google */}
                      <div className="border border-hapf-border rounded-lg p-4 bg-black/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">G</div>
                              <div>
                                  <div className="font-bold text-sm">Google Gemini</div>
                                  <div className="text-xs text-hapf-muted">gemini-2.5-flash (Default)</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded">CONNECTED</span>
                          </div>
                      </div>

                      {/* Mistral */}
                      <div className={`border rounded-lg p-4 bg-black/30 transition-colors ${providers[AIProvider.MISTRAL].enabled ? 'border-orange-500/50' : 'border-hapf-border'}`}>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold transition-colors ${providers[AIProvider.MISTRAL].enabled ? 'bg-orange-500/20 text-orange-500' : 'bg-hapf-border text-hapf-muted'}`}>M</div>
                                  <div>
                                      <div className="font-bold text-sm">Mistral AI</div>
                                      <div className="text-xs text-hapf-muted">mistral-large, mixtral-8x7b</div>
                                  </div>
                              </div>
                              <button 
                                  onClick={() => toggleProvider(AIProvider.MISTRAL)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${providers[AIProvider.MISTRAL].enabled ? 'bg-orange-500 text-white border-orange-600' : 'bg-transparent border-hapf-border hover:bg-white/5'}`}
                              >
                                  {providers[AIProvider.MISTRAL].enabled ? 'ENABLED' : 'ENABLE'}
                              </button>
                          </div>
                          {/* API Key Input */}
                          {providers[AIProvider.MISTRAL].enabled && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 animate-in slide-in-from-top-2">
                                  <Key size={14} className="text-orange-500" />
                                  <input 
                                      type="password"
                                      placeholder="Enter Mistral API Key (sk-...)"
                                      className="flex-1 bg-black/40 border border-hapf-border rounded px-2 py-1 text-xs text-hapf-text outline-none focus:border-orange-500 transition-colors placeholder:text-hapf-muted/30"
                                      value={providers[AIProvider.MISTRAL].apiKey || ''}
                                      onChange={(e) => updateProviderKey(AIProvider.MISTRAL, e.target.value)}
                                  />
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${providers[AIProvider.MISTRAL].apiKey ? 'text-green-400 bg-green-500/10' : 'text-hapf-muted bg-white/5'}`}>
                                      {providers[AIProvider.MISTRAL].apiKey ? 'PROD MODE' : 'SIMULATOR'}
                                  </span>
                              </div>
                          )}
                      </div>

                      {/* Cohere */}
                      <div className={`border rounded-lg p-4 bg-black/30 transition-colors ${providers[AIProvider.COHERE].enabled ? 'border-teal-500/50' : 'border-hapf-border'}`}>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold transition-colors ${providers[AIProvider.COHERE].enabled ? 'bg-teal-500/20 text-teal-500' : 'bg-hapf-border text-hapf-muted'}`}>C</div>
                                  <div>
                                      <div className="font-bold text-sm">Cohere</div>
                                      <div className="text-xs text-hapf-muted">command-r-plus</div>
                                  </div>
                              </div>
                              <button 
                                  onClick={() => toggleProvider(AIProvider.COHERE)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${providers[AIProvider.COHERE].enabled ? 'bg-teal-500 text-white border-teal-600' : 'bg-transparent border-hapf-border hover:bg-white/5'}`}
                              >
                                  {providers[AIProvider.COHERE].enabled ? 'ENABLED' : 'ENABLE'}
                              </button>
                          </div>
                          {/* API Key Input */}
                          {providers[AIProvider.COHERE].enabled && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 animate-in slide-in-from-top-2">
                                  <Key size={14} className="text-teal-500" />
                                  <input 
                                      type="password"
                                      placeholder="Enter Cohere API Key (production)"
                                      className="flex-1 bg-black/40 border border-hapf-border rounded px-2 py-1 text-xs text-hapf-text outline-none focus:border-teal-500 transition-colors placeholder:text-hapf-muted/30"
                                      value={providers[AIProvider.COHERE].apiKey || ''}
                                      onChange={(e) => updateProviderKey(AIProvider.COHERE, e.target.value)}
                                  />
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${providers[AIProvider.COHERE].apiKey ? 'text-green-400 bg-green-500/10' : 'text-hapf-muted bg-white/5'}`}>
                                      {providers[AIProvider.COHERE].apiKey ? 'PROD MODE' : 'SIMULATOR'}
                                  </span>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeSettingsTab === 'integrations' && (
                  <div className="space-y-4">
                      <div className="border border-hapf-accent/30 rounded-lg p-4 bg-hapf-accent/5">
                          <div className="flex items-center gap-3 mb-4">
                               <Workflow className="text-hapf-accent w-8 h-8"/>
                               <div>
                                   <div className="font-bold text-sm">n8n (Self-Hosted)</div>
                                   <div className="text-xs text-hapf-muted">Configure compilation target for n8n workflows.</div>
                               </div>
                          </div>
                          
                          <div className="space-y-3">
                              <div>
                                  <label className="block text-[10px] font-bold text-hapf-muted uppercase mb-1">Instance URL</label>
                                  <input 
                                      type="text" 
                                      placeholder="https://n8n.your-domain.com"
                                      className="w-full bg-black/40 border border-hapf-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-hapf-accent"
                                      value={n8nConfig.instanceUrl}
                                      onChange={(e) => setN8nConfig({...n8nConfig, instanceUrl: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-hapf-muted uppercase mb-1">API Key (Optional)</label>
                                  <input 
                                      type="password" 
                                      placeholder="n8n_api_key_..."
                                      className="w-full bg-black/40 border border-hapf-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-hapf-accent"
                                      value={n8nConfig.apiKey}
                                      onChange={(e) => setN8nConfig({...n8nConfig, apiKey: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* SYSTEM TAB */}
              {activeSettingsTab === 'system' && (
                  <div className="space-y-4">
                      <div className="border border-hapf-success/30 rounded-lg p-4 bg-hapf-success/5">
                          <div className="flex items-center gap-3 mb-4">
                               <Database className="text-hapf-success w-8 h-8"/>
                               <div>
                                   <div className="font-bold text-sm">Examples Library</div>
                                   <div className="text-xs text-hapf-muted">Manage the built-in HAPF pipeline examples.</div>
                               </div>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-xs text-hapf-text">Export all example code and inputs to JSON.</span>
                              <button 
                                  onClick={handleExportLibrary}
                                  className="bg-hapf-success hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-colors"
                              >
                                  <Download size={14} /> EXPORT LIBRARY
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default SettingsModal;
