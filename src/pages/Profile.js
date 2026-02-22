import React, { useEffect, useRef, useState } from "react";
import AppLayout from "./AppLayout";
import { UserOutlined } from "@ant-design/icons";
import { Avatar, Modal, QRCode, Button } from "antd";
import {
  FiMapPin,
  FiDownload,
  FiExternalLink,
  FiGrid,
  FiPrinter,
} from "react-icons/fi";
import { MdStorefront, MdQrCode2 } from "react-icons/md";

import { db } from "../firebase/setup";
import { doc, getDoc } from "firebase/firestore";

import { variables } from "../constants/variables";

import { useAtom, useSetAtom } from "jotai";
import { pageLoading, store } from "../constants/stateVariables";
import { useReactToPrint } from "react-to-print";
import { colors } from "../constants/colors";

function Profile() {
  const isPageLoading = useSetAtom(pageLoading);
  const [storeDetails] = useAtom(store);
  const setStoreDetails = useSetAtom(store);
  const [isDownloadModalOpen, setisDownloadModalOpen] = useState(false);
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
        setStoreDetails(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      isPageLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigstore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const menuUrl = `${
    variables.isDeployed ? variables.deployedURL : "http://localhost:3000"
  }/menu/${user?.uid}/0`;

  const SectionCard = ({ icon, title, children, action }) => (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: `${colors.success}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ icon, label, value }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid #f8f8f8",
      }}
    >
      <div style={{ color: "#888", width: "20px" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "15px", color: "#333", fontWeight: "500" }}>{value || "-"}</div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div
        style={{
          height: "calc(100vh - 64px)",
          background: "#f5f7fa",
          overflow: "auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "350px 1fr",
            gap: "24px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* Left Column - User & Store Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* User Profile Card */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "32px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <Avatar
                size={100}
                icon={<UserOutlined />}
                src={user?.photoURL}
                style={{
                  border: `4px solid ${colors.success}`,
                  marginBottom: "16px",
                }}
              />
              <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "600", color: "#333" }}>
                {user?.displayName || "User"}
              </h2>
              <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
                {user?.email}
              </p>
            </div>

            {/* Store Info Card */}
            <SectionCard
              icon={<MdStorefront size={20} color={colors.success} />}
              title="Store Details"
            >
              <InfoRow
                icon={<MdStorefront size={18} />}
                label="Restaurant Name"
                value={storeDetails?.restaurantName}
              />
              <InfoRow
                icon={<FiGrid size={18} />}
                label="Restaurant Type"
                value={storeDetails?.restaurantType?.charAt(0).toUpperCase() + storeDetails?.restaurantType?.slice(1)}
              />
              <InfoRow
                icon={<FiMapPin size={18} />}
                label="Number of Tables"
                value={storeDetails?.tables || 0}
              />

              {/* Color Preview */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                  Brand Colors
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: storeDetails?.primaryColor || "#ccc",
                        border: "2px solid #e0e0e0",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#666" }}>Primary</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: storeDetails?.secondaryColor || "#ccc",
                        border: "2px solid #e0e0e0",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#666" }}>Secondary</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column - QR Codes */}
          <SectionCard
            icon={<MdQrCode2 size={20} color={colors.success} />}
            title="QR Codes"
            action={
              storeDetails?.tables > 0 && (
                <Button
                  type="primary"
                  icon={<FiDownload size={16} />}
                  onClick={() => setisDownloadModalOpen(true)}
                  style={{
                    background: colors.success,
                    borderColor: colors.success,
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Download All QR Codes
                </Button>
              )
            }
          >
            {storeDetails?.tables > 0 ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {Array.from({ length: Math.min(storeDetails.tables, 6) }, (_, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#f8f9fa",
                        borderRadius: "12px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          background: colors.success,
                          color: "white",
                          padding: "4px 16px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        Table {index + 1}
                      </div>
                      <QRCode
                        color={storeDetails.primaryColor || "#000"}
                        size={150}
                        value={`${
                          variables.isDeployed
                            ? variables.deployedURL
                            : "http://localhost:3000"
                        }/menu/${user?.uid}/${index + 1}`}
                        style={{ borderRadius: "8px" }}
                      />
                    </div>
                  ))}
                </div>

                {storeDetails.tables > 6 && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "16px",
                      background: "#f0f7ff",
                      borderRadius: "10px",
                      textAlign: "center",
                      color: "#1890ff",
                    }}
                  >
                    +{storeDetails.tables - 6} more tables. Click "Download All QR Codes" to get all.
                  </div>
                )}

                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    background: `${colors.success}10`,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                      View Live Menu
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      See how your menu looks to customers
                    </div>
                  </div>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 20px",
                      background: colors.success,
                      color: "white",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    <FiExternalLink size={16} />
                    Open Menu
                  </a>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "40px 20px",
                  textAlign: "center",
                }}
              >
                <QRCode
                  color={storeDetails?.primaryColor || "#000"}
                  size={200}
                  value={menuUrl}
                  style={{ marginBottom: "20px" }}
                />
                <p style={{ color: "#666", marginBottom: "16px" }}>
                  Scan this QR code to view your menu
                </p>
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 24px",
                    background: colors.success,
                    color: "white",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  <FiExternalLink size={16} />
                  Open Menu
                </a>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Print Modal */}
        <Modal
          width={1000}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiPrinter size={20} />
              Download QR Codes
            </div>
          }
          open={isDownloadModalOpen}
          onOk={handlePrint}
          onCancel={() => setisDownloadModalOpen(false)}
          okText="Print / Download"
          okButtonProps={{
            style: { background: colors.success, borderColor: colors.success },
          }}
        >
          <div
            ref={componentRef}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: "20px",
              padding: "20px",
              justifyContent: "center",
            }}
          >
            {storeDetails?.tables > 0 &&
              Array.from({ length: storeDetails.tables }, (_, index) => (
                <div key={index}>
                  <div
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "2px solid #e0e0e0",
                      borderRadius: "12px",
                      gap: "12px",
                      background: "white",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      {storeDetails?.restaurantName}
                    </div>
                    <div
                      style={{
                        background: colors.success,
                        color: "white",
                        padding: "4px 16px",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      Table {index + 1}
                    </div>
                    <QRCode
                      color={storeDetails.primaryColor || "#000"}
                      size={200}
                      icon={require("../asset/images/logo.png")}
                      value={`${
                        variables.isDeployed
                          ? variables.deployedURL
                          : "http://localhost:3000"
                      }/menu/${user?.uid}/${index + 1}`}
                    />
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      Scan to place order
                    </div>
                  </div>
                  {Number.isInteger((index + 1) / 6) && (
                    <div
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                        fontSize: "12px",
                      }}
                    >
                      — Page {(index + 1) / 6} —
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

export default Profile;
