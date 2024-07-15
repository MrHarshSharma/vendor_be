import React, { useState, useEffect } from "react";
import { Menu, Layout, message } from "antd";
import { db } from '../firebase/setup'
import { collection, query, where, getDocs } from 'firebase/firestore';

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
import { checkIsUserPlanExpired } from "../constants/commonFunctions";
import { useDispatch } from "react-redux";
import { setPageLoading } from "../actions/storeAction";

const { Header, Content } = Layout;

const MainMenu = () => {
  let user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [hideMenu, setHideMenu] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);

  useEffect(() => {
    fetchUserDocument();
  }, []);

  const fetchUserDocument = async () => {
    try {
      const q = query(
        collection(db, 'authUser'),
        where('email', '==', user.email)
      );
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data(); // Assuming only one document matches
        let isExpired = checkIsUserPlanExpired(docData.expiryDate);
        if(isExpired) {
          message.error('Your plan has expired')
          localStorage.clear();
          navigate("/login");
        }
      } else {
        console.log('No matching documents.');
      }
    } catch (error) {
      console.error('Error fetching document: ', error);
    }
  };

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

  const navigateTo = (route) => {
    dispatch(setPageLoading({payload:true}))
    navigate(route);
  }

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
            navigateTo("/");
          }}
          className="app-light"
        >
         Cherish chow
        </Menu.Item>
        <Menu.Item
          key="/profile"
          icon={<UserOutlined />}
          onClick={() => {
            navigateTo("/profile");
          }}
          className="app-light"
        >
          Profile
        </Menu.Item>
  
        <Menu.Item key="/customers" icon={<HiUserGroup />} onClick={() => {
          navigateTo("/customers");
        }} className="app-light">
          Customers
        </Menu.Item>
        <Menu.Item key="/menu" icon={<MenuOutlined />} onClick={() => {
          navigateTo("/menu");
        }} className="app-light" >
        Menu
      </Menu.Item>
      <Menu.Item key="/orders" onClick={() => {
        navigateTo("/orders");
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
