import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";

import ParentDashboard from "./pages/ParentDashboard";
import GNSSDashboard from "./components/sensors/gnss/GNSSDashboard";
import CTDDashboard from "./components/sensors/ctd/CTDDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<ParentDashboard />} />
        <Route path="gnss" element={<GNSSDashboard />} />
        <Route path="ctd" element={<CTDDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;