import React, { useState, useEffect } from "react";
import AppLayout from "./AppLayout";
import { Form, Input, Button, Select, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  FiSettings,
  FiType,
  FiImage,
  FiDroplet,
} from "react-icons/fi";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/setup";
import { useNavigate } from "react-router-dom";
import { SketchPicker } from "react-color";

import { useSetAtom } from "jotai";
import { pageLoading, store } from "../constants/stateVariables";
import { colors } from "../constants/colors";

function Dashboard() {
  const updateTheStore = useSetAtom(store);
  const updateTheLoading = useSetAtom(pageLoading);

  const { Option } = Select;
  let user = JSON.parse(localStorage.getItem("user"));

  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);
  const [loading, setLoading] = useState(false);
  const storage = getStorage();
  const navigate = useNavigate();
  const [primaryColor, setPrimaryColor] = useState("#ffffff");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);

  const fetchConfigstore = async () => {
    try {
      if (!user) {
        throw new Error("No user UID found in localStorage");
      }

      const configRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(configRef);

      if (docSnap.exists()) {
        let wholeData = docSnap.data();
        updateTheStore(wholeData);
        setPrimaryColor(wholeData.primaryColor || "#ffffff");
        setSecondaryColor(wholeData.secondaryColor || "#ffffff");
        setCurrentLogo(wholeData.logo);
        form.setFieldsValue({
          restaurantName: wholeData.restaurantName,
          restaurantType: wholeData.restaurantType,
          primarycolor: wholeData.primaryColor,
          secondarycolor: wholeData.secondaryColor,
          tagline: wholeData.tagline,
          subtagline: wholeData.subtagline,
          tables: wholeData.tables,
        });
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      updateTheLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigstore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrimaryColorChange = (color) => {
    setPrimaryColor(color.hex);
    form.setFieldsValue({ primarycolor: color.hex });
  };

  const handleSecondaryColorChange = (color) => {
    setSecondaryColor(color.hex);
    form.setFieldsValue({ secondarycolor: color.hex });
  };

  const uploadLogoImage = async (file, uid, logoname) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `logos/${uid}/${logoname}`);
      const metadata = { contentType: file.type };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on(
        "state_changed",
        () => { },
        (error) => {
          console.error("Error uploading logo image:", error);
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => resolve(downloadURL))
            .catch((error) => {
              console.error("Error getting download URL:", error);
              reject(error);
            });
        }
      );
    });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    let { restaurantType, restaurantName, tagline, subtagline, tables } = values;
    tables = tables === "" ? 0 : parseInt(tables);

    let configStoreData = {
      restaurantType,
      restaurantName,
      primaryColor,
      secondaryColor,
      tagline,
      subtagline,
      tables,
    };

    if (imageUrl !== null) {
      const logoURL = await uploadLogoImage(imageUrl, user.uid, imageUrl.name);
      setCurrentLogo(logoURL);
      configStoreData.logo = logoURL;
    }

    const configRef = doc(db, "configstore", user.uid);
    const docSnap = await getDoc(configRef);

    if (docSnap.exists()) {
      await updateDoc(configRef, configStoreData);
      message.success("Store updated successfully!");
    } else {
      await setDoc(configRef, configStoreData);
      message.success("Store created! Redirecting to menu...");
      setTimeout(() => navigate("/menu"), 2000);
    }
    setLoading(false);
  };

  const handleUpload = (e) => {
    setImageUrl(e.file);
  };

  const SectionCard = ({ icon, title, children }) => (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
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
      {children}
    </div>
  );

  const ColorPickerField = ({
    label,
    color,
    onChange,
    showPicker,
    setShowPicker,
    formName,
  }) => (
    <div style={{ flex: 1 }}>
      <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333" }}>
        {label} <span style={{ color: colors.reject }}>*</span>
      </div>
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowPicker(!showPicker)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            border: "1px solid #d9d9d9",
            borderRadius: "8px",
            cursor: "pointer",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: color,
              border: "2px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <span style={{ color: "#333", fontFamily: "monospace", fontSize: "14px" }}>
            {color}
          </span>
        </div>
        {showPicker && (
          <div
            style={{
              position: "absolute",
              zIndex: 100,
              top: "100%",
              left: 0,
              marginTop: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <SketchPicker color={color} onChange={onChange} />
            <button
              onClick={() => setShowPicker(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: colors.success,
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Done
            </button>
          </div>
        )}
        <Form.Item name={formName} style={{ display: "none" }}>
          <Input />
        </Form.Item>
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
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1000px" }}>
          {/* Header */}
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#333" }}>
                Store Settings
              </h1>
              <p style={{ margin: "4px 0 0", color: "#888" }}>
                Configure your restaurant details and branding
              </p>
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* Basic Information */}
            <SectionCard
              icon={<FiSettings size={20} color={colors.success} />}
              title="Basic Information"
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Form.Item
                  name="restaurantName"
                  label={<span style={{ fontWeight: "500" }}>Restaurant Name</span>}
                  rules={[{ required: true, message: "Please enter restaurant name" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    placeholder="Enter restaurant name"
                    size="large"
                    style={{ borderRadius: "8px" }}
                  />
                </Form.Item>

                <Form.Item
                  name="restaurantType"
                  label={<span style={{ fontWeight: "500" }}>Restaurant Type</span>}
                  rules={[{ required: true, message: "Please select type" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select placeholder="Select type" size="large" style={{ borderRadius: "8px" }}>
                    <Option value="cafe">Cafe</Option>
                    <Option value="restaurant">Restaurant</Option>
                    <Option value="dabha">Dabha</Option>
                    <Option value="thela">Thela</Option>
                  </Select>
                </Form.Item>
              </div>

              <div style={{ marginTop: "20px" }}>
                <Form.Item
                  name="tables"
                  label={<span style={{ fontWeight: "500" }}>Number of Tables</span>}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    placeholder="Enter number of tables"
                    size="large"
                    type="number"
                    style={{ borderRadius: "8px", maxWidth: "200px" }}
                  />
                </Form.Item>
              </div>
            </SectionCard>

            {/* Taglines */}
            <SectionCard
              icon={<FiType size={20} color={colors.success} />}
              title="Taglines"
            >
              <Form.Item
                name="tagline"
                label={<span style={{ fontWeight: "500" }}>Main Tagline</span>}
                rules={[{ required: true, message: "Please enter tagline" }]}
                style={{ marginBottom: "16px" }}
              >
                <Input
                  placeholder="e.g., Serve every bite: unforgettable Dining"
                  size="large"
                  style={{ borderRadius: "8px" }}
                />
              </Form.Item>

              <Form.Item
                name="subtagline"
                label={<span style={{ fontWeight: "500" }}>Sub Tagline</span>}
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder="Optional sub tagline"
                  size="large"
                  style={{ borderRadius: "8px" }}
                />
              </Form.Item>
            </SectionCard>

            {/* Branding Colors */}
            <SectionCard
              icon={<FiDroplet size={20} color={colors.success} />}
              title="Brand Colors"
            >
              <div style={{ display: "flex", gap: "24px" }}>
                <ColorPickerField
                  label="Primary Color"
                  color={primaryColor}
                  onChange={handlePrimaryColorChange}
                  showPicker={showPrimaryPicker}
                  setShowPicker={setShowPrimaryPicker}
                  formName="primarycolor"
                />
                <ColorPickerField
                  label="Secondary Color"
                  color={secondaryColor}
                  onChange={handleSecondaryColorChange}
                  showPicker={showSecondaryPicker}
                  setShowPicker={setShowSecondaryPicker}
                  formName="secondarycolor"
                />
              </div>
            </SectionCard>

            {/* Logo */}
            <SectionCard
              icon={<FiImage size={20} color={colors.success} />}
              title="Restaurant Logo"
            >
              <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ marginBottom: "12px", fontWeight: "500", color: "#333" }}>
                    Upload New Logo
                  </div>
                  <Form.Item
                    name="logo"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => (Array.isArray(e) ? e : e && e.fileList)}
                    style={{ marginBottom: 0 }}
                  >
                    <Upload
                      name="logo"
                      listType="picture"
                      onChange={handleUpload}
                      beforeUpload={() => false}
                      maxCount={1}
                    >
                      <Button
                        icon={<UploadOutlined />}
                        size="large"
                        style={{
                          borderRadius: "8px",
                          height: "48px",
                          paddingLeft: "24px",
                          paddingRight: "24px",
                        }}
                      >
                        Click to Upload
                      </Button>
                    </Upload>
                  </Form.Item>
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
                    Recommended: Square image, PNG or JPG
                  </p>
                </div>

                {currentLogo && (
                  <div>
                    <div style={{ marginBottom: "12px", fontWeight: "500", color: "#333" }}>
                      Current Logo
                    </div>
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "12px",
                        border: "2px solid #f0f0f0",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fafafa",
                      }}
                    >
                      <img
                        src={currentLogo}
                        alt="Current logo"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{
                  height: "52px",
                  paddingLeft: "40px",
                  paddingRight: "40px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "16px",
                  background: colors.success,
                  borderColor: colors.success,
                }}
              >
                {loading ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}

export default Dashboard;
