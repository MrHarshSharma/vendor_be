import React, { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import {
  Select,
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  message,
  Checkbox,
  Upload,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { db } from "../firebase/setup";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import * as XLSX from 'xlsx';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useSetAtom } from "jotai";
import { pageLoading } from "../constants/stateVariables";


const { Option } = Select;

const MenuPage = () => {
  const isPageLoading = useSetAtom(pageLoading)
  const storage = getStorage();

  const [loading, setLoading] = useState(false);
  let user = JSON.parse(localStorage.getItem("user"));
  const [dbCat, setDbCat] = useState([]);
  const [categories_, setCategories_] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [categories, setCategories] = useState({});

  const addItem = (thisCategory) => {
    const newItem = {
      available: true,
      name: "",
      price: "",
      description: "",
      fileList: [],
      veg_nonveg:'',
    };
    setCategories({
      ...categories,
      [thisCategory]: [...categories[thisCategory], newItem],
    });
  }

  const handleInputChange = (category, index, field, value) => {
    const updatedCategories = { ...categories };
    updatedCategories[category][index][field] = value;
    setCategories(updatedCategories);
  };

  const fetchConfigstore = async () => {
    try {
      if (!user) {
        throw new Error("No user UID found in localStorage");
      }

      const configRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(configRef);

      if (docSnap.exists()) {
        console.log("this user data", docSnap.data());
        let data = docSnap.data();

        setCategories_(Object.keys(data.menu ? data.menu : {}));
        setSelectedCategories(Object.keys(data.menu ? data.menu : {}));

        setCategories(data.menu ? data.menu : {});
        setDbCat(data.menu ? data.menu : {});
      } else {
        console.log("No such document!");
        // return null;
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
isPageLoading(false)
    }
  };

  useEffect(() => {
    fetchConfigstore();
  }, []);

  const vegNonVegoptions = [
    {
      value: 'veg',
      label: "Veg",
    },
    {
      value:'nonveg',
      label: "Non veg",
    }
  ]
  const handleFileChange = (category, index, { fileList }) => {
    const updatedCategories = { ...categories };
    updatedCategories[category][index].fileList = fileList;
    setCategories(updatedCategories);
  };

  const handlePreview = async (file) => {
    let src = file.url;
    if (!src) {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow.document.write(image.outerHTML);
  };

  const renderFormItems = (category) => {
    return categories[category].map((item, index) => (
      <div key={index} style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <div
            style={{
              width: "80%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Input
              placeholder="Name"
              value={item.name}
              onChange={(e) =>
                handleInputChange(category, index, "name", e.target.value)
              }
            />
            <Input
              placeholder="Description"
              value={item.description}
              onChange={(e) =>
                handleInputChange(
                  category,
                  index,
                  "description",
                  e.target.value
                )
              }
            />
            <Input
              placeholder="Price"
              value={item.price}
              onChange={(e) =>
                handleInputChange(category, index, "price", e.target.value)
              }
            />
            <Input
              placeholder="Total Servings"
              value={item.servings}
              onChange={(e) =>
                handleInputChange(category, index, "servings", e.target.value)
              }
            />
            <Input
              placeholder="Prepration time"
              value={item.prep_time}
              onChange={(e) =>
                handleInputChange(category, index, "prep_time", e.target.value)
              }
            />

            <Input
            placeholder="Ingridents"
            value={item.ingridents}
            onChange={(e) =>
              handleInputChange(category, index, "ingridents", e.target.value)
            }
          />
          <Select
          size={'middle'}
          defaultValue={`${item.veg_nonveg}`}
          onChange={(value) =>
            handleInputChange(category, index, "veg_nonveg", value)
          }
          style={{
            width: 200,
          }}
          options={vegNonVegoptions}
        />
          </div>
          <div>
            <Upload
              listType="picture-card"
              fileList={item.fileList}
              onChange={(info) => handleFileChange(category, index, info)}
              onPreview={handlePreview}
              beforeUpload={() => false}
            >
              {item.fileList.length == 0 && "Upload"}
            </Upload>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "end",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <span>
            <DeleteOutlined
              style={{ color: "red" }}
              onClick={() => handleRemoveItem(category, index)}
            />{" "}
            Remove
          </span>
          <Checkbox
            checked={item.available}
            onChange={(e) =>
              handleInputChange(category, index, "available", e.target.checked)
            }
          >
            Available
          </Checkbox>
        </div>
      </div>
    ));
  };

  const handleChange = (value) => {
    setSelectedCategories(value);
    let temp = {};
    value.map((val) => {
      temp[val] = dbCat[val] ? dbCat[val] : [];
      // console.log(categories[val])
    });
    // setCategories();
    setCategories(temp);
  };

  const handleAddCategory = (value) => {
    if (value && !categories_.includes(value)) {
      setCategories_([...categories_, value]);
      console.log([...categories_, value]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
isPageLoading(true)
    try {
      for (const category in categories) {
        for (const item of categories[category]) {
          if(item.fileList.length > 0) {
          if (item.fileList[0].status !== "done") {
            const file = item.fileList[0].originFileObj;
            const storageRef = ref(storage, `images/${user.uid}/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            item.imageUrl = downloadURL;
            item.fileList = [
              {
                uid: item.fileList[0].name,
                name: item.fileList[0].name,
                status: "done",
                url: downloadURL,
              },
            ];
          }
        }
        }
      }

      // Save to Firestore
      const docRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(docRef);
      let menu = "menu";

      if (docSnap.exists()) {
        // Update the document if it exists
        await updateDoc(docRef, {
          [menu]: categories,
        });
      } else {
        // Create the document with the specified field if it doesn't exist
        await setDoc(docRef, {
          [menu]: categories,
        });
      }

      message.success("Menu added successfully");
      setLoading(false);
    } catch (error) {
      console.error("Error updating Menu: ", error);
      message.error("Error updating Menu");
      setLoading(false);
    } finally {
isPageLoading(false)
    }
  };

  const handleRemoveItem = (thiscategory, index) => {
    setCategories((prevItems) => {
      const newItems = [...prevItems[thiscategory]];
      newItems.splice(index, 1);
      return {
        ...prevItems,
        [thiscategory]: newItems,
      };
    });
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      console.log(jsonData)
      // Parse the Excel data and update the state
      const newCategories = {};
      jsonData.forEach((row, index) => {
        if (index > 0) { // Assuming the first row is the header
          const [category, name, description, price, available,prep_time,servings, ingridents, veg_nonveg] = row;
          if (!newCategories[category]) {
            newCategories[category] = [];
          }
          newCategories[category].push({
            name,
            description,
            price: price || '',
            available: available,
            prep_time,servings, ingridents,
            fileList: [],
            veg_nonveg: veg_nonveg
          });
        }
      });

      handleChange(Object.keys(newCategories))
      setCategories((prevCategories) => ({
        ...prevCategories,
        ...newCategories,
      }));
    };
    reader.readAsArrayBuffer(file);
  };
  

  return (
    <AppLayout>
      <div style={{ padding: "24px" }}>
        <Form layout="vertical" style={{ width: "100%" }} onFinish={handleSubmit}>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }} className="menuInputs">
      

          <input name='uploadExcel' type="file" accept=".xlsx, .xls" placeholder='uokiad' onChange={handleExcelUpload} />
         
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Select or add a category"
              onChange={handleChange}
              onSelect={handleAddCategory}
              value={selectedCategories}
            >
              {categories_.map((category) => (
                <Option key={category} value={category}>
                  {category}
                </Option>
              ))}
            </Select>
  
            <Button type="primary" htmlType="submit" loading={loading}>
              Publish menu
            </Button>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            
            {Object.keys(categories).map((category) => (
              <Card
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                key={category}
                style={{
                  marginBottom: 16,
                  height: "fit-content",
                  width: "32%",
                }}
                className="menuContainer"
              >
                {renderFormItems(category)}
                <Button type="dashed" onClick={() => addItem(category)} block>
                  Add Item
                </Button>
              </Card>
            ))}
          </div>
        </Form>
      </div>
    </AppLayout>
  );
  

  // return (
  //   <AppLayout>
  //     <div style={{ padding: "24px" }}>
  //       <Form
  //         layout="vertical"
  //         style={{ width: "100%" }}
  //         onFinish={handleSubmit}
  //       >
  //         <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
  //           <Select
  //             mode="tags"
  //             style={{ width: "100%" }}
  //             placeholder="Select or add a category"
  //             onChange={handleChange}
  //             onSelect={handleAddCategory}
  //             value={selectedCategories}
  //           >
  //             {categories_.map((category) => (
  //               <Option key={category} value={category}>
  //                 {category}
  //               </Option>
  //             ))}
  //           </Select>

  //           <Button type="primary" htmlType="submit" loading={loading}>
  //             Publish menu
  //           </Button>
  //         </div>
  //         <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
  //           {Object.keys(categories).map((category) => (
  //             <Card
  //               title={category.charAt(0).toUpperCase() + category.slice(1)}
  //               key={category}
  //               style={{
  //                 marginBottom: 16,
  //                 height: "fit-content",
  //                 width: "32%",
  //               }}
  //             >
  //               {renderFormItems(category)}
  //               {/*{currentCategory === category && ( */}
  //               <Button type="dashed" onClick={() => addItem(category)} block>
  //                 Add Item
  //               </Button>
  //               {/*)}*/}
  //             </Card>
  //           ))}
  //         </div>
  //       </Form>
  //     </div>
  //   </AppLayout>
  // );
};

export default MenuPage;
