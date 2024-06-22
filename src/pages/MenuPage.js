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


import { getStorage,ref, uploadBytes, getDownloadURL } from "firebase/storage";


const { Option } = Select;

const MenuPage = () => {
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
    };
    setCategories({
      ...categories,
      [thisCategory]: [...categories[thisCategory], newItem],
    });
  };

  // const handleInputChange = (thiscategory, index, field, value) => {
  //   const updatedItems = categories[thiscategory].map((item, i) =>
  //     i === index ? { ...item, [field]: value } : item
  //   );
  //   setCategories({
  //     ...categories,
  //     [thiscategory]: updatedItems,
  //   });
  // };

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
    }
  };

  useEffect(() => {
    fetchConfigstore();
  }, []);

  // const [fileList, setFileList] = useState([
  //   {
  //     uid: '-1',
  //     name: 'image.png',
  //     status: 'done',
  //     url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
  //   },
  // ]);
  // const onChange = ({ fileList: newFileList }) => {
  //   setFileList(newFileList);
  // };

  // const onPreview = async (file) => {
  //   let src = file.url;
  //   if (!src) {
  //     src = await new Promise((resolve) => {
  //       const reader = new FileReader();
  //       reader.readAsDataURL(file.originFileObj);
  //       reader.onload = () => resolve(reader.result);
  //     });
  //   }
  //   const image = new Image();
  //   image.src = src;
  //   const imgWindow = window.open(src);
  //   imgWindow?.document.write(image.outerHTML);
  // };
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
    // return categories[category].map((item, index) => (
    //   <div style={{marginBottom:'30px'}}>
    //   <div style={{display:'flex', gap:'10px'}}>

    //     <div style={{width:'80%', display: "flex", flexDirection:'column', gap:'10px' }}>
    //       <Input
    //         placeholder="Name"
    //         value={item.name}
    //         onChange={(e) =>
    //           handleInputChange(category, index, "name", e.target.value)
    //         }
    //       />
    //       <Input
    //         placeholder="Description"
    //         value={item.description}
    //         onChange={(e) =>
    //           handleInputChange(category, index, "description", e.target.value)
    //         }
    //       />
    //       <Input
    //         placeholder="Price(rs)"
    //         value={item.price}
    //         onChange={(e) =>
    //           handleInputChange(category, index, "price", e.target.value)
    //         }
    //       />
    //     </div>
    //     <div>

    //     <Upload

    //       listType="picture-card"
    //       fileList={fileList}
    //       onChange={onChange}
    //       onPreview={onPreview}

    //       name="logo"
    //       // listType="picture"
    //       // onChange={(e)=>handleUpload(e)}
    //       beforeUpload={() => false}
    //     >
    //       {fileList.length !== 1 && '+ Upload'}
    //     </Upload>

    //     </div>
    //   </div>

    //     <div
    //       style={{
    //         display: "flex",
    //         flexDirection: "row",
    //         alignItems: "center",
    //         justifyContent:'end',
    //         gap: "10px",
    //         marginTop:'10px'
    //       }}
    //     >
    //       <span>
    //         <DeleteOutlined
    //           style={{ color: "red" }}
    //           onClick={() => handleRemoveItem(category, index)}
    //         />{" "}
    //         Remove
    //       </span>
    //       <Checkbox
    //         checked={item.available}
    //         style={{}}
    //         onChange={(e) =>
    //           handleInputChange(category, index, "available", e.target.checked)
    //         }
    //       >
    //         Available
    //       </Checkbox>
    //     </div>
    //   </div>
    // ));

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
              placeholder="Price(rs)"
              value={item.price}
              onChange={(e) =>
                handleInputChange(category, index, "price", e.target.value)
              }
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

  // const handleSubmit = async () => {
  //   setLoading(true);
  //   categories = {
  //     asdf: [
  //       {
  //         available: "true",
  //         name: "zc",
  //         price: "2322",
  //         description: "asda",
  //         fileList: [
  //           {
  //             uid: "rc-upload-1718871404734-141",
  //             lastModified: 1688652304601,
  //             lastModifiedDate: "2023-07-06T14:05:04.601Z",
  //             name: "men-s-grey-skater-donald-graphic-printed-oversized-t-shirt-602558-1688380672-5(1).jpg",
  //             size: 120848,
  //             type: "image/jpeg",
  //             percent: 0,
  //             originFileObj: {
  //               uid: "rc-upload-1718871404734-141",
  //             },
  //             thumbUrl:
  //               "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA"
  //           },
  //         ],
  //       },
  //       {
  //         available: "true",
  //         name: "asdf",
  //         price: "123",
  //         description: "asf",
  //         fileList: [
  //           {
  //             uid: "rc-upload-1718871404734-147",
  //             lastModified: 1688652304546,
  //             lastModifiedDate: "2023-07-06T14:05:04.546Z",
  //             name: "men-s-grey-skater-donald-graphic-printed-oversized-t-shirt-602558-1688380655-2(1).jpg",
  //             size: 168646,
  //             type: "image/jpeg",
  //             percent: 0,
  //             originFileObj: {
  //               uid: "rc-upload-1718871404734-147",
  //             },
  //             thumbUrl:
  //               "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA"
  //           },
  //         ],
  //       },
  //     ],
  //     thn: [
  //       {
  //         available: "true",
  //         name: "Asss",
  //         price: "33",
  //         description: "sfds",
  //         fileList: [
  //           {
  //             uid: "rc-upload-1718871404734-151",
  //             lastModified: 1688652304578,
  //             lastModifiedDate: "2023-07-06T14:05:04.578Z",
  //             name: "men-s-grey-skater-donald-graphic-printed-oversized-t-shirt-602558-1688380666-4(1).jpg",
  //             size: 93140,
  //             type: "image/jpeg",
  //             percent: 0,
  //             originFileObj: {
  //               uid: "rc-upload-1718871404734-151",
  //             },
  //             thumbUrl:
  //               "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA"
  //           },
  //         ],
  //       },
  //     ],
  //   };
  //   try {
  //     const docRef = doc(db, "configstore", user.uid);
  //     const docSnap = await getDoc(docRef);
  //     let menu = "menu";
  //     console.log(docSnap.data());
  //     if (docSnap.exists()) {
  //       // Update the document if it exists
  //       await updateDoc(docRef, {
  //         [menu]: categories,
  //       });
  //     } else {
  //       // Create the document with the specified field if it doesn't exist
  //       await setDoc(docRef, {
  //         [menu]: categories,
  //       });
  //     }

  //     message.success("Menu added successfully");
  //     setLoading(false);
  //   } catch (error) {
  //     console.error("Error updating Menu: ", error);
  //     message.error("Error updating Menu");
  //     setLoading(false);
  //   }
  // };


  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Upload images to Firebase Storage and get URLs
      // for (const category in categories) {
      //   for (let i = 0; i < categories[category].length; i++) {
      //     const item = categories[category][i];
      //     const fileList = item.fileList || [];
  
      //     for (let j = 0; j < fileList.length; j++) {
      //       const file = fileList[j].originFileObj;
      //       const storageRef = await ref(storage, `menuItems/${user.uid}/${file.name}`);
      //       const snapshot = await uploadBytes(storageRef, file);
      //       const downloadURL = await getDownloadURL(snapshot.ref);
  
      //       // Add the download URL to the item
      //       if (!item.imageUrls) {
      //         item.imageUrls = [];
      //       }
      //       item.imageUrls.push(downloadURL);
      //     }
      //   }
      // }

      for (const category in categories) {
        for (const item of categories[category]) {
          if (item.fileList[0].status !=='done') {
            
            const file = item.fileList[0].originFileObj;
            const storageRef = ref(storage, `images/${user.uid}/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            item.imageUrl = downloadURL;
            item.fileList=[{
              uid: item.fileList[0].name,
              name: item.fileList[0].name,
              status: 'done',
              url: downloadURL,
            }];
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

  return (
    <AppLayout>
      <div style={{ padding: "24px" }}>
        <Form
          layout="vertical"
          style={{ width: "100%" }}
          onFinish={handleSubmit}
        >
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
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
              >
                {renderFormItems(category)}
                {/*{currentCategory === category && ( */}
                <Button type="dashed" onClick={() => addItem(category)} block>
                  Add Item
                </Button>
                {/*)}*/}
              </Card>
            ))}
          </div>
        </Form>
      </div>
    </AppLayout>
  );
};

export default MenuPage;
