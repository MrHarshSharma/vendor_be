import React, { useRef, useState, useEffect } from "react";

import { db } from "../firebase/setup";
import AppLayout from "./AppLayout";
import useSound from "use-sound";
import { message, Tooltip, Modal, Empty, Spin } from "antd";
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
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
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
  FiChevronLeft,
  FiChevronRight,
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
import { useAuth } from "../context/AuthContext";

const ORDERS_PER_PAGE = 10;

const Orders = () => {
  const isPageLoading = useSetAtom(pageLoading);
  const componentRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeDetails] = useAtom(store);
  const [activeFilter, setActiveFilter] = useState("all");
  const { userData: user } = useAuth();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const [orders, setOrders] = useState([]);
  const [playNewOrderSound] = useSound(newOrderSound);
  const [grandTotal, setGrandTotal] = useState(0);
  const [toPrintOrder, setToPrintOrder] = useState(null);
  const [recentlyUpdatedOrders, setRecentlyUpdatedOrders] = useState(new Set());
  const lastUpdatedTimestamps = useRef({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [cursors, setCursors] = useState({});
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const unsubscribeRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Fetch total orders count based on active filter
  const fetchTotalCount = async (filter) => {
    try {
      const ordersRef = collection(db, "orders");
      let countQuery;

      if (filter === "all") {
        countQuery = query(
          ordersRef,
          where("storeId", "==", user.uid)
        );
      } else {
        countQuery = query(
          ordersRef,
          where("storeId", "==", user.uid),
          where("orderStatus", "==", filter)
        );
      }

      const snapshot = await getCountFromServer(countQuery);
      setTotalOrders(snapshot.data().count);
    } catch (error) {
      console.error("Error fetching total count:", error);
    }
  };

  // Fetch orders for a specific page with filter
  const fetchOrdersForPage = async (page, filter) => {
    if (!user?.uid) return;

    setIsLoadingPage(true);

    // Unsubscribe from previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    try {
      const ordersRef = collection(db, "orders");
      let q;

      // Build base query constraints
      const baseConstraints = filter === "all"
        ? [where("storeId", "==", user.uid)]
        : [where("storeId", "==", user.uid), where("orderStatus", "==", filter)];

      if (page === 1) {
        // First page - no cursor needed
        q = query(
          ordersRef,
          ...baseConstraints,
          orderBy("timeStamp", "desc"),
          limit(ORDERS_PER_PAGE)
        );
      } else {
        // Check if we have a cursor for this page
        const cursor = cursors[page];
        if (cursor) {
          q = query(
            ordersRef,
            ...baseConstraints,
            orderBy("timeStamp", "desc"),
            startAfter(cursor),
            limit(ORDERS_PER_PAGE)
          );
        } else {
          // Need to fetch cursor for previous page first
          const prevPageCursor = cursors[page - 1];
          if (prevPageCursor) {
            q = query(
              ordersRef,
              ...baseConstraints,
              orderBy("timeStamp", "desc"),
              startAfter(prevPageCursor),
              limit(ORDERS_PER_PAGE)
            );
          } else {
            // Fallback: fetch from beginning and skip to the right page
            const skipQuery = query(
              ordersRef,
              ...baseConstraints,
              orderBy("timeStamp", "desc"),
              limit((page - 1) * ORDERS_PER_PAGE)
            );
            const skipSnapshot = await getDocs(skipQuery);
            const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];

            if (lastDoc) {
              q = query(
                ordersRef,
                ...baseConstraints,
                orderBy("timeStamp", "desc"),
                startAfter(lastDoc),
                limit(ORDERS_PER_PAGE)
              );
              // Store the cursor
              setCursors(prev => ({ ...prev, [page]: lastDoc }));
            } else {
              setIsLoadingPage(false);
              return;
            }
          }
        }
      }

      // Set up real-time listener for current page
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const ordersList = [];
          let shouldPlaySound = false;
          const newlyUpdatedOrderIds = new Set();

          let hasNewOrders = false;
          querySnapshot.docChanges().forEach((change) => {
            if (change.type === "added" && !isInitialLoad.current) {
              // New order added (only play sound if not initial/page load)
              shouldPlaySound = true;
              hasNewOrders = true;
            } else if (change.type === "modified") {
              const orderData = change.doc.data();
              const orderId = change.doc.id;
              const previousLastUpdated = lastUpdatedTimestamps.current[orderId];

              if (orderData.lastUpdated && orderData.lastUpdated !== previousLastUpdated) {
                shouldPlaySound = true;
                newlyUpdatedOrderIds.add(orderId);
                message.info({
                  content: `New items added to order #${orderId.slice(-6).toUpperCase()}!`,
                  duration: 5,
                });
              }
              lastUpdatedTimestamps.current[orderId] = orderData.lastUpdated;
            }
          });

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            ordersList.push({
              id: doc.id,
              ...data,
            });
            if (data.lastUpdated) {
              lastUpdatedTimestamps.current[doc.id] = data.lastUpdated;
            }
          });

          // Store cursor for next page (last document of current page)
          if (querySnapshot.docs.length > 0) {
            const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            setCursors(prev => ({ ...prev, [page + 1]: lastDoc }));
          }

          setOrders(ordersList);
          setIsLoadingPage(false);
          setOrdersLoaded(true);
          isInitialLoad.current = false;

          if (newlyUpdatedOrderIds.size > 0) {
            setRecentlyUpdatedOrders(prev => new Set([...prev, ...newlyUpdatedOrderIds]));
            checkInProgressWithNewItems(); // Check for blinking indicator
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

          // Refresh stats if new orders were added
          if (hasNewOrders) {
            fetchStatsCounts();
          }
        },
        (error) => {
          console.error("Error in orders listener:", error);
          setIsLoadingPage(false);
          setOrdersLoaded(true);
          // Check if it's an index error
          if (error.message?.includes("index")) {
            message.error("Database index required. Check console for the index creation link.");
          } else {
            message.error("Failed to load orders");
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error("Error fetching orders:", error);
      setIsLoadingPage(false);
    }
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setCursors({});
    isInitialLoad.current = true; // Reset so filter switch doesn't trigger sound
  }, [activeFilter]);

  // Initial load and page/filter changes
  useEffect(() => {
    if (user?.uid) {
      fetchTotalCount(activeFilter);
      fetchOrdersForPage(currentPage, activeFilter);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, currentPage, activeFilter]);

  // Refresh total count periodically (for new orders)
  useEffect(() => {
    if (!user?.uid) return;

    const interval = setInterval(() => {
      fetchTotalCount(activeFilter);
    }, 30000); // Refresh count every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, activeFilter]);

  // Calculate total pages
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
        fetchStatsCounts(); // Refresh stats
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
        fetchStatsCounts(); // Refresh stats
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
        fetchStatsCounts(); // Refresh stats
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
      checkInProgressWithNewItems(); // Refresh notification state
    } catch (error) {
      console.error("Error acknowledging new items: ", error);
      message.error("Failed to acknowledge new items");
    }
  };

  // Stats counts (fetched from server)
  const [statsCounts, setStatsCounts] = useState({
    all: 0,
    new: 0,
    accept: 0,
    complete: 0,
    cancle: 0,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [hasInProgressWithNewItems, setHasInProgressWithNewItems] = useState(false);

  // Check if there are any in-progress orders with new items
  const checkInProgressWithNewItems = async () => {
    if (!user?.uid) return;

    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("storeId", "==", user.uid),
        where("orderStatus", "==", "accept"),
        where("lastUpdated", "!=", null),
        limit(1)
      );
      const snapshot = await getDocs(q);
      setHasInProgressWithNewItems(!snapshot.empty);
    } catch (error) {
      console.error("Error checking in-progress orders:", error);
    }
  };

  // Fetch all stats counts
  const fetchStatsCounts = async () => {
    if (!user?.uid) return;

    try {
      const ordersRef = collection(db, "orders");
      const statuses = ["new", "accept", "complete", "cancle"];

      // Fetch all counts in parallel
      const [allCount, ...statusCounts] = await Promise.all([
        getCountFromServer(query(ordersRef, where("storeId", "==", user.uid))),
        ...statuses.map((status) =>
          getCountFromServer(
            query(ordersRef, where("storeId", "==", user.uid), where("orderStatus", "==", status))
          )
        ),
      ]);

      setStatsCounts({
        all: allCount.data().count,
        new: statusCounts[0].data().count,
        accept: statusCounts[1].data().count,
        complete: statusCounts[2].data().count,
        cancle: statusCounts[3].data().count,
      });
      setStatsLoaded(true);
    } catch (error) {
      console.error("Error fetching stats counts:", error);
      setStatsLoaded(true); // Still mark as loaded to not block UI
    }
  };

  // Fetch stats counts on mount and periodically
  useEffect(() => {
    if (user?.uid) {
      fetchStatsCounts();
      checkInProgressWithNewItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const interval = setInterval(() => {
      fetchStatsCounts();
      checkInProgressWithNewItems();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Hide page loader only when both orders and stats are loaded
  useEffect(() => {
    if (ordersLoaded && statsLoaded) {
      isPageLoading(false);
    }
  }, [ordersLoaded, statsLoaded, isPageLoading]);

  // Orders are now filtered at database level, so use orders directly
  const filteredOrders = orders;

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

  const StatCard = ({ icon, label, value, color, onClick, isActive, hasNotification }) => (
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
        position: "relative",
      }}
    >
      {hasNotification && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#f44336",
            animation: "blink 1s infinite",
          }}
        />
      )}
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
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
                {[...order.order]
                  .sort((a, b) => {
                    // Sort new items (with addedAt) to the top
                    const aIsNew = a.addedAt && a.addedAt === order.lastUpdated;
                    const bIsNew = b.addedAt && b.addedAt === order.lastUpdated;
                    if (aIsNew && !bIsNew) return -1;
                    if (!aIsNew && bIsNew) return 1;
                    return 0;
                  })
                  .map((item, idx) => {
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
                        {storeDetails?.currencySymbol || "₹"}{item.quantity * item.price}
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
                  {storeDetails?.currencySymbol || "₹"}{orderTotal}
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
              value={statsCounts.all}
              color="#6366F1"
              onClick={() => setActiveFilter("all")}
              isActive={activeFilter === "all"}
            />
            <StatCard
              icon={<FiClock size={22} color={colors.orange} />}
              label="New"
              value={statsCounts.new}
              color={colors.orange}
              onClick={() => setActiveFilter("new")}
              isActive={activeFilter === "new"}
            />
            <StatCard
              icon={<MdRestaurantMenu size={22} color="#2196F3" />}
              label="In Progress"
              value={statsCounts.accept}
              color="#2196F3"
              onClick={() => setActiveFilter("accept")}
              isActive={activeFilter === "accept"}
              hasNotification={hasInProgressWithNewItems}
            />
            <StatCard
              icon={<FiCheckCircle size={22} color={colors.success} />}
              label="Completed"
              value={statsCounts.complete}
              color={colors.success}
              onClick={() => setActiveFilter("complete")}
              isActive={activeFilter === "complete"}
            />
            <StatCard
              icon={<FiXCircle size={22} color={colors.reject} />}
              label="Cancelled"
              value={statsCounts.cancle}
              color={colors.reject}
              onClick={() => setActiveFilter("cancle")}
              isActive={activeFilter === "cancle"}
            />
            <StatCard
              icon={<FiDollarSign size={22} color={colors.success} />}
              label="Revenue"
              value={`${storeDetails?.currencySymbol || "₹"}${grandTotal}`}
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
          {isLoadingPage ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
              }}
            >
              <Spin size="large" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isRecentlyUpdated={recentlyUpdatedOrders.has(order.id) || !!order.lastUpdated}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "24px",
                paddingBottom: "20px",
              }}
            >
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1 || isLoadingPage}
                style={{
                  padding: "8px 12px",
                  background: currentPage === 1 ? "#f0f0f0" : "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: currentPage === 1 ? "#999" : "#333",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                }}
              >
                <FiChevronLeft size={18} />
                Previous
              </button>

              <div style={{ display: "flex", gap: "4px" }}>
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => handlePageClick(1)}
                      style={{
                        width: "36px",
                        height: "36px",
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        color: "#333",
                      }}
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span style={{ padding: "0 4px", color: "#999", alignSelf: "center" }}>...</span>
                    )}
                  </>
                )}

                {/* Page numbers around current */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null;
                  if (currentPage > 3 && pageNum === 1) return null;
                  if (currentPage < totalPages - 2 && pageNum === totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageClick(pageNum)}
                      disabled={isLoadingPage}
                      style={{
                        width: "36px",
                        height: "36px",
                        background: pageNum === currentPage ? colors.orange : "white",
                        border: pageNum === currentPage ? "none" : "1px solid #e0e0e0",
                        borderRadius: "8px",
                        cursor: pageNum === currentPage ? "default" : "pointer",
                        fontWeight: "600",
                        color: pageNum === currentPage ? "white" : "#333",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Last page */}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span style={{ padding: "0 4px", color: "#999", alignSelf: "center" }}>...</span>
                    )}
                    <button
                      onClick={() => handlePageClick(totalPages)}
                      style={{
                        width: "36px",
                        height: "36px",
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        color: "#333",
                      }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || isLoadingPage}
                style={{
                  padding: "8px 12px",
                  background: currentPage === totalPages ? "#f0f0f0" : "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: currentPage === totalPages ? "#999" : "#333",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                }}
              >
                Next
                <FiChevronRight size={18} />
              </button>

              <span
                style={{
                  marginLeft: "16px",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Page {currentPage} of {totalPages} ({totalOrders} orders)
              </span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
