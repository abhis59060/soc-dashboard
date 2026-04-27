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
      toast.success(`Rule for ${newRule.event_id} added`);
      setNewRule({ event_id: '', description: '' });
      fetchRules();
    } catch (error) {
      toast.error("Failed to add rule");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await deleteRule(eventId);
      toast.success("Rule removed");
      fetchRules();
    } catch (error) {
      toast.error("Failed to remove rule");
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
            <Settings2 className="text-soc-primary" size={24} />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Alert Rules</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <select 
                className="w-full bg-soc-dark border border-soc-border text-white text-xs rounded-xl px-4 py-3 outline-none focus:border-soc-primary transition-all font-bold"
                value={newRule.event_id}
                onChange={(e) => {
                  const selected = predefinedRules.find(r => r.event_id === e.target.value);
                  setNewRule({ 
                    event_id: e.target.value, 
                    description: selected ? selected.description : '' 
                  });
                }}
              >
                <option value="">Select Event ID...</option>
                {filteredPredefinedRules.map(r => (
                  <option key={r.event_id} value={r.event_id}>{r.event_id} - {r.description}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="Custom Event ID (if not in list)"
                className="w-full bg-soc-dark border border-soc-border text-white text-xs rounded-xl px-4 py-3 outline-none focus:border-soc-primary transition-all"
                value={newRule.event_id}
                onChange={(e) => setNewRule({ ...newRule, event_id: e.target.value })}
              />
            </div>
            <button 
              onClick={handleAdd}
              disabled={adding || !newRule.event_id}
              className="px-6 bg-soc-primary text-[#0d0d17] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-soc-primary/80 transition-all disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
          {loading ? (
            <div className="flex flex-col items-center py-8 text-gray-500">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Loading rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-500 border border-dashed border-soc-border rounded-xl">
              <AlertTriangle size={24} className="mb-2 opacity-50" />
              <span className="text-[10px] font-bold uppercase tracking-widest">No custom rules active</span>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.event_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-soc-primary/10 flex items-center justify-center text-soc-primary font-mono text-xs font-black">
                    {rule.event_id}
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                    {rule.description || 'Custom Rule'}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(rule.event_id)}
                  className="p-2 text-red-500/50 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-[10px] text-amber-200/70 font-bold leading-relaxed">
            <span className="text-amber-500 mr-1">NOTE:</span>
            Only Event IDs in this list will trigger real-time toast notifications and appear in the Security Matrix.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
