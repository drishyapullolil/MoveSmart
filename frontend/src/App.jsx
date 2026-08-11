import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminAddBusRoute from "./pages/AdminAddBusRoute";
import CardApplication from "./pages/Cardapplication";
import Driver from "./pages/Driver";
import DriverApply from "./pages/DriverApply";
import BusBooking from "./pages/BusBooking";
import Wallet from "./pages/Wallet";

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/card-application" element={<CardApplication />} />
        <Route path="/dashboard/driver" element={<Driver />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/apply-driver" element={<DriverApply />} />
        <Route path="/book-bus" element={<BusBooking />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin defaultTab="overview" />} />
        <Route path="/admin/bus-routes" element={<Admin defaultTab="busRoutes" />} />
        <Route path="/admin/add-bus-route" element={<Admin defaultTab="busRoutes" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;