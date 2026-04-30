import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Loader2,
  Settings2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getRules, addRule, deleteRule } from '../../api';

export const AlertRulesModal = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState({ event_id: '', description: '' });

  const predefinedRules = [
    { event_id: '4625', description: 'Failed Login' },
    { event_id: '4672', description: 'Admin Privileges' },
    { event_id: '666', description: 'Malicious Activity' },
    { event_id: '1102', description: 'Log Cleared' },
    { event_id: '4740', description: 'Account Locked Out' },
    { event_id: '4688', description: 'New Process Created' }
  ];

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await getRules();
      setRules(data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  const filteredPredefinedRules = predefinedRules.filter(
    pre => !rules.some(active => String(active.event_id) === String(pre.event_id))
  );

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const handleAdd = async () => {
    if (!newRule.event_id) return;
    try {
      setAdding(true);
      await addRule(newRule);
      toast.success(`Rule for ${newRule.event_id} added`, {
        style: {
          background: '#1a1a1a',
          color: '#10b981',
          border: '1px solid #10b98133'
        }
      });
      setNewRule({ event_id: '', description: '' });
      fetchRules();
    } catch (error) {
      console.error("Add rule error:", error.response?.data || error.message);
      toast.error(error.response?.data?.detail || "Failed to add rule");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (eventId) => {
    // Optimistic Update
    const previousRules = [...rules];
    setRules(prev => prev.filter(r => String(r.event_id) !== String(eventId)));

    try {
      await deleteRule(eventId);
      toast.success(`Rule ${eventId} removed`, {
        style: {
          background: '#1a1a1a',
          color: '#10b981',
          border: '1px solid #10b98133'
        }
      });
      // Force refresh from backend to ensure synchronization
      await fetchRules();
    } catch (error) {
      console.error("Delete rule error:", error.response?.data || error.message);
      toast.error(error.response?.data?.detail || "Failed to remove rule");
      // Revert on failure
      setRules(previousRules);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="max-w-md w-full bg-[#0d0d17] border border-soc-border rounded-2xl p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-soc-primary/10 rounded-lg">
              <Settings2 className="text-soc-primary" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Alert Rules</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Custom Threat Definitions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-soc-dark border border-soc-border rounded-xl space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-soc-primary uppercase tracking-widest ml-1">Predefined Templates</label>
              <select 
                className="w-full bg-[#08080c] border border-soc-border text-white text-xs rounded-lg px-4 py-2.5 outline-none focus:border-soc-primary transition-all font-bold"
                value={newRule.event_id}
                onChange={(e) => {
                  const selected = predefinedRules.find(r => r.event_id === e.target.value);
                  setNewRule({ 
                    event_id: e.target.value, 
                    description: selected ? selected.description : '' 
                  });
                }}
              >
                <option value="">Choose a Template...</option>
                {filteredPredefinedRules.map(r => (
                  <option key={r.event_id} value={r.event_id}>{r.event_id} - {r.description}</option>
                ))}
              </select>
            </div>
            
            <div className="relative flex items-center">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Manual Entry</label>
                <input 
                  type="text" 
                  placeholder="Enter Event ID..."
                  className="w-full bg-[#08080c] border border-soc-border text-white text-xs rounded-lg px-4 py-2.5 outline-none focus:border-soc-primary transition-all font-mono"
                  value={newRule.event_id}
                  onChange={(e) => setNewRule({ ...newRule, event_id: e.target.value })}
                />
              </div>
              <button 
                onClick={handleAdd}
                disabled={adding || !newRule.event_id}
                className="ml-2 mt-4 p-2.5 bg-soc-primary text-[#0d0d17] rounded-lg font-black hover:bg-soc-primary/80 transition-all disabled:opacity-50"
              >
                {adding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center py-8 text-gray-500">
              <Loader2 className="animate-spin mb-2 text-soc-primary" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing with DB...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-500 border border-dashed border-soc-border rounded-xl bg-soc-dark/30">
              <ShieldAlert size={32} className="mb-2 opacity-20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">No active rule overrides</span>
            </div>
          ) : (
            rules.map((rule) => (
              <motion.div 
                key={rule.event_id} 
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-soc-darker/50 rounded-xl border border-soc-border group hover:border-soc-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-soc-primary/10 border border-soc-primary/20 flex items-center justify-center text-soc-primary font-mono text-sm font-black">
                    {rule.event_id}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white uppercase tracking-tight">
                      {rule.description || 'Custom Definition'}
                    </div>
                    <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                      Active Trigger
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(rule.event_id)}
                  className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Remove Rule"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-200/60 font-medium leading-relaxed">
            <span className="text-amber-500 font-black mr-1 uppercase">Warning:</span>
            Configured Event IDs will bypass standard severity logic and trigger <span className="text-amber-400 font-bold">CRITICAL</span> alerts across all monitoring nodes.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
