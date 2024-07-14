// Bill.js
import React from "react";

const Bill = React.forwardRef((props, ref) => {
  const order = props.order;
  console.log(order);
  return (
    <div ref={ref} style={{padding:'30px'}}>
      
      <h3>Order {order.id}</h3>
      <span>Name: {order?.customer?.displayName}</span><br/>
      Date: <span>
        <span>{new Date(order.timeStamp).toLocaleString().split(",")[0]}</span>
        <span>{new Date(order.timeStamp).toLocaleString().split(",")[1]}</span>
      </span><br/><br/>
      <div style={{ display: "flex", flexDirection: "column" }}>
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
            <span>{thisorder.quantity * thisorder.price} </span>
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
  );
});

export default Bill;
