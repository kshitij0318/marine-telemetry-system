import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";

import ParentDashboard from "./pages/ParentDashboard";
import GNSSDashboard from "./components/sensors/gnss/GNSSDashboard";
import CTDDashboard from "./components/sensors/ctd/CTDDashboard";
import CurrentMeterDashboard from "./components/sensors/currentMeter/CurrentMeterDashboard";
import ThrusterDashboard from "./components/sensors/thruster/ThrusterDashboard";
import OASDashboard from "./components/sensors/oas/OASDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<ParentDashboard />} />
        <Route path="gnss" element={<GNSSDashboard />} />
        <Route path="ctd" element={<CTDDashboard />} />
        <Route path="current-meter" element={<CurrentMeterDashboard />} />
        <Route path="thruster" element={<ThrusterDashboard />} />
        <Route path="oas" element={<OASDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;