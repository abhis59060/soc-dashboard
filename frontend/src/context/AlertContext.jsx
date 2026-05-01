import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getStats, getUnreadAlertCount } from '../api';
import toast from 'react-hot-toast';

const AlertContext = createContext();

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alertCount, setAlertCount] = useState(0);
  const [severityCounts, setSeverityCounts] = useState({ high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const prevAlertCount = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch overall stats for severity breakdown
      const statsResponse = await getStats();
      if (statsResponse && statsResponse.severity_breakdown) {
        setSeverityCounts(statsResponse.severity_breakdown);
      }

      // 2. Fetch specific unread security alerts count
      const unreadResponse = await getUnreadAlertCount();
      if (unreadResponse && typeof unreadResponse.count === 'number') {
        const newCount = unreadResponse.count;
        
        // If count increased, show a notification
        if (newCount > prevAlertCount.current) {
          toast.error(`CRITICAL: ${newCount - prevAlertCount.current} new security alert(s) detected!`, {
            duration: 5000,
            position: 'top-right',
            style: {
              background: '#1a1a2e',
              color: '#ff4d4d',
              border: '1px solid #ff4d4d33',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          });
        }
        
        setAlertCount(newCount);
        prevAlertCount.current = newCount;
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <AlertContext.Provider value={{ 
      alertCount, 
      severityCounts, 
      setAlertCount, 
      refreshAlertCount: fetchData,
      refreshAllData: fetchData
    }}>
      {children}
    </AlertContext.Provider>
  );
};
