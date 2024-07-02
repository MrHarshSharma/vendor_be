import React, { useRef, useState , useEffect} from "react";

import { useDispatch, useSelector } from "react-redux";

import { db } from "../firebase/setup";
import AppLayout from "./AppLayout";
import useSound from "use-sound";
import { Form, Input, Button, Select, Upload, message, Tooltip, Modal } from "antd";
import { MdMarkEmailRead } from "react-icons/md";
import emailjs from 'emailjs-com';

import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useReactToPrint } from 'react-to-print';

import { ImPrinter } from "react-icons/im";

import newOrderSound from "../sound/noti.wav";
import Bill from "../components/Bill";
import { feedbackFormVariables, variables } from "../constants/variables";
const Orders = () => {
  const componentRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);
const storeDetails = useSelector(state=>state.storeReducer.store)
console.log(storeDetails)
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const [playNewOrderSound] = useSound(newOrderSound);
  const [grandTotal, setGrandTotal] = useState(0);
  const[toPrintOrder, setToPrintOrder] = useState(null)
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("storeId", "==", user.uid),
      orderBy("timeStamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = [];

      let isNewDataAdded = false;

      querySnapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          isNewDataAdded = true;
        }
      });

      querySnapshot.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setOrders(ordersList);

      const grandTotal_order = ordersList.reduce((total, order) => {
        const orderTotal = order.order.reduce((orderSum, item) => {
          return orderSum + parseFloat(item.price) * item.quantity;
        }, 0);
        return total + orderTotal;
      }, 0);
      setGrandTotal(grandTotal_order);

      if (isNewDataAdded) {
        if (document.hidden) {
          // Page is not visible, play sound
          playNewOrderSound();
        } else {
          // Page is visible, play sound
          playNewOrderSound();
        }
      }
    });

    return () => unsubscribe(); // Unsubscribe from snapshot listener on unmount
  }, [playNewOrderSound]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(); // Format to a readable string
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const sendEmail = (toName, toEmail, email_message, order) => {

    const orderItemsHtml = order.order.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.price}</td>
        <td>${item.quantity * item.price}</td>
      </tr>
    `).join('');

    const templateParams = {
      to_name: toName,
      to_email: toEmail,
      message: email_message,
      order_items: orderItemsHtml,
      order_total: `${order.order.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      )} Rs only`,
      store_name: storeDetails?.restaurantName,
      store_email: `${storeDetails?.restaurantName?.replace(/ /g, '_')}@gmail.com`,
      feedback_link:`${variables.deployedURL}/feedback/${user.uid}/${order.id}/${order.customer.uid}`
    };

    //  console.log(templateParams);
    //  return
  
    emailjs
      .send(feedbackFormVariables.serviceId, feedbackFormVariables.templateId ,templateParams, feedbackFormVariables.emailJsUserId)
      .then(
        (result) => {
          console.log('Email sent successfully:', result.text);
          message.success('Feedback email sent successfully')
        },
        (error) => {
          console.log('Failed to send email:', error.text);
        }
      );
  };


  return (
    <AppLayout>
      <div className="app-container" style={{padding:'20px 50px'}}>
      <Modal title="Basic Modal" open={isModalOpen} onOk={handlePrint} onCancel={handleCancel}>
      <Bill order={toPrintOrder} ref={componentRef} />
      
    </Modal>
        <Form>
        <span style={{marginBottom:'20px', display:'block', textAlign:'end', fontSize:'20px'}}>Grand sale of {grandTotal} Rs</span>
          {orders.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px", overflow:'auto', maxHeight:'85vh' }}
            >
              {orders.map((order, i) => (
                <div
                  key={`orderNumber_${i}`}
                  style={{
                    display: "flex",
                    gap: "20px",
                    boxShadow: "0px 1px 0px 0px #d9d9d9",
                    borderRadius: "5px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "20px",
                      width: "50%",
                    }}
                  >
                
                  <Tooltip title="Print bill"><span onClick={()=>{
                    setToPrintOrder(order)
                    showModal()
                  }} style={{cursor:'pointer'}}><ImPrinter /></span></Tooltip>

                  {console.log(order)}
                  <Tooltip title="Send feedback email"><span onClick={()=>{
                    setToPrintOrder(order)
                    sendEmail(order.customer.displayName,order.customer.email,`Please provide a feedback on your order_number ${order.id}`, order)
                  }} style={{cursor:'pointer'}}> <MdMarkEmailRead /></span></Tooltip>
                    <span>{order.id}</span>
                    <span>{order.customer?.displayName}</span>
                    <span>{new Date(order.timeStamp).toLocaleString()}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "50%",
                    }}
                  >
                    {order.order.map((thisorder, i) => (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {thisorder.quantity} X {thisorder.name}{" "}
                        </span>
                        <span>
                          {thisorder.quantity} * {thisorder.price} ={" "}
                          {thisorder.quantity * thisorder.price}{" "}
                        </span>
                      </div>
                    ))}
                    <span
                      style={{
                        marginLeft: "auto",
                        borderTop: `1px solid #d2d2d2`,
                      }}
                    >
                      {order.order.reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )}{" "}
                      Rs only
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No orders found</p>
          )}
        </Form>
        </div>
   
    </AppLayout>
  );
};

export default Orders;
