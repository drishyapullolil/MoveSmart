import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import CardApplication from "./pages/Cardapplication";
import Driver from "./pages/Driver";
import DriverNotifications from "./pages/DriverNotifications";
import DriverApply from "./pages/DriverApply";
import BusBooking from "./pages/BusBooking";
import Wallet from "./pages/Wallet";
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
        <Route path="/driver/notifications" element={<ProtectedRoute allowedRoles={["driver"]}><DriverNotifications /></ProtectedRoute>} />
        <Route path="/dashboard/driver/notifications" element={<ProtectedRoute allowedRoles={["driver"]}><DriverNotifications /></ProtectedRoute>} />

        {/* Admin Only Routes - Drivers and regular users are strictly blocked */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="overview" /></ProtectedRoute>} />
        <Route path="/admin/bus-routes" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="busRoutes" /></ProtectedRoute>} />
        <Route path="/admin/add-bus-route" element={<ProtectedRoute allowedRoles={["admin"]}><Admin defaultTab="busRoutes" /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;