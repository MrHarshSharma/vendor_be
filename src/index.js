import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import Dashboard from "./pages/Dashboard";

import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";
import { ConfigProvider } from "antd";
import MobileNumberLogin from "./pages/MobileNumberLogin";
import Protected from "./components/Protected";
import Profile from "./pages/Profile";
import MenuPage from "./pages/MenuPage";
import Orders from "./pages/Orders";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/" element={<Protected />}>
        <Route path="/" index element={<Dashboard />} />
        <Route path="profile" index element={<Profile />} />
        <Route path="menu" index element={<MenuPage />} />
        <Route path="/orders" index element={<Orders />} />
      </Route>
      <Route path="login" element={<MobileNumberLogin />} />
    </Route>
  )
);
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: "#00b96b" } }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
