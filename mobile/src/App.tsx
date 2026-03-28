import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './app/_layout';
import { OnboardingScreen } from './app/index';
import { SearchScreen } from './app/search';
import { ResultsScreen } from './app/results';
import { SegmentScreen } from './app/segment';
import { NavigateScreen } from './app/navigate';
import { SettingsScreen } from './app/settings';

const hasSavedProfile = () => {
  try { return !!localStorage.getItem('pathsense_profile'); } catch { return false; }
};

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={hasSavedProfile() ? <Navigate to="/search" replace /> : <OnboardingScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/segment" element={<SegmentScreen />} />
          <Route path="/navigate" element={<NavigateScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
