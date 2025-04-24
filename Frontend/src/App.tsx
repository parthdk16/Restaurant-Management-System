// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {SignIn} from './components/AuthenticationPage'
import {SignUpForm} from './components/SignUpForm';
import { Dashboard } from './components/Dashboard';
import { ManageTables } from './components/ManageTables';
import { ThemeProvider } from "@/components/theme-provider";
import { EditProfile } from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './components/404';
import { ManageMenu } from './components/MenuManager';
import { ManageOrders } from './components/OrderManager';
import { FoodOrderingPage } from './components/FoodOrderPage';
import { TableOrderPage } from './components/TableOrder';
import { TransactionHistory } from './components/Transactions';
import { SecuritySettings } from './components/SecuritySettings';
import { RestaurantLandingPage } from './components/CustomerLanding';
import { InventoryItemList } from './components/InventoryItemList';
import { CustomerLogin } from './components/CustomerLogin';
import { DeliverySignIn } from './components/DeliveryLogin';
import { DeliveryDashboard } from './components/DeliveryDashboard';
import { HomePage } from './components/Home';
import ProfilePage from './components/CustomerProfile';
import { OrdersPage } from './components/MyOrders';
import DeliveryD from './components/Delivery';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <Router>
        <Routes>
          <Route path="/" element={<RestaurantLandingPage/>} />
          <Route path="/signup" element={<SignUpForm/>} />
          <Route path="/tables" element={<ManageTables/>} />
          <Route path="/manage-menu" element={<ManageMenu/>} />
          {/* <Route path="/manage-orders" element={<EditOrder/>} /> */}
          <Route path="/profile" element={<EditProfile/>} />
          <Route path="/admin/login" element={  <SignIn/> } />
          <Route path="/login" element={  <CustomerLogin/> } />
          <Route path="/signup" element={ <SignUpForm/>} />
          <Route path="/orders" element={ <ManageOrders/>} />
          <Route path="/food-order" element={ <FoodOrderingPage/>} />
          <Route path="/history" element={ <TransactionHistory/>} />
          <Route path="/dinein-orders" element={ <TableOrderPage/>} />
          <Route path="/page-not-found" element={ <NotFound/>} />
          <Route path="/restaurant" element={ <RestaurantLandingPage/>} />
          <Route path="/security" element={ <SecuritySettings/>} />
          <Route path="/manage-inventory" element={ <InventoryItemList/>} />
          <Route path="/orders-user" element={ <OrdersPage userId=''/>} />
          <Route path="/home" element={ <HomePage/>} />
          <Route path="/my-profile" element={ <ProfilePage/>} />
          <Route path="/delivery/login" element={ <DeliverySignIn/>} />
          <Route path="/delivery/dashboard" element={ <DeliveryD/>} />
          <Route path="/del-person" element={ <DeliveryD/>} />
          <Route path="*" element={<NotFound />} />
          <Route path="/dashboard" element={ <ProtectedRoute><Dashboard /></ProtectedRoute> } />
        </Routes>
    </Router>
    </ThemeProvider>
  );
};

export default App;