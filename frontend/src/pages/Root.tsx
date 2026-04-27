import React from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../app/components/Sidebar';
import { Header } from '../app/components/Header';
import { SensorBar } from '../app/components/SensorBar';
import { WelcomeBanner } from '../app/components/WelcomeBanner';
import { ThemeProvider } from '../contexts/ThemeContext';
import { TelemetryProvider } from '../contexts/TelemetryContext';
import { MissionProvider } from '../contexts/MissionContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function Root() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <MissionProvider>
          <DndProvider backend={HTML5Backend}>
            <div className="flex h-screen bg-marine-dark overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 ml-16">
                <Header />
                <SensorBar />
                <main className="flex-1 overflow-auto relative custom-scrollbar">
                  <Outlet />
                </main>
              </div>
              <WelcomeBanner />
            </div>
          </DndProvider>
        </MissionProvider>
      </TelemetryProvider>
    </ThemeProvider>

  );
}
