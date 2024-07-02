import React, { useState, useEffect } from "react";
import { Menu, Layout } from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  HomeOutlined,
  HeartOutlined,
  ShopOutlined,
  ProductOutlined,
MenuOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { TbDeviceAnalytics } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { HiUserGroup } from "react-icons/hi";

const { Header, Content } = Layout;

const MainMenu = () => {
  const navigate = useNavigate();
  const [hideMenu, setHideMenu] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);

  const handleScroll = () => {
    const currentScrollPos = window.pageYOffset;
    const visible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
    setHideMenu(visible);
    setPrevScrollPos(currentScrollPos);
  };
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [prevScrollPos]);

  useEffect(() => {
    setHideMenu(true);
    console.log();
  }, []);

  return (
    <Header
      className="headerContainer"
      style={{
        position: "fixed",
        zIndex: 1,
        width: "100%",
        transition: "top 0.6s",
        top: hideMenu ? "0" : "-64px",
      }}
    >
      <Menu
        theme="dark"
        mode="horizontal"
        defaultSelectedKeys={[window.location.pathname]}
        style={{ lineHeight: "64px" }}
      >
        <Menu.Item
          key="/"
          icon={<HomeOutlined />}
          onClick={() => {
            navigate("/");
          }}
          className="app-light"
        >
          Billing center
        </Menu.Item>
        <Menu.Item
          key="/profile"
          icon={<UserOutlined />}
          onClick={() => {
            navigate("/profile");
          }}
          className="app-light"
        >
          Profile
        </Menu.Item>
  
        <Menu.Item key="/customers" icon={<HiUserGroup />} onClick={() => {
          navigate("/customers");
        }} className="app-light">
          Customers
        </Menu.Item>
        <Menu.Item key="/menu" icon={<MenuOutlined />} onClick={() => {
          navigate("/menu");
        }} className="app-light" >
        Menu
      </Menu.Item>
      <Menu.Item key="/orders" onClick={() => {
        navigate("/orders");
      }} icon={<ProductOutlined />} className="app-light">
      Orders
    </Menu.Item>
        <Menu.Item
          key="7"
          icon={<LogoutOutlined />}
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          className="app-light"
        >
          Logout
        </Menu.Item>
      </Menu>
    </Header>
  );
};

const ToolHeader = ({ children }) => {
  return <MainMenu />;
};

export default ToolHeader;
