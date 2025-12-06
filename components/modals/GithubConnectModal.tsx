
import React from 'react';
import { X, Github, Globe, Lock } from 'lucide-react';
import { GithubConfig } from '../../types';

interface GithubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GithubConfig;
  setConfig: (config: GithubConfig) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

const GithubConnectModal: React.FC<GithubConnectModalProps> = ({
  isOpen, onClose, config, setConfig, onConnect, onDisconnect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-hapf-panel border border-hapf-border w-[500px] rounded-lg shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2"><Github /> Connect Repository</h2>
                <button onClick={onClose} className="text-hapf-muted hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-hapf-muted uppercase mb-1">Repository URL</label>
                    <div className="flex items-center gap-2 bg-black border border-hapf-border rounded px-3 py-2 focus-within:border-hapf-primary">
                        <Globe size={16} className="text-hapf-muted"/>
                        <input 
                            type="text" 
                            className="bg-transparent w-full outline-none text-sm font-mono"
                            placeholder="https://github.com/owner/repo"
                            value={config.repoUrl}
                            onChange={(e) => setConfig({...config, repoUrl: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-hapf-muted uppercase mb-1">
                        Access Token <span className="text-[10px] font-normal lowercase">(optional, for private repos)</span>
                    </label>
                    <div className="flex items-center gap-2 bg-black border border-hapf-border rounded px-3 py-2 focus-within:border-hapf-primary">
                        <Lock size={16} className="text-hapf-muted"/>
                        <input 
                            type="password" 
                            className="bg-transparent w-full outline-none text-sm font-mono"
                            placeholder="ghp_..."
                            value={config.token}
                            onChange={(e) => setConfig({...config, token: e.target.value})}
                        />
                    </div>
                    <p className="text-[10px] text-hapf-muted mt-2">
                        Token is stored in memory only. We fetch the file tree and read content of configuration files (package.json, etc.) to generate the HAPF spec.
                    </p>
                </div>

                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={() => { onConnect(); onClose(); }}
                        className="flex-1 bg-hapf-primary hover:bg-blue-600 text-white py-2 rounded font-bold text-sm transition-colors"
                    >
                        Connect & Use
                    </button>
                    <button 
                         onClick={() => { onDisconnect(); onClose(); }}
                        className="px-4 py-2 border border-hapf-border hover:bg-hapf-border rounded font-bold text-sm transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default GithubConnectModal;
