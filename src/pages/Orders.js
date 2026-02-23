import React, { useRef, useState, useEffect, useCallback } from "react";

import { db } from "../firebase/setup";
import AppLayout from "./AppLayout";
import useSound from "use-sound";
import { message, Tooltip, Modal, Empty } from "antd";
import emailjs from "emailjs-com";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useReactToPrint } from "react-to-print";

import { ImPrinter } from "react-icons/im";
import {
  FiShoppingBag,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { MdRestaurantMenu } from "react-icons/md";

import newOrderSound from "../sound/noti.wav";
import Bill from "../components/Bill";
import {
  feedbackFormVariables,
  variables,
  acceptOrderVariables,
} from "../constants/variables";
import { colors } from "../constants/colors";
import { useAtom, useSetAtom } from "jotai";
import { pageLoading, store } from "../constants/stateVariables";

const Orders = () => {
  const isPageLoading = useSetAtom(pageLoading);
  const componentRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeDetails] = useAtom(store);
  const [activeFilter, setActiveFilter] = useState("all");

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const [playNewOrderSound] = useSound(newOrderSound);
  const [grandTotal, setGrandTotal] = useState(0);
  const [toPrintOrder, setToPrintOrder] = useState(null);
  const [recentlyUpdatedOrders, setRecentlyUpdatedOrders] = useState(new Set());
  const lastUpdatedTimestamps = useRef({});

  useEffect(() => {
    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("storeId", "==", user.uid),
        orderBy("timeStamp", "desc")
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ordersList = [];
        let shouldPlaySound = false;
        const newlyUpdatedOrderIds = new Set();

        querySnapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            // New order added
            shouldPlaySound = true;
          } else if (change.type === "modified") {
            // Order was modified - check if items were added
            const orderData = change.doc.data();
            const orderId = change.doc.id;
            const previousLastUpdated = lastUpdatedTimestamps.current[orderId];

            // If lastUpdated changed, items were added
            if (orderData.lastUpdated && orderData.lastUpdated !== previousLastUpdated) {
              shouldPlaySound = true;
              newlyUpdatedOrderIds.add(orderId);
              message.info({
                content: `New items added to order #${orderId.slice(-6).toUpperCase()}!`,
                duration: 5,
              });
            }

            // Update our tracking
            lastUpdatedTimestamps.current[orderId] = orderData.lastUpdated;
          }
        });

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          ordersList.push({
            id: doc.id,
            ...data,
          });
          // Track lastUpdated timestamps
          if (data.lastUpdated) {
            lastUpdatedTimestamps.current[doc.id] = data.lastUpdated;
          }
        });

        setOrders(ordersList);
        isPageLoading(false);

        // Mark orders as recently updated (for visual highlight)
        // Owner must manually acknowledge by clicking "Accept New Items"
        if (newlyUpdatedOrderIds.size > 0) {
          setRecentlyUpdatedOrders(prev => new Set([...prev, ...newlyUpdatedOrderIds]));
        }

        const grandTotal_order = ordersList.reduce((total, order) => {
          const orderTotal = order.order.reduce((orderSum, item) => {
            return orderSum + parseFloat(item.price) * item.quantity;
          }, 0);
          return total + orderTotal;
        }, 0);
        setGrandTotal(grandTotal_order);

        if (shouldPlaySound) {
          playNewOrderSound();
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playNewOrderSound]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const sendEmail = (type, toName, toEmail, email_message, order, emailTemplate) => {
    const orderItemsHtml = order.order
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.price}</td>
        <td>${item.quantity * item.price}</td>
      </tr>
    `
      )
      .join("");

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
      store_email: `${storeDetails?.restaurantName?.replace(/ /g, "_")}@gmail.com`,
      feedback_link: `${variables.deployedURL}/feedback/${user.uid}/${order.id}/${order.customer.uid}`,
    };

    emailjs
      .send(
        emailTemplate.serviceId,
        emailTemplate.templateId,
        templateParams,
        emailTemplate.emailJsUserId
      )
      .then(
        (result) => {
          console.log("Email sent successfully:", result.text);
          message.success(`${type} email sent successfully`);
        },
        (error) => {
          console.log("Failed to send email:", error.text);
        }
      );
  };

  const acceptOrder = async (order) => {
    sendEmail(
      "accept order",
      order.customer.displayName,
      order.customer.email,
      `Your order will be served in some time`,
      order,
      acceptOrderVariables
    );

    try {
      const orderRef = doc(db, "orders", order.id);
      const orderSnapshot = await getDoc(orderRef);

      if (orderSnapshot.exists()) {
        await updateDoc(orderRef, { orderStatus: "accept" });
        message.success("Order accepted");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      message.error("Failed to accept order");
    }
  };

  const rejectOrder = async (order) => {
    try {
      const orderRef = doc(db, "orders", order.id);
      const orderSnapshot = await getDoc(orderRef);

      if (orderSnapshot.exists()) {
        await updateDoc(orderRef, { orderStatus: "cancle" });
        message.info("Order cancelled");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      message.error("Failed to cancel order");
    }
  };

  const completeOrder = async (order) => {
    sendEmail(
      "feedback",
      order.customer.displayName,
      order.customer.email,
      `Please provide feedback on your order`,
      order,
      feedbackFormVariables
    );

    try {
      const orderRef = doc(db, "orders", order.id);
      const orderSnapshot = await getDoc(orderRef);

      if (orderSnapshot.exists()) {
        await updateDoc(orderRef, { orderStatus: "complete" });
        message.success("Order completed");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      message.error("Failed to complete order");
    }
  };

  const acknowledgeNewItems = async (order) => {
    try {
      // Remove from recently updated set
      setRecentlyUpdatedOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });

      // Clear the addedAt field from all items and clear lastUpdated
      const updatedItems = order.order.map(item => {
        const { addedAt, ...itemWithoutAddedAt } = item;
        return itemWithoutAddedAt;
      });

      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        lastUpdated: null,
        order: updatedItems,
      });

      message.success("New items acknowledged");
    } catch (error) {
      console.error("Error acknowledging new items: ", error);
      message.error("Failed to acknowledge new items");
    }
  };

  // Stats calculations
  const newOrders = orders.filter((o) => o.orderStatus === "new").length;
  const inProgressOrders = orders.filter((o) => o.orderStatus === "accept").length;
  const completedOrders = orders.filter((o) => o.orderStatus === "complete").length;
  const cancelledOrders = orders.filter((o) => o.orderStatus === "cancle").length;

  // Filter orders based on active filter
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "new") return order.orderStatus === "new";
    if (activeFilter === "accept") return order.orderStatus === "accept";
    if (activeFilter === "complete") return order.orderStatus === "complete";
    if (activeFilter === "cancle") return order.orderStatus === "cancle";
    return true;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case "new":
        return {
          label: "New Order",
          color: colors.orange,
          bgColor: `${colors.orange}15`,
          icon: <FiClock size={16} />,
        };
      case "accept":
        return {
          label: "In Progress",
          color: "#2196F3",
          bgColor: "#2196F315",
          icon: <MdRestaurantMenu size={16} />,
        };
      case "complete":
        return {
          label: "Completed",
          color: colors.success,
          bgColor: `${colors.success}15`,
          icon: <FiCheckCircle size={16} />,
        };
      case "cancle":
        return {
          label: "Cancelled",
          color: colors.reject,
          bgColor: `${colors.reject}15`,
          icon: <FiXCircle size={16} />,
        };
      default:
        return {
          label: "Unknown",
          color: "#888",
          bgColor: "#88888815",
          icon: <FiShoppingBag size={16} />,
        };
    }
  };

  const StatCard = ({ icon, label, value, color, onClick, isActive }) => (
    <div
      onClick={onClick}
      style={{
        background: isActive ? `${color}15` : "white",
        borderRadius: "12px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default",
        border: isActive ? `2px solid ${color}` : "2px solid transparent",
        transition: "all 0.2s ease",
        flex: 1,
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#333" }}>
          {value}
        </div>
      </div>
    </div>
  );

  const OrderCard = ({ order, isRecentlyUpdated, onAcknowledgeNewItems }) => {
    const statusConfig = getStatusConfig(order.orderStatus);
    const orderTotal = order.order.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const orderDate = new Date(order.timeStamp);
    const lastUpdatedDate = order.lastUpdated ? new Date(order.lastUpdated) : null;

    return (
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: isRecentlyUpdated
            ? "0 0 25px rgba(33, 150, 243, 0.5), 0 0 50px rgba(33, 150, 243, 0.2)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          border: isRecentlyUpdated
            ? "3px solid #2196F3"
            : `1px solid ${statusConfig.color}30`,
          position: "relative",
          transition: "box-shadow 0.3s ease, border 0.3s ease",
        }}
      >
        {/* NEW ITEMS ADDED Banner */}
        {isRecentlyUpdated && (
          <div
            style={{
              background: "linear-gradient(90deg, #2196F3, #1976D2)",
              color: "white",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "700",
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              <span style={{ fontSize: "18px" }}>🔔</span>
              NEW ITEMS ADDED TO THIS ORDER!
            </div>
            <button
              onClick={() => onAcknowledgeNewItems(order)}
              style={{
                background: "white",
                color: "#1976D2",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <FiCheckCircle size={16} />
              Accept New Items
            </button>
          </div>
        )}

        {/* Card Header */}
        <div
          style={{
            background: statusConfig.bgColor,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${statusConfig.color}30`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: statusConfig.color,
                fontWeight: "600",
              }}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "#888",
                background: "white",
                padding: "4px 10px",
                borderRadius: "20px",
              }}
            >
              #{order.id.slice(-6).toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#666" }}>
              {orderDate.toLocaleDateString()}
            </span>
            <span style={{ fontSize: "13px", color: "#999" }}>
              {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {lastUpdatedDate && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#2196F3",
                  background: "#2196F315",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontWeight: "500",
                }}
              >
                + Items added {lastUpdatedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "40px" }}>
            {/* Customer Info */}
            <div style={{ minWidth: "200px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <FiUser size={16} color="#888" />
                <span style={{ fontWeight: "600", color: "#333" }}>
                  {order.customer?.displayName || "Guest"}
                </span>
              </div>
              {order.table && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#666",
                  }}
                >
                  <FiMapPin size={16} color="#888" />
                  <span>{order.table}</span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  color: "#888",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Order Items
              </div>
              <div
                style={{
                  background: "#f8f9fa",
                  borderRadius: "10px",
                  padding: "12px 16px",
                }}
              >
                {order.order.map((item, idx) => {
                  const isNewItem = item.addedAt && item.addedAt === order.lastUpdated;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        marginBottom: idx < order.order.length - 1 ? "6px" : "0",
                        borderRadius: "8px",
                        background: isNewItem ? "#E3F2FD" : "transparent",
                        border: isNewItem ? "1px solid #2196F3" : "1px solid transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isNewItem && (
                          <span
                            style={{
                              background: "#2196F3",
                              color: "white",
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                            }}
                          >
                            NEW
                          </span>
                        )}
                        <span style={{ color: "#333" }}>
                          <span
                            style={{
                              fontWeight: "600",
                              color: isNewItem ? "#2196F3" : colors.success,
                              marginRight: "8px",
                            }}
                          >
                            {item.quantity}×
                          </span>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: "500", color: isNewItem ? "#2196F3" : "#555" }}>
                        ₹{item.quantity * item.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total & Actions */}
            <div
              style={{
                minWidth: "160px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                  Total Amount
                </div>
                <div
                  style={{ fontSize: "28px", fontWeight: "700", color: colors.success }}
                >
                  ₹{orderTotal}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                {order.orderStatus === "new" && (
                  <>
                    <button
                      onClick={() => acceptOrder(order)}
                      style={{
                        padding: "10px 20px",
                        background: colors.success,
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FiCheckCircle size={16} />
                      Accept
                    </button>
                    <button
                      onClick={() => rejectOrder(order)}
                      style={{
                        padding: "10px 20px",
                        background: colors.reject,
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FiXCircle size={16} />
                      Reject
                    </button>
                  </>
                )}

                {order.orderStatus === "accept" && (
                  <button
                    onClick={() => completeOrder(order)}
                    style={{
                      padding: "10px 20px",
                      background: colors.success,
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FiCheckCircle size={16} />
                    Mark Complete
                  </button>
                )}

                {order.orderStatus === "complete" && (
                  <Tooltip title="Print Bill">
                    <button
                      onClick={() => {
                        setToPrintOrder(order);
                        showModal();
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "#f0f0f0",
                        color: "#333",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <ImPrinter size={16} />
                      Print Bill
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div
        style={{
          height: "calc(100vh - 64px)",
          background: "#f5f7fa",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Modal
          title="Bill Preview"
          open={isModalOpen}
          onOk={handlePrint}
          onCancel={handleCancel}
          width={"50%"}
          okText="Print"
        >
          <Bill order={toPrintOrder} ref={componentRef} />
        </Modal>

        {/* Header Stats */}
        <div style={{ padding: "16px 24px", background: "white", borderBottom: "1px solid #e8e8e8" }}>
          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            <StatCard
              icon={<FiShoppingBag size={22} color="#6366F1" />}
              label="All Orders"
              value={orders.length}
              color="#6366F1"
              onClick={() => setActiveFilter("all")}
              isActive={activeFilter === "all"}
            />
            <StatCard
              icon={<FiClock size={22} color={colors.orange} />}
              label="New"
              value={newOrders}
              color={colors.orange}
              onClick={() => setActiveFilter("new")}
              isActive={activeFilter === "new"}
            />
            <StatCard
              icon={<MdRestaurantMenu size={22} color="#2196F3" />}
              label="In Progress"
              value={inProgressOrders}
              color="#2196F3"
              onClick={() => setActiveFilter("accept")}
              isActive={activeFilter === "accept"}
            />
            <StatCard
              icon={<FiCheckCircle size={22} color={colors.success} />}
              label="Completed"
              value={completedOrders}
              color={colors.success}
              onClick={() => setActiveFilter("complete")}
              isActive={activeFilter === "complete"}
            />
            <StatCard
              icon={<FiXCircle size={22} color={colors.reject} />}
              label="Cancelled"
              value={cancelledOrders}
              color={colors.reject}
              onClick={() => setActiveFilter("cancle")}
              isActive={activeFilter === "cancle"}
            />
            <StatCard
              icon={<FiDollarSign size={22} color={colors.success} />}
              label="Revenue"
              value={`₹${grandTotal}`}
              color={colors.success}
            />
          </div>
        </div>

        {/* Orders List */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "20px 24px",
          }}
        >
          {filteredOrders.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isRecentlyUpdated={recentlyUpdatedOrders.has(order.id)}
                  onAcknowledgeNewItems={acknowledgeNewItems}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Empty
                description={
                  activeFilter === "all"
                    ? "No orders yet"
                    : `No ${getStatusConfig(activeFilter).label.toLowerCase()} orders`
                }
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
