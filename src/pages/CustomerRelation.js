import React, { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/setup";
import { Table, Empty } from "antd";
import { RiMedalFill } from "react-icons/ri";
import { FiUsers, FiShoppingBag, FiDollarSign, FiStar, FiTrendingUp } from "react-icons/fi";

import { useSetAtom } from "jotai";
import { pageLoading } from "../constants/stateVariables";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

const CustomerRelation = () => {
  const isPageLoading = useSetAtom(pageLoading);
  const { userData: user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(undefined);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [favoriteItem, setFavoriteItem] = useState(null);
  const [allFoodItemHePurchased, setAllFoodItemHePurchased] = useState({});
  const [tableHeights, setTableHeights] = useState(0);
  const [customerFavItems, setCustomerFavItems] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const q = query(
          collection(db, "customer"),
          where("storeUser", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Remove duplicate customers based on email
        const uniqueCustomers = docs.reduce((acc, customer) => {
          const existingCustomer = acc.find(c => c.email === customer.email);
          if (!existingCustomer) {
            acc.push(customer);
          }
          return acc;
        }, []);

        setCustomers(uniqueCustomers);
        console.log("customers", uniqueCustomers);
      } catch (error) {
        console.error("Error fetching documents: ", error);
      } finally {
        isPageLoading(false);
      }
    };

    fetchCustomers();
    setTableHeights(window.innerHeight - 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCustomer !== undefined) {
      isPageLoading(true);
      fetchCustomerData(selectedCustomer.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const fetchCustomerData = async (email) => {
    try {
      if (user) {
        const orderQuery = query(
          collection(db, "orders"),
          where("storeId", "==", user.uid),
          where("customer.email", "==", email)
        );
        const orderSnapshot = await getDocs(orderQuery);
        const orderDocs = orderSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          orderFeedback: "",
        }));

        const feedbackPromises = orderDocs.map(async (orderDoc) => {
          const feedbackQuery = query(
            collection(db, "feedbacks"),
            where("storeId", "==", user.uid),
            where("orderId", "==", orderDoc.id),
            where("customerId", "==", orderDoc.customer.uid)
          );
          const feedbackSnapshot = await getDocs(feedbackQuery);
          const feedbackData = feedbackSnapshot.docs.map((doc) => doc.data());

          return {
            ...orderDoc,
            orderFeedback: feedbackData.length > 0 ? feedbackData[0] : "",
          };
        });

        const ordersWithFeedback = await Promise.all(feedbackPromises);
        setCustomerOrders(ordersWithFeedback.reverse());
        const favItems = findCustomerFavItems(ordersWithFeedback);
        setCustomerFavItems(favItems);

        if (ordersWithFeedback.length > 0) {
          const foodPurchased = {};

          ordersWithFeedback.forEach((order) => {
            order.order.forEach((item) => {
              if (foodPurchased[item.name]) {
                foodPurchased[item.name] += 1;
              } else {
                foodPurchased[item.name] = 1;
              }
            });
          });
          setAllFoodItemHePurchased(foodPurchased);

          const favorite = Object.keys(foodPurchased).reduce((a, b) =>
            foodPurchased[a] > foodPurchased[b] ? a : b
          );
          setFavoriteItem(favorite);
        }
      }
    } catch (error) {
      console.error("Error fetching documents: ", error);
    } finally {
      isPageLoading(false);
    }
  };

  const findCustomerFavItems = (orders) => {
    const itemRatings = {};

    orders.forEach((order) => {
      order?.orderFeedback?.feedback?.forEach((feedback) => {
        const { itemName, rating } = feedback;
        if (itemRatings[itemName]) {
          itemRatings[itemName] += rating;
        } else {
          itemRatings[itemName] = rating;
        }
      });
    });

    const sortedItems = Object.entries(itemRatings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((item) => ({ itemName: item[0], totalRating: item[1] }));

    return sortedItems;
  };

  const calculateGrandTotal = (orders) => {
    return orders.reduce((total, order) => {
      const orderTotal = order.order.reduce((orderSum, item) => {
        return orderSum + item.price * item.quantity;
      }, 0);
      return total + orderTotal;
    }, 0);
  };

  const selectThisCustomer = (thisCustomer) => {
    setSelectedCustomer(thisCustomer);
  };

  const paintStars = (number) => {
    let stars = "";
    for (let i = 0; i < number; i++) stars += "⭐";
    return stars;
  };

  const columns = [
    {
      title: "Date / Time",
      dataIndex: "timeStamp",
      key: "timeStamp",
      render: (timeStamp) => {
        let date = new Date(timeStamp);
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "600", color: "#333" }}>
              {date.toLocaleDateString()}
            </span>
            <span style={{ fontSize: "12px", color: "#888" }}>
              {date.toLocaleTimeString()}
            </span>
          </div>
        );
      },
      width: "15%",
    },
    {
      title: "Items",
      dataIndex: "order",
      key: "order",
      render: (order) => {
        return order.map((orderItem, j) => (
          <div
            key={j}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: j < order.length - 1 ? "1px dashed #eee" : "none",
            }}
          >
            <span style={{ color: "#333" }}>
              {orderItem.quantity} × {orderItem.name}
            </span>
            <span style={{ color: colors.success, fontWeight: "500" }}>
              ₹{orderItem.quantity * orderItem.price}
            </span>
          </div>
        ));
      },
      width: "30%",
    },
    {
      title: "Total",
      dataIndex: "order",
      key: "totalPrice",
      render: (order) => {
        const total = order.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
        return (
          <span
            style={{
              fontWeight: "700",
              color: colors.success,
              fontSize: "16px",
            }}
          >
            ₹{total}
          </span>
        );
      },
      width: "10%",
    },
    {
      title: "Feedback",
      dataIndex: "orderFeedback",
      key: "feedback",
      render: (orderFeedback) => {
        if (!orderFeedback?.feedback?.length) {
          return <span style={{ color: "#999", fontStyle: "italic" }}>No feedback</span>;
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {orderFeedback?.feedback?.map((feedbackItem, j) => (
              <div
                key={j}
                style={{
                  background: "#f8f9fa",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  borderLeft: `3px solid ${colors.success}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#333" }}>
                    {feedbackItem?.itemName}
                  </span>
                  <span style={{ fontSize: "12px" }}>
                    {paintStars(feedbackItem.rating)}
                  </span>
                </div>
                {feedbackItem.comment && (
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    "{feedbackItem.comment}"
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      },
      width: "45%",
    },
  ];

  const renderFrequentItems = () => {
    const foodArray = Object.entries(allFoodItemHePurchased);
    foodArray.sort((a, b) => b[1] - a[1]);

    return (
      <div style={{ marginTop: "12px" }}>
        {foodArray.slice(0, 5).map(([foodItem, count], i) => (
          <div
            key={foodItem}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: i < Math.min(foodArray.length, 5) - 1 ? "1px solid #f0f0f0" : "none",
            }}
          >
            <span style={{ color: "#555" }}>{foodItem}</span>
            <span
              style={{
                background: colors.success,
                color: "white",
                padding: "2px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {count}×
            </span>
          </div>
        ))}
      </div>
    );
  };

  const StatCard = ({ icon, label, value, color }) => (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        flex: 1,
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#333" }}>
          {value}
        </div>
      </div>
    </div>
  );

  const PodiumItem = ({ rank, name, color, bgColor }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: bgColor,
        padding: "12px 16px",
        borderRadius: "10px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "800",
          fontSize: "14px",
          color: color,
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      <RiMedalFill size={20} color={color} style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: "500", color: "#333", fontSize: "14px" }}>
        {name}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 64px)",
          background: "#f5f7fa",
          overflow: "hidden",
        }}
      >
        {/* Customer List Sidebar */}
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            background: "white",
            borderRight: "1px solid #e8e8e8",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FiUsers size={24} color={colors.success} />
            <span style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
              My Customers
            </span>
            <span
              style={{
                marginLeft: "auto",
                background: colors.success,
                color: "white",
                padding: "2px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {customers.length}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "12px",
            }}
          >
            {customers.length === 0 ? (
              <Empty description="No customers yet" />
            ) : (
              customers.map((customer, i) => (
                <div
                  key={customer.id || i}
                  onClick={() => selectThisCustomer(customer)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    marginBottom: "8px",
                    transition: "all 0.2s ease",
                    background:
                      selectedCustomer?.id === customer?.id
                        ? `${colors.success}15`
                        : "transparent",
                    border:
                      selectedCustomer?.id === customer?.id
                        ? `2px solid ${colors.success}`
                        : "2px solid transparent",
                  }}
                >
                  <img
                    src={customer.photoURL || "https://via.placeholder.com/40"}
                    alt={customer.displayName}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #f0f0f0",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#333",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {customer.displayName}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {customer.email}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {selectedCustomer ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: "20px",
              gap: "20px",
            }}
          >
            {/* Customer Header */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src={selectedCustomer.photoURL || "https://via.placeholder.com/80"}
                alt={selectedCustomer.displayName}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${colors.success}`,
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, color: "#333", fontSize: "24px" }}>
                  {selectedCustomer.displayName}
                </h2>
                <p style={{ margin: "4px 0 0", color: "#888" }}>
                  {selectedCustomer.email}
                </p>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <StatCard
                  icon={<FiShoppingBag size={24} color={colors.success} />}
                  label="Total Visits"
                  value={customerOrders.length}
                  color={colors.success}
                />
                <StatCard
                  icon={<FiDollarSign size={24} color={colors.orange} />}
                  label="Total Spent"
                  value={`₹${calculateGrandTotal(customerOrders)}`}
                  color={colors.orange}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", gap: "20px" }}>
              {/* Favourite Items */}
              {customerFavItems.length > 0 && (
                <div
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "20px",
                    flex: 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <FiStar size={20} color={colors.orange} />
                    <span style={{ fontWeight: "600", color: "#333", fontSize: "16px" }}>
                      Top Rated Items
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {customerFavItems[0] && (
                      <PodiumItem
                        rank="1"
                        name={customerFavItems[0].itemName}
                        color="#B8860B"
                        bgColor="#FFD70033"
                      />
                    )}
                    {customerFavItems[1] && (
                      <PodiumItem
                        rank="2"
                        name={customerFavItems[1].itemName}
                        color="#6B7280"
                        bgColor="#C0C0C033"
                      />
                    )}
                    {customerFavItems[2] && (
                      <PodiumItem
                        rank="3"
                        name={customerFavItems[2].itemName}
                        color="#92400E"
                        bgColor="#CD7F3233"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Frequent Orders */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "20px",
                  flex: 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  maxHeight: "250px",
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <FiTrendingUp size={20} color={colors.success} />
                  <span style={{ fontWeight: "600", color: "#333", fontSize: "16px" }}>
                    Frequently Ordered
                  </span>
                </div>
                {favoriteItem && (
                  <div
                    style={{
                      background: `${colors.success}15`,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#666" }}>Most ordered:</span>
                    <span style={{ fontWeight: "600", color: colors.success }}>
                      {favoriteItem}
                    </span>
                  </div>
                )}
                {renderFrequentItems()}
              </div>
            </div>

            {/* Orders Table */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "20px",
                flex: 1,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <FiShoppingBag size={20} color={colors.success} />
                <span style={{ fontWeight: "600", color: "#333", fontSize: "16px" }}>
                  Order History
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    background: "#f0f0f0",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  {customerOrders.length} orders
                </span>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <Table
                  dataSource={customerOrders}
                  columns={columns}
                  rowKey="id"
                  pagination={{
                    pageSize: 5,
                    showSizeChanger: false,
                    showTotal: (total) => `Total ${total} orders`,
                  }}
                  scroll={{
                    y: tableHeights - 100,
                  }}
                  size="middle"
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "16px",
              color: "#888",
            }}
          >
            <FiUsers size={64} color="#ddd" />
            <h3 style={{ margin: 0, color: "#888", fontWeight: "500" }}>
              Select a customer to view details
            </h3>
            <p style={{ margin: 0, color: "#aaa" }}>
              Click on any customer from the list to see their order history and insights
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CustomerRelation;
