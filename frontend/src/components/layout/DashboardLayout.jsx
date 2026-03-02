import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function DashboardLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "20px 30px"
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;