import React, { useEffect, useRef, useState } from "react";
import AppLayout from "./AppLayout";
import {
  UserOutlined,
  MailOutlined,
  DownCircleOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Divider, Modal, QRCode, Table } from "antd";

import { db } from "../firebase/setup";
import { doc, getDoc } from "firebase/firestore";

import { variables } from "../constants/variables";

import { useAtom, useSetAtom } from "jotai";
import { pageLoading, store } from "../constants/stateVariables";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useReactToPrint } from "react-to-print";

function Profile() {
  const isPageLoading = useSetAtom(pageLoading);
  const [storeDetails] = useAtom(store);
  const setStoreDetails = useSetAtom(store);
  const [isDownloadModalOpen, setisDownloadModalOpen] = useState(false);
  console.log(storeDetails);
  const componentRef = useRef();

  const user = JSON.parse(localStorage.getItem("user"));

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
    } finally {
      isPageLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigstore();
  }, []);

  const [url, setUrl] = useState("");
  const [qrCodeValue, setQRCodeValue] = useState("");

  const generateQRCode = () => {
    setQRCodeValue(url);
  };

  // const handleGenerateAndDownload = async () => {

  //   const zip = new JSZip();

  // for (let i = 1; i <= storeDetails.tables; i++) {
  //   const link = `http://localhost:3001/menu/${user.uid}/${i}`; // Replace with your desired link

  //   // Generate QR code as a data URL
  //   const imageData = await QRCode.toDataURL(link, { width: 256 });

  //   // Remove the base64 prefix
  //   const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

  //   // Add the image to the zip file
  //   zip.file(`table-${i}.png`, base64Data, { base64: true });
  // }

  // const zipContent = await zip.generateAsync({ type: 'blob' });
  // saveAs(zipContent, `qr-${storeDetails.restaurantName}.zip`);
  // };

  // const downloadqr = (index) => {
  //   const canvas = document.getElementById(`qr-code-${index}`);
  //   canvas.toBlob((blob) => {
  //     saveAs(blob, `table-${index + 1}.png`);
  //   });
  // };

  // const handleDownload = () => {
  //   for (let i = 0; i < storeDetails.tables; i++) {
  //     downloadqr(i);
  //   }
  // };

  const download = () => {
    handlePrint();
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

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
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {storeDetails.tables > 0 ? (
              <>
                <span
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setisDownloadModalOpen(true)}
                >
                  Download QR code
                </span>
                <a
                  href={`${
                    variables.isDeployed
                      ? variables.deployedURL
                      : "http://localhost:3001"
                  }/menu/${user.uid}/0`}
                  target="_blank"
                >
                  click for menu
                </a>
                <Modal
                  width={1000}
                  title="Click Ok to download"
                  open={isDownloadModalOpen}
                  onOk={download}
                  onCancel={() => setisDownloadModalOpen(false)}
                >
                  <div
                    ref={componentRef}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: "20px",
                      margin:'0px 20px'
                    }}
                  >
                    {Array.from({ length: storeDetails.tables }, (_, index) => {
                      return (
                        <div>
                        <div
                          style={{
                            padding: "10px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            border: "1px solid #d2d2d2",
                            borderRadius: "10px",
                            gap: "10px",
                          }}
                        >
                        
                          <span>Scan to place order</span>
                          <span>Table - {index + 1}</span>
                          <QRCode
                            color={storeDetails.primaryColor}
                            size={250}
                            icon={require("../asset/images/logo.png")}
                            value={`${
                              variables.isDeployed
                                ? variables.deployedURL
                                : "http://localhost:3001"
                            }/menu/${user.uid}/${index + 1}`}
                          />
                          
                        </div>
                        {Number.isInteger((index+1)/6) && (
                          <>
                          <div style={{height:'60px', display:'flex', alignItems:'baseline', justifyContent:'flex-end', flexDirection:'column'}}>page {(index+1)/6}</div>
                          <hr />
                          </>
                        )}
                        </div>
                      );
                    })}
                  </div>
                </Modal>
              </>
            ) : (
              <>
                <span>scan for the menu</span>
                <QRCode
                  value={`${
                    variables.isDeployed
                      ? variables.deployedURL
                      : "http://localhost:3001"
                  }/menu/${user.uid}`}
                />
                <hr style={{ width: "100%" }} />
                <a
                  href={`${
                    variables.isDeployed
                      ? variables.deployedURL
                      : "http://localhost:3001"
                  }/menu/${user.uid}/0`}
                  target="_blank"
                >
                  click for menu
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Profile;
