import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import MapCommandCenter from "./pages/MapCommandCenter";
import GNSSDashboard from "./pages/GNSSDashboard";
import CTDDashboard from "./pages/CTDDashboard";
import CurrentMeterDashboard from "./pages/CurrentMeterDashboard";
import ThrusterDashboard from "./pages/ThrusterDashboard";
import RadarDashboard from "./pages/RadarDashboard";
import FleetOverview from "./pages/FleetOverview";
import Settings from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: MapCommandCenter },
      { path: "fleet", Component: FleetOverview },
      { path: "map", Component: MapCommandCenter },
      { path: "gnss", Component: GNSSDashboard },
      { path: "ctd", Component: CTDDashboard },
      { path: "current-meter", Component: CurrentMeterDashboard },
      { path: "thruster", Component: ThrusterDashboard },
      { path: "radar", Component: RadarDashboard },
      { path: "settings", Component: Settings },
    ],
  },
]);
