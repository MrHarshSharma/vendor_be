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
import { Form } from "antd";


const Analytics = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(undefined);
  const [customerData, setCustomerData] = useState([]);
  const [favoriteItem, setFavoriteItem] = useState(null);
  const [allFoodItemHePurchased, setAllFoodItemHePurchased] = useState({});
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
        console.log(docs);
      } catch (error) {
        console.error("Error fetching documents: ", error);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        if (user) {
          const q = query(
            collection(db, "orders"),
            where("storeId", "==", user.uid),
            where("customer.email", "==", selectedCustomer.email)
          );
          const querySnapshot = await getDocs(q);
          const docs = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCustomerData(docs);
          console.log("userData", docs);
          if (docs.length > 0) {
            const foodPurchased = {};

            docs.forEach((order) => {
              order.order.forEach((item) => {
                if (foodPurchased[item.name]) {
                  foodPurchased[item.name] += 1;
                } else {
                  foodPurchased[item.name] = 1;
                }
              });
            });
            setAllFoodItemHePurchased(foodPurchased);
            console.log(foodPurchased);
            const favorite = Object.keys(foodPurchased).reduce((a, b) =>
              foodPurchased[a] > foodPurchased[b] ? a : b
            );
            setFavoriteItem(favorite);
          }
        }
      } catch (error) {
        console.error("Error fetching documents: ", error);
      }
    };

    fetchCustomerData();
  }, [selectedCustomer]);

  const selectThisCustomer = (thisCustomer) => {
    setSelectedCustomer(thisCustomer);
  };


  const renderfrequestItems = () => {
    const foodArray = Object.entries(allFoodItemHePurchased);

    // Sort the array in descending order based on the count
    foodArray.sort((a, b) => b[1] - a[1]);
    
    return(
        <div>
        <span>Other frequent orders</span>
        <ul>
        {foodArray.map(([foodItem, count], i) => (
            <li key={foodItem}>
            {foodItem}: {count}
            </li>
            ))}
            </ul>
            </div>
    )
  };
  return (
    <AppLayout>
      <div className="app-container">
        <Form
          style={{
            display: "flex",
            flexDirection: "column",
            width: "25%",
            gap: "20px",
          }}
        >
          <h2>My Customers</h2>
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
            <Form
            style={{
              background: "",
              display: "flex",
              flexDirection: "column",
              width: "75%",
              gap: "20px",
            }}
          >
            <div>
              <span>Most ordered item : {favoriteItem}</span>
            </div>
            <div>{renderfrequestItems()}</div>
          </Form>
        )}
      
      </div>
    </AppLayout>
  );
};

export default Analytics;
