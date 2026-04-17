import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export const LogTable = ({ logs, columns, expandedRowRender, rowClassName }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-soc-border">
            {columns.map((col, idx) => (
              <th 
                key={idx}
                className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                {col.title}
              </th>
            ))}
            {expandedRowRender && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => {
            const customClass = rowClassName ? rowClassName(log) : '';
            return (
              <motion.tr
                key={log.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border-b border-soc-border hover:bg-white/5 transition-colors cursor-pointer ${customClass}`}
                onClick={() => expandedRowRender && setExpandedRow(expandedRow === index ? null : index)}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 text-sm">
                    {col.render ? col.render(log) : log[col.key]}
                  </td>
                ))}
                {expandedRowRender && (
                  <td className="py-3 px-2">
                    {expandedRow === index ? (
                      <ChevronUp size={16} className="text-soc-primary" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </td>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      {expandedRowRender && expandedRow !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-soc-darker border-t border-soc-border p-4"
        >
          {expandedRowRender(logs[expandedRow])}
        </motion.div>
      )}
    </div>
  );
};