import React, { useState, useEffect } from "react";
import { Form, Input, Button, Row, Col, Typography, message } from "antd";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import GoogleButton from "react-google-button";
import { useNavigate, useLocation } from "react-router-dom";
import { provider, db, auth } from "../firebase/setup";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { checkIsUserPlanExpired } from "../constants/commonFunctions";
import { useAuth } from "../context/AuthContext";

const { Title } = Typography;

const MobileNumberLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [OTPloading, setOTPLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isOtpSent, setOtpSent] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const sendOtp = async (values) => {
    try {
      setLoading(true);
      const recaptcha = new RecaptchaVerifier(auth, "recapthca", {});
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${values.mobileNumber}`,
        recaptcha
      );
      setConfirmationResult(confirmation);
      if (confirmation.verificationId) {
        setOtpSent(true);
      }
      setLoading(false);
    } catch (error) {
      console.error("OTP send error:", error);
      message.error("Failed to send OTP. Please try again.");
      setLoading(false);
    }
  };

  const otpValidation = async (values) => {
    try {
      setOTPLoading(true);
      await confirmationResult.confirm(values.otp);
      // Firebase Auth state will automatically update via AuthContext
      // Navigation will happen via the useEffect above
      message.success("OTP verified successfully!");
      setOTPLoading(false);
    } catch (error) {
      console.error("OTP validation error:", error);
      message.error("Invalid OTP. Please try again.");
      setOTPLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const querySnapshot = await getDocs(collection(db, "authUser"));
      const typesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const isUserAuthorised = typesData.filter(
        (thisuser) => thisuser.email === user.email
      );

      if (isUserAuthorised.length > 0) {
        const isExpired = checkIsUserPlanExpired(
          isUserAuthorised[0].expiryDate
        );
        if (isExpired) {
          message.error(`Plan expired for ${user.email}`);
          // Sign out the user if plan is expired
          await auth.signOut();
          return;
        }
      }

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
      };
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, userData);
      }

      // No need to store in localStorage - AuthContext handles auth state
      // Navigation will happen automatically via useEffect when isAuthenticated changes
      message.success(`Login successful for ${user.email}`);
      return user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      message.error("Failed to sign in. Please try again.");
    }
  };

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="container">
      <Row justify="center" align="middle" style={{ minHeight: "95vh" }}>
        <Col
          xs={20}
          sm={16}
          md={12}
          lg={8}
          xl={6}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {!isOtpSent && (
            <div style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
              <Form
                disabled
                name="login"
                initialValues={{ remember: true }}
                onFinish={sendOtp}
                layout="vertical"
              >
                <Title level={3} style={{ textAlign: "center" }}>
                  Mobile Number Login
                </Title>

                <Form.Item
                  name="mobileNumber"
                  label="Mobile Number"
                  rules={[
                    {
                      required: true,
                      message: "Please input your mobile number!",
                    },
                    {
                      pattern: /^[0-9]{10}$/,
                      message: "Please enter a valid 10-digit mobile number!",
                    },
                  ]}
                >
                  <Input placeholder="Enter your mobile number" />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                  >
                    Login
                  </Button>
                </Form.Item>

                <div>
                  <hr className="hori_rule" />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "20px",
                  }}
                >
                  <GoogleButton onClick={() => handleSignIn()} />
                </div>
              </Form>
              <div id="recapthca"></div>
            </div>
          )}
          {isOtpSent && (
            <Form
              name="otpValidation"
              initialValues={{ remember: true }}
              onFinish={otpValidation}
              layout="vertical"
            >
              <Form.Item name="otp" label="Enter OTP">
                <Input placeholder="Enter received OTP" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={OTPloading}
                >
                  Validate OTP
                </Button>
              </Form.Item>
            </Form>
          )}
          {/*</Col>
          <Col xs={20} sm={16} md={12} lg={8} xl={6}>*/}
        </Col>
      </Row>
    </div>
  );
};

export default MobileNumberLogin;
