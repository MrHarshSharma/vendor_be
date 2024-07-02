import React, { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import { UserOutlined, MailOutlined, DownCircleOutlined } from "@ant-design/icons";
import { Avatar, Card, Divider, Table } from "antd";

import { db } from "../firebase/setup";
import { doc, getDoc } from "firebase/firestore";
import QRCode from 'qrcode.react';
import { variables } from "../constants/variables";


function Profile() {
  const empyMenu={
    maincourse: [],
    starter: [],
    beverage: [],
  }

  const user = JSON.parse(localStorage.getItem("user"));
  const [storeDetails, setStoreDetails] = useState(null);
  const fetchConfigstore = async () => {
    try {
      if (!user) {
        throw new Error("No user UID found in localStorage");
      }

      const configRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(configRef);

      if (docSnap.exists()) {
        console.log("this user data", docSnap.data());
        setStoreDetails(docSnap.data());
        
      } else {
        console.log("No such document!");
        // return null;
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  };

  useEffect(() => {
    fetchConfigstore();
  }, []);
  

  const [url, setUrl] = useState('');
  const [qrCodeValue, setQRCodeValue] = useState('');

  const generateQRCode = () => {
    setQRCodeValue(url);
  };



 
  return (
    <AppLayout>
      <div className="profile-container">
        <Avatar
          size={80}
          icon={<UserOutlined />}
          src={
            user.photoURL ||
            "https://zos.alipayobjects.com/rms/rmscsv33/CgQkNwdX.png"
          } // Default avatar
          alt="User Avatar"
        />
        <div className="user-details">
          <h2>{user.displayName}</h2>
          <p>
            <MailOutlined /> {user.email}
          </p>
        </div>
        <Divider /> {/* Optional divider for better separation */}
        {user && (
          <div style={{ marginTop: '20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <span>scan for the menu</span>
            <QRCode value={`${variables.isDeployed?variables.deployedURL:'http://localhost:3001'}/menu/${user.uid}`} />
            <hr style={{width:'100%'}}/>
            <a href={`${variables.isDeployed?variables.deployedURL:'http://localhost:3001'}/menu/${user.uid}`} target="_blank">click for menu</a>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Profile;
