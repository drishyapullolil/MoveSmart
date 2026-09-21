import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import CardApplication from "./pages/Cardapplication";
import MyRfidCard from "./pages/MyRfidCard";
import Driver from "./pages/Driver";
import DriverRfidDevice from "./pages/DriverRfidDevice";
import DriverNotifications from "./pages/DriverNotifications";
import DriverLocationSimulator from "./pages/DriverLocationSimulator";
import DriverLiveDrive from "./pages/DriverLiveDrive";
import DriverApply from "./pages/DriverApply";
import BusBooking from "./pages/BusBooking";
import Wallet from "./pages/Wallet";
import LostFound from "./pages/LostFound";
import ProtectedRoute from "./components/ProtectedRoute";

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Passenger / User Routes */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/my-rfid-card" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><MyRfidCard /></ProtectedRoute>} />
        <Route path="/dashboard/my-rfid-card" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><MyRfidCard /></ProtectedRoute>} />
        <Route path="/lost-found" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><LostFound /></ProtectedRoute>} />
        <Route path="/dashboard/lost-found" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><LostFound /></ProtectedRoute>} />
        <Route path="/dashboard/card-application" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><CardApplication /></ProtectedRoute>} />
        <Route path="/apply-card" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><CardApplication /></ProtectedRoute>} />
        <Route path="/card-application" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><CardApplication /></ProtectedRoute>} />
        <Route path="/book-bus" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><BusBooking /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute allowedRoles={["passenger", "user", "admin"]}><Wallet /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={["passenger", "user", "driver", "admin"]}><Profile /></ProtectedRoute>} />
        <Route path="/apply-driver" element={<ProtectedRoute allowedRoles={["passenger", "user"]}><DriverApply /></ProtectedRoute>} />

        {/* Driver Only Routes */}
        <Route path="/dashboard/driver" element={<ProtectedRoute allowedRoles={["driver"]}><Driver /></ProtectedRoute>} />
        <Route path="/driver" element={<ProtectedRoute allowedRoles={["driver"]}><Driver /></ProtectedRoute>} />
        <Route path="/driver/rfid-device" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverRfidDevice /></ProtectedRoute>} />
        <Route path="/dashboard/driver/rfid-device" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverRfidDevice /></ProtectedRoute>} />
        <Route path="/driver/location-simulator" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverLocationSimulator /></ProtectedRoute>} />
        <Route path="/driver/location-control" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverLocationSimulator /></ProtectedRoute>} />
        <Route path="/dashboard/driver/location-simulator" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverLocationSimulator /></ProtectedRoute>} />
        <Route path="/driver/live-drive" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverLiveDrive /></ProtectedRoute>} />
        <Route path="/dashboard/driver/live-drive" element={<ProtectedRoute allowedRoles={["driver", "admin"]}><DriverLiveDrive /></ProtectedRoute>} />
        <Route path="/driver/lost-found" element={<ProtectedRoute allowedRoles={["driver"]}><Driver defaultTab="lostfound" /></ProtectedRoute>} />
        <Route path="/driver/notifications" element={<ProtectedRoute allowedRoles={["driver"]}><DriverNotifications /></ProtectedRoute>} />
        <Route path="/dashboard/driver/notifications" element={<ProtectedRoute allowedRoles={["driver"]}><DriverNotifications /></ProtectedRoute>} />

        {/* Admin Only Routes - Drivers and regular users are strictly blocked */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="overview" /></ProtectedRoute>} />
        <Route path="/admin/bus-routes" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="busRoutes" /></ProtectedRoute>} />
        <Route path="/admin/add-bus-route" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="busRoutes" /></ProtectedRoute>} />
        <Route path="/admin/lost-found" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="lostFound" /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;