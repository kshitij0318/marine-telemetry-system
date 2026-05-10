import { createBrowserRouter, Navigate } from "react-router";
import Root from "./pages/Root";
import MapCommandCenter from "./pages/MapCommandCenter";
import GNSSDashboard from "./pages/GNSSDashboard";
import CTDDashboard from "./pages/CTDDashboard";
import CurrentMeterDashboard from "./pages/CurrentMeterDashboard";
import ThrusterDashboard from "./pages/ThrusterDashboard";
import RadarDashboard from "./pages/RadarDashboard";
import FleetOverview from "./pages/FleetOverview";
import Settings from "./pages/Settings";
import PayloadDashboard from "./pages/PayloadDashboard";

import { PAGE_CONFIG } from "./config/pageVisibility";

const enabledPaths = new Set(PAGE_CONFIG.filter(p => p.enabled).map(p => p.path));
const firstEnabled = PAGE_CONFIG.find(p => p.enabled)?.path ?? '/';

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: enabledPaths.has('/map') ? <MapCommandCenter /> : <Navigate to={firstEnabled} replace /> },
      { path: "fleet", element: enabledPaths.has('/fleet') ? <FleetOverview /> : <Navigate to={firstEnabled} replace /> },
      { path: "map", element: enabledPaths.has('/map') ? <MapCommandCenter /> : <Navigate to={firstEnabled} replace /> },
      { path: "gnss", element: enabledPaths.has('/gnss') ? <GNSSDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "ctd", element: enabledPaths.has('/ctd') ? <CTDDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "current-meter", element: enabledPaths.has('/current-meter') ? <CurrentMeterDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "thruster", element: enabledPaths.has('/thruster') ? <ThrusterDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "radar", element: enabledPaths.has('/radar') ? <RadarDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "payload", element: enabledPaths.has('/payload') ? <PayloadDashboard /> : <Navigate to={firstEnabled} replace /> },
      { path: "settings", element: enabledPaths.has('/settings') ? <Settings /> : <Navigate to={firstEnabled} replace /> },
    ],
  },
]);
