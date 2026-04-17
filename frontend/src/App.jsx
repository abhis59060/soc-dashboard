import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { WindowsLogs } from './components/WindowsLogs/WindowsLogs';
import { Alerts } from './components/Alerts/Alerts';
import { AlertProvider } from './context/AlertContext';

function App() {
  return (
    <Router>
      <AlertProvider>
        <Toaster />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/windows" element={<WindowsLogs />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </Layout>
      </AlertProvider>
    </Router>
  );
}

export default App;