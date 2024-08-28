import React, { useState } from "react";
import { Form, Input, Button, Row, Col, Typography, message } from "antd";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import GoogleButton from "react-google-button";
import { useNavigate } from "react-router-dom";
import { provider, db, auth } from "../firebase/setup";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import moment from "moment";
import { checkIsUserPlanExpired } from "../constants/commonFunctions";

const { Title } = Typography;

const MobileNumberLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [OTPloading, setOTPLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState(null);
  const [isOtpSent, setOtpSent] = useState(false);
  const googleSignIn = async () => {
    try {
      const results = await signInWithPopup(auth, provider);
      console.log(results);
      localStorage.setItem("token", results.user.accessToken);
      localStorage.setItem("user", JSON.stringify(results.user));
      navigate("/");
    } catch (e) {
      console.error(e);
    }
  };
  const sendOtp = async (values) => {
    try {
      setLoading(true);
      setPhone(values.mobileNumber);
      const recaptcha = new RecaptchaVerifier(auth, "recapthca", {});
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${values.mobileNumber}`,
        recaptcha
      );
      setUser(confirmation);
      if (confirmation.verificationId) {
        setOtpSent(true);
      }
      setTimeout(() => {
        console.log("Received values:", values);
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const otpValidation = async (values) => {
    try {
      setOTPLoading(true);
      const data = await user.confirm(values.otp);
      console.log(data);
      setTimeout(() => {
        console.log("Received values:", values);
        setOTPLoading(false);
      }, 2000);
    } catch (error) {
      console.error(error);
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
        console.log(isExpired);
        if (isExpired) {
          message.error(`Plan expired for ${user.email}`);
          return;
        }
        message.success(`Login successful`);
      } else {
        message.error(`${user.email} is not authorized to login`);
        return;
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
      localStorage.setItem("token", result.user.accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      navigate("/");
      console.log("User signed in:", user);
      return user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      console.log("User signed in:", user);
    }
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
