import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Users from "./pages/Users";
import Menu from "./pages/Menu";
import Materials from "./pages/Materials";
import Inventory from "./pages/Inventory";
import MenuStock from "./pages/MenuStock";
import RiderStock from "./pages/RiderStock";
import Deposits from "./pages/Deposits";
import Expenses from "./pages/Expenses";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Coach from "./pages/Coach";
import Attendance from "./pages/Attendance";
import Salary from "./pages/Salary";
import Withdrawals from "./pages/Withdrawals";
import Handover from "./pages/Handover";
import PurchaseOrders from "./pages/PurchaseOrders";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import More from "./pages/More";
import OwnerOnboarding from "./pages/OwnerOnboarding";
import "./App.css";

function Shell() {
  const { user } = useAuth();
  
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/assets/si-four-am-logo.png" alt="Memuat SI FOUR AM" className="w-24 h-24 object-contain si4am-loader" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="users" element={<Users />} />
        <Route path="menu" element={<Menu />} />
        <Route path="materials" element={<Materials />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="menu-stock" element={<MenuStock />} />
        <Route path="rider-stock" element={<RiderStock />} />
        <Route path="deposits" element={<Deposits />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="coach" element={<Coach />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="salary" element={<Salary />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="handover" element={<Handover />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="more" element={<More />} />
        <Route path="onboarding" element={<OwnerOnboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}