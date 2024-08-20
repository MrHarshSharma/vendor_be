import React, { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/setup";
import { Form, Table } from "antd";
import { RiMedalFill } from "react-icons/ri";

import { useSetAtom } from "jotai";
import { pageLoading } from "../constants/stateVariables";


const CustomerRelation = () => {
  const isPageLoading = useSetAtom (pageLoading)

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(undefined);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [favoriteItem, setFavoriteItem] = useState(null);
  const [allFoodItemHePurchased, setAllFoodItemHePurchased] = useState({});
  const [tableHeights, setTableHeights] = useState(0);
  const [customerFavItems, setCustomerFavItems] = useState([]);
  let user = JSON.parse(localStorage.getItem("user"));

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

        setCustomers(docs);

        console.log("customers", docs);
      } catch (error) {
        console.error("Error fetching documents: ", error);
      } finally {
isPageLoading(false )
      }
    };

    fetchCustomers();
    setTableHeights(window.innerHeight - 300);
  }, []);

  useEffect(() => {
    if (selectedCustomer !== undefined) {
      isPageLoading(true)
      fetchCustomerData(selectedCustomer.email);
    }
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

        // Fetch feedback for each order
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
        setCustomerOrders(ordersWithFeedback);
        console.log(ordersWithFeedback);
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
    let starts = "";
    for (let i = 0; i < number; i++) starts += `⭐`;

    return starts;
  };

  const renderfrequestItems = () => {
    const foodArray = Object.entries(allFoodItemHePurchased);

    // Sort the array in descending order based on the count
    foodArray.sort((a, b) => b[1] - a[1]);

    return (
      <div style={{ marginTop: "20px" }}>
        <span>Other frequent items orders</span>
        <div>
          {foodArray.map(([foodItem, count], i) => (
            <div
              key={foodItem}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{foodItem}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const columns = [
    // {
    //   title: "orderId",
    //   dataIndex: "id",
    //   key: "id",
    //   width: "20%",
    //   render: (id, _) => <span>{id}</span>,
    // },
    {
      title: "Date / Time",
      dataIndex: "timeStamp",
      key: "timeStamp",
      render: (timeStamp, i) => {
        let date = new Date(timeStamp);
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>{date.toLocaleDateString()}</span>
            <span>{date.toLocaleTimeString()}</span>
          </div>
        );
      },
      width: "10%",
    },
    {
      title: "Items",
      dataIndex: "order",
      key: "order",
      render: (order, i) => {
        return order.map((orderItem, j) => {
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{minWidth:'300px'}}>
                {orderItem.quantity} X {orderItem.name}
              </span>
              <span>{orderItem.quantity * orderItem.price}rs</span>
            </div>
          );
        });
      },
      width: "50%",
    },
    {
      title: "Total",
      dataIndex: "order",
      key: "totalPrice",
      render: (order, i) => {
        return (
          <span>
            {order.reduce(
              (total, item) => total + item.price * item.quantity,
              0
            )}
            rs
          </span>
        );
      },
      width: "10%",
    },
    {
      title: "Feedback",
      dataIndex: "orderFeedback",
      key: "feedback",
      render: (orderFeedback, i) => {
        return (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {orderFeedback?.feedback?.map((feedbackItem, j) => {
              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    borderBottom: "1px solid #e2e2e2",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "70%",
                    }}
                  >
                    <span style={{minWidth:'300px'}}> {feedbackItem?.itemName}</span>
                    <span>{feedbackItem.comment}</span>
                  </div>
                  <div
                    style={{
                      width: "30%",
                      display: "flex",
                      justifyContent: "end",
                    }}
                  >
                    <span style={{ fontSize: "10px" }}>
                      {paintStars(feedbackItem.rating)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
      width: "30%",
    },
  ];
const userSummary = () =>{
  return(
    <>
      <div
              style={{
                // width: "25%",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  border: "1px solid #e2e2e2",
                  padding: "10px",
                  borderRadius: "5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Visits: {customerOrders.length} times </span>
                <span>Spent: {calculateGrandTotal(customerOrders)}rs</span>
              </div>
              {customerFavItems.length > 0 && (
                <div
                  style={{
                    border: "1px solid #e2e2e2",
                    padding: "10px",
                    borderRadius: "5px",
                  }}
                >
                  <span>Favourite Items</span>
                  <div className="podium">
                    <div className="podium-item">
                      <span>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "900",
                          }}
                        >
                          1
                        </span>
                        <RiMedalFill fill="#425aff" className="podium-icon" />
                      </span>
                      <span>{customerFavItems?.[0]?.itemName}</span>
                    </div>
                    <div className="podium-item">
                      <span>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "900",
                          }}
                        >
                          2
                        </span>
                        <RiMedalFill
                          fill="rgb(142 4 4)"
                          className="podium-icon"
                        />
                      </span>
                      <span>{customerFavItems?.[1]?.itemName}</span>
                    </div>

                    <div className="podium-item">
                      <span>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "900",
                          }}
                        >
                          3
                        </span>
                        <RiMedalFill fill="#fff" className="podium-icon" />
                      </span>
                      <span>{customerFavItems?.[2]?.itemName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  border: "1px solid #e2e2e2",
                  padding: "10px",
                  borderRadius: "5px",
                }}
              >
                <span>Most ordered item : {favoriteItem}</span>
                <div>{renderfrequestItems()}</div>
              </div>
            </div>
    </>
  )
}
  return (
    <AppLayout>
      <div className="app-container customerCotainer">
        
        <Form
          style={{
            display: "flex",
            flexDirection: "column",
            width: "20%",
            gap: "10px",
            maxHeight: tableHeights + 200,
            overflow: "auto",
          }}
        >
          <span style={{ fontSize: "20px" }}>My Customers</span>
          {customers.map((customer, i) => (
            <div
              style={{
                background:
                  selectedCustomer?.id === customer?.id ? "#44b96b" : "",
              }}
              className="CustomerDiv"
              onClick={() => selectThisCustomer(customer)}
            >
              <img
                src={customer.photoURL}
                style={{ width: "40px", borderRadius: "100%" }}
              />
              <span>{customer.displayName}</span>
            </div>
          ))}
        </Form>
        {selectedCustomer && (
          <Form style={{width:'25%'}}>
            {userSummary}
          </Form>
        )}
      
        {selectedCustomer && (
          <Form
            style={{
              background: "",
              display: "flex",
              flexDirection: "row",
              width: "80%",
              gap: "20px",
              overflow:'auto'
            }}
          >
            <div style={{ width: 'auto' }}>
              <Table
                dataSource={customerOrders}
                columns={columns}
                pagination={{
                  pageSize: 10,
                }}
                scroll={{
                  y: tableHeights,
                  x:'auto'
                }}
              />
            </div>
            
          </Form>
        )}

       
      </div>
    </AppLayout>
  );
};

export default CustomerRelation;
