import React from "react";
import { Card, Button, Select } from "antd";
import coffee from "../images/coffee.png";
const { Option } = Select;
const { Meta } = Card;

function ProductCard({ product }) {
  return (
    <Card style={{ width: "310px", margin: "10px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div>
          <img
            alt={product.name}
            src={coffee}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
        <div style={{display:'flex', gap:'10px', flexDirection:'column'}}>
          <span style={{fontSize:'18px', fontWeight:'bold'}}>{product.name}</span>
          <span>{product.ingredients}</span>
          <span>Price: ${product.price}</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <Select defaultValue="1" style={{ width: 60 }}>
              <Option value="1">1</Option>
              <Option value="2">2</Option>
              <Option value="3">3</Option>
            </Select>
            <Button type="primary">Add to Cart</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ProductCard;
