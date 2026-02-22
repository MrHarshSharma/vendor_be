import React, { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "./AppLayout";
import {
  Select,
  Input,
  Button,
  message,
  Switch,
  Upload,
  Empty,
} from "antd";
import {
  FiPlus,
  FiTrash2,
  FiUpload,
  FiSave,
  FiClock,
  FiUsers,
  FiFileText,
  FiChevronRight,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { MdRestaurantMenu, MdFastfood } from "react-icons/md";
import { db } from "../firebase/setup";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useSetAtom } from "jotai";
import { pageLoading } from "../constants/stateVariables";
import { colors } from "../constants/colors";

const { Option } = Select;
const { TextArea } = Input;

// Helper function to normalize veg/non-veg values from various formats
const getVegNonVegValue = (value) => {
  if (value === true || value === "Veg" || value === "veg" || value === "vegetarian") {
    return "Veg";
  }
  if (value === false || value === "Non-Veg" || value === "nonveg" || value === "non-veg" || value === "nonvegetarian") {
    return "Non-Veg";
  }
  return value; // Return as-is if unrecognized (will show placeholder)
};

// Helper to check if item is veg
const isVegItem = (value) => {
  return value === true || value === "Veg" || value === "veg" || value === "vegetarian";
};

// Move VegBadge outside the component
const VegBadge = ({ isVeg }) => (
  <div
    style={{
      width: "16px",
      height: "16px",
      border: `2px solid ${isVeg ? colors.success : colors.reject}`,
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: isVeg ? colors.success : colors.reject,
      }}
    />
  </div>
);

// Move CategoryItem outside the component
const CategoryItem = ({ category, isSelected, itemCount, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      borderRadius: "10px",
      cursor: "pointer",
      background: isSelected ? `${colors.success}15` : "transparent",
      border: isSelected ? `1px solid ${colors.success}40` : "1px solid transparent",
      marginBottom: "8px",
      transition: "all 0.2s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: isSelected ? colors.success : "#e8e8e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MdFastfood size={16} color={isSelected ? "white" : "#888"} />
      </div>
      <div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: isSelected ? "600" : "500",
            color: isSelected ? colors.success : "#333",
          }}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </div>
        <div style={{ fontSize: "12px", color: "#888" }}>
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
    <FiChevronRight
      size={18}
      color={isSelected ? colors.success : "#ccc"}
    />
  </div>
);

// Move MenuItemCard outside the component
const MenuItemCard = ({
  item,
  index,
  category,
  onInputChange,
  onFileChange,
  onPreview,
  onRemove,
}) => (
  <div
    style={{
      background: "white",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "12px",
      border: "1px solid #e8e8e8",
      boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
    }}
  >
    <div style={{ display: "flex", gap: "16px" }}>
      {/* Image Upload */}
      <div style={{ flexShrink: 0 }}>
        <Upload
          listType="picture-card"
          fileList={item.fileList || []}
          onChange={(info) => onFileChange(category, index, info)}
          onPreview={onPreview}
          beforeUpload={() => false}
          style={{ marginBottom: 0 }}
        >
          {(!item.fileList || item.fileList.length === 0) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "#888",
              }}
            >
              <FiUpload size={20} />
              <span style={{ fontSize: "12px", marginTop: "4px" }}>Upload</span>
            </div>
          )}
        </Upload>
      </div>

      {/* Form Fields */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <Input
            placeholder="Item name"
            value={item.name || ""}
            onChange={(e) => onInputChange(category, index, "name", e.target.value)}
            style={{ borderRadius: "8px", flex: 2 }}
          />
          <Input
            placeholder="Price"
            prefix="₹"
            value={item.price || ""}
            onChange={(e) => onInputChange(category, index, "price", e.target.value)}
            style={{ borderRadius: "8px", flex: 1 }}
          />
        </div>

        <TextArea
          placeholder="Description"
          value={item.description || ""}
          onChange={(e) => onInputChange(category, index, "description", e.target.value)}
          autoSize={{ minRows: 1, maxRows: 2 }}
          style={{ borderRadius: "8px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <Input
            placeholder="Prep time"
            prefix={<FiClock size={14} color="#888" />}
            value={item.prep_time || ""}
            onChange={(e) => onInputChange(category, index, "prep_time", e.target.value)}
            style={{ borderRadius: "8px", flex: 1 }}
          />
          <Input
            placeholder="Servings"
            prefix={<FiUsers size={14} color="#888" />}
            value={item.servings || ""}
            onChange={(e) => onInputChange(category, index, "servings", e.target.value)}
            style={{ borderRadius: "8px", flex: 1 }}
          />
        </div>

        <Input
          placeholder="Ingredients (comma separated)"
          prefix={<FiFileText size={14} color="#888" />}
          value={item.ingridents || ""}
          onChange={(e) => onInputChange(category, index, "ingridents", e.target.value)}
          style={{ borderRadius: "8px" }}
        />
      </div>
    </div>

    {/* Footer Actions */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Veg/Non-veg Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
          }}
        >
          <Select
            value={getVegNonVegValue(item.veg_nonveg)}
            onChange={(value) => onInputChange(category, index, "veg_nonveg", value)}
            bordered={false}
            style={{ width: "130px" }}
            size="small"
            dropdownMatchSelectWidth={false}
            placeholder="Select"
          >
            <Option value="Veg">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <VegBadge isVeg={true} />
                <span>Veg</span>
              </div>
            </Option>
            <Option value="Non-Veg">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <VegBadge isVeg={false} />
                <span>Non-Veg</span>
              </div>
            </Option>
          </Select>
        </div>

        {/* Available Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            background: item.available ? `${colors.success}15` : "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <Switch
            size="small"
            checked={item.available}
            onChange={(checked) => onInputChange(category, index, "available", checked)}
            style={{
              background: item.available ? colors.success : "#ccc",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              color: item.available ? colors.success : "#888",
              fontWeight: "500",
            }}
          >
            {item.available ? "Available" : "Unavailable"}
          </span>
        </div>
      </div>

      {/* Delete Button */}
      <Button
        type="text"
        danger
        icon={<FiTrash2 size={16} />}
        onClick={() => onRemove(category, index)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: colors.reject,
        }}
      >
        Remove
      </Button>
    </div>
  </div>
);

const MenuPage = () => {
  const isPageLoading = useSetAtom(pageLoading);
  const storage = getStorage();
  const excelInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  let user = JSON.parse(localStorage.getItem("user"));
  const [, setDbCat] = useState([]);
  const [categories_, setCategories_] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [categories, setCategories] = useState({});

  // Search and filter states
  const [categorySearch, setCategorySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilter, setItemFilter] = useState("all"); // all, veg, nonveg
  const [availabilityFilter, setAvailabilityFilter] = useState("all"); // all, available, unavailable

  const addItem = (thisCategory) => {
    const newItem = {
      available: true,
      name: "",
      price: "",
      description: "",
      fileList: [],
      veg_nonveg: "Veg",
    };
    setCategories({
      ...categories,
      [thisCategory]: [newItem, ...(categories[thisCategory] || [])],
    });
  };

  const handleInputChange = useCallback((category, index, field, value) => {
    setCategories((prev) => {
      const updatedCategories = { ...prev };
      updatedCategories[category] = [...updatedCategories[category]];
      updatedCategories[category][index] = {
        ...updatedCategories[category][index],
        [field]: value,
      };
      return updatedCategories;
    });
  }, []);

  const fetchConfigstore = async () => {
    try {
      if (!user) {
        throw new Error("No user UID found in localStorage");
      }

      const configRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(configRef);

      if (docSnap.exists()) {
        let data = docSnap.data();

        const defaultCategories = [
          "Starters",
          "Main Course",
          "Desserts",
          "Beverages",
        ];
        const menuKeys = Object.keys(data.menu ? data.menu : {});
        const uniqueCategories = [...new Set([...menuKeys, ...defaultCategories])];

        setCategories_(uniqueCategories);
        setCategories(data.menu ? data.menu : {});
        setDbCat(data.menu ? data.menu : {});

        // Select first category with items, or first category
        if (menuKeys.length > 0) {
          setSelectedCategory(menuKeys[0]);
        } else if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      isPageLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigstore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback((category, index, { fileList }) => {
    setCategories((prev) => {
      const updatedCategories = { ...prev };
      updatedCategories[category] = [...updatedCategories[category]];
      updatedCategories[category][index] = {
        ...updatedCategories[category][index],
        fileList,
      };
      return updatedCategories;
    });
  }, []);

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

  const handleAddCategory = () => {
    if (newCategoryName && !categories_.includes(newCategoryName)) {
      setCategories_([...categories_, newCategoryName]);
      setCategories({
        ...categories,
        [newCategoryName]: [],
      });
      setSelectedCategory(newCategoryName);
      setNewCategoryName("");
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    // Initialize category in categories object if not exists
    if (!categories[category]) {
      setCategories({
        ...categories,
        [category]: [],
      });
    }
  };

  const handleDeleteCategory = (category) => {
    const newCategories = { ...categories };
    delete newCategories[category];
    setCategories(newCategories);

    if (selectedCategory === category) {
      const remainingCategories = Object.keys(newCategories);
      setSelectedCategory(remainingCategories.length > 0 ? remainingCategories[0] : null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    isPageLoading(true);
    try {
      const categoriesToSave = { ...categories };

      for (const category in categoriesToSave) {
        for (const item of categoriesToSave[category]) {
          if (item.fileList && item.fileList.length > 0) {
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

      const docRef = doc(db, "configstore", user.uid);
      const docSnap = await getDoc(docRef);
      let menu = "menu";

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          [menu]: categoriesToSave,
        });
      } else {
        await setDoc(docRef, {
          [menu]: categoriesToSave,
        });
      }

      setCategories(categoriesToSave);
      message.success("Menu published successfully!");
      setLoading(false);
    } catch (error) {
      console.error("Error updating Menu: ", error);
      message.error("Error updating Menu");
      setLoading(false);
    } finally {
      isPageLoading(false);
    }
  };

  const handleRemoveItem = useCallback((thiscategory, index) => {
    setCategories((prevItems) => {
      const newItems = [...prevItems[thiscategory]];
      newItems.splice(index, 1);
      return {
        ...prevItems,
        [thiscategory]: newItems,
      };
    });
  }, []);

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const newCategories = {};
      jsonData.forEach((row, index) => {
        if (index > 0) {
          const [
            category,
            name,
            description,
            price,
            available,
            prep_time,
            servings,
            ingridents,
            veg_nonveg,
          ] = row;
          if (category) {
            if (!newCategories[category]) {
              newCategories[category] = [];
            }
            newCategories[category].push({
              name,
              description,
              price: price || "",
              available: available,
              prep_time,
              servings,
              ingridents,
              fileList: [],
              veg_nonveg: veg_nonveg,
            });
          }
        }
      });

      // Add new categories to the list
      const newCategoryNames = Object.keys(newCategories);
      setCategories_((prev) => [...new Set([...prev, ...newCategoryNames])]);

      setCategories((prevCategories) => ({
        ...prevCategories,
        ...newCategories,
      }));

      if (newCategoryNames.length > 0) {
        setSelectedCategory(newCategoryNames[0]);
      }

      message.success("Excel imported successfully!");
    };
    reader.readAsArrayBuffer(file);
  };

  const getTotalItems = () => {
    return Object.values(categories).reduce(
      (total, items) => total + (items?.length || 0),
      0
    );
  };

  // Filter categories based on search
  const filteredCategories = categories_.filter((category) =>
    category.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filter items based on search and filters
  const getFilteredItems = () => {
    if (!selectedCategory || !categories[selectedCategory]) return [];

    return categories[selectedCategory].filter((item) => {
      // Search filter
      const matchesSearch =
        !itemSearch ||
        (item.name && item.name.toLowerCase().includes(itemSearch.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(itemSearch.toLowerCase()));

      // Veg/Non-veg filter - use helper function
      const isVeg = isVegItem(item.veg_nonveg);
      const normalizedValue = getVegNonVegValue(item.veg_nonveg);

      const matchesType =
        itemFilter === "all" ||
        (itemFilter === "veg" && isVeg) ||
        (itemFilter === "nonveg" && normalizedValue === "Non-Veg");

      // Availability filter
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && item.available) ||
        (availabilityFilter === "unavailable" && !item.available);

      return matchesSearch && matchesType && matchesAvailability;
    });
  };

  const filteredItems = getFilteredItems();

  // Get original index for filtered items (needed for editing)
  const getOriginalIndex = (filteredIndex) => {
    if (!selectedCategory || !categories[selectedCategory]) return filteredIndex;
    const filteredItem = filteredItems[filteredIndex];
    return categories[selectedCategory].findIndex((item) => item === filteredItem);
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
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: "#f5f7fa",
            borderBottom: "1px solid #e8e8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "700",
                color: "#333",
              }}
            >
              Menu Management
            </h1>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>
              {Object.keys(categories).length} categories, {getTotalItems()} items
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {/* Excel Upload */}
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              style={{ display: "none" }}
            />
            <Button
              icon={<FiUpload size={16} />}
              onClick={() => excelInputRef.current?.click()}
              style={{
                borderRadius: "10px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Import Excel
            </Button>

            {/* Publish Button */}
            <Button
              type="primary"
              icon={<FiSave size={16} />}
              onClick={handleSubmit}
              loading={loading}
              style={{
                background: colors.success,
                borderColor: colors.success,
                borderRadius: "10px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600",
              }}
            >
              Publish Menu
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: "0",
            overflow: "hidden",
          }}
        >
          {/* Left Panel - Categories */}
          <div
            style={{
              background: "white",
              borderRight: "1px solid #e8e8e8",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Add Category */}
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onPressEnter={handleAddCategory}
                  style={{ borderRadius: "8px", flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<FiPlus size={16} />}
                  onClick={handleAddCategory}
                  disabled={!newCategoryName}
                  style={{
                    background: colors.success,
                    borderColor: colors.success,
                    borderRadius: "8px",
                  }}
                />
              </div>
            </div>

            {/* Category Search */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <Input
                placeholder="Search categories..."
                prefix={<FiSearch size={14} color="#888" />}
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                allowClear
                style={{ borderRadius: "8px" }}
              />
            </div>

            {/* Categories List */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "16px",
              }}
            >
              <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#888", textTransform: "uppercase" }}>
                  Categories
                </span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  {filteredCategories.length} of {categories_.length}
                </span>
              </div>

              {filteredCategories.map((category) => (
                <CategoryItem
                  key={category}
                  category={category}
                  isSelected={selectedCategory === category}
                  itemCount={categories[category]?.length || 0}
                  onClick={() => handleSelectCategory(category)}
                />
              ))}

              {filteredCategories.length === 0 && categories_.length > 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                  <FiSearch size={30} color="#ddd" />
                  <p style={{ marginTop: "8px" }}>No categories match "{categorySearch}"</p>
                </div>
              )}

              {categories_.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                  <MdRestaurantMenu size={40} color="#ddd" />
                  <p style={{ marginTop: "8px" }}>No categories yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Items */}
          <div
            style={{
              overflow: "auto",
              padding: "24px",
              background: "#f5f7fa",
            }}
          >
            {selectedCategory ? (
              <>
                {/* Category Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: `${colors.success}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdFastfood size={22} color={colors.success} />
                    </div>
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                      </h2>
                      <span style={{ fontSize: "13px", color: "#888" }}>
                        {categories[selectedCategory]?.length || 0} items
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      type="primary"
                      icon={<FiPlus size={16} />}
                      onClick={() => addItem(selectedCategory)}
                      style={{
                        background: colors.success,
                        borderColor: colors.success,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Add Item
                    </Button>
                    <Button
                      danger
                      icon={<FiTrash2 size={16} />}
                      onClick={() => handleDeleteCategory(selectedCategory)}
                      style={{
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Delete Category
                    </Button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Item Search */}
                  <Input
                    placeholder="Search items..."
                    prefix={<FiSearch size={14} color="#888" />}
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    allowClear
                    style={{ borderRadius: "8px", flex: 1, maxWidth: "300px" }}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FiFilter size={14} color="#888" />

                    {/* Veg/Non-veg Filter */}
                    <div
                      style={{
                        display: "flex",
                        background: "#f5f5f5",
                        borderRadius: "8px",
                        padding: "2px",
                      }}
                    >
                      {[
                        { key: "all", label: "All", color: null },
                        { key: "veg", label: "Veg", color: colors.success },
                        { key: "nonveg", label: "Non-Veg", color: colors.reject },
                      ].map((filter) => (
                        <button
                          key={filter.key}
                          onClick={() => setItemFilter(filter.key)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            background: itemFilter === filter.key ? "white" : "transparent",
                            color: itemFilter === filter.key ? (filter.color || colors.success) : "#666",
                            boxShadow: itemFilter === filter.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {filter.color && (
                            <div
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: filter.color,
                              }}
                            />
                          )}
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {/* Availability Filter */}
                    <div
                      style={{
                        display: "flex",
                        background: "#f5f5f5",
                        borderRadius: "8px",
                        padding: "2px",
                      }}
                    >
                      {[
                        { key: "all", label: "All" },
                        { key: "available", label: "Available" },
                        { key: "unavailable", label: "Unavailable" },
                      ].map((filter) => (
                        <button
                          key={filter.key}
                          onClick={() => setAvailabilityFilter(filter.key)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            background: availabilityFilter === filter.key ? "white" : "transparent",
                            color: availabilityFilter === filter.key ? colors.success : "#666",
                            boxShadow: availabilityFilter === filter.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results count */}
                  <span style={{ fontSize: "12px", color: "#888", marginLeft: "auto" }}>
                    {filteredItems.length} of {categories[selectedCategory]?.length || 0} items
                  </span>
                </div>

                {/* Items List */}
                {categories[selectedCategory]?.length > 0 ? (
                  filteredItems.length > 0 ? (
                    <div>
                      {filteredItems.map((item, filteredIndex) => (
                        <MenuItemCard
                          key={`${selectedCategory}-${getOriginalIndex(filteredIndex)}`}
                          item={item}
                          index={getOriginalIndex(filteredIndex)}
                          category={selectedCategory}
                          onInputChange={handleInputChange}
                          onFileChange={handleFileChange}
                          onPreview={handlePreview}
                          onRemove={handleRemoveItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "white",
                        borderRadius: "16px",
                        padding: "40px 20px",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <FiSearch size={40} color="#ddd" />
                      <p style={{ fontSize: "16px", color: "#666", marginTop: "12px", marginBottom: "8px" }}>
                        No items match your search
                      </p>
                      <p style={{ fontSize: "14px", color: "#888" }}>
                        Try adjusting your search or filters
                      </p>
                      <Button
                        type="link"
                        onClick={() => {
                          setItemSearch("");
                          setItemFilter("all");
                          setAvailabilityFilter("all");
                        }}
                        style={{ color: colors.success, marginTop: "8px" }}
                      >
                        Clear all filters
                      </Button>
                    </div>
                  )
                ) : (
                  <div
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "60px 20px",
                      textAlign: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <div>
                          <p style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>
                            No items in this category
                          </p>
                          <p style={{ fontSize: "14px", color: "#888" }}>
                            Click "Add Item" to add your first item
                          </p>
                        </div>
                      }
                    />
                    <Button
                      type="primary"
                      icon={<FiPlus size={16} />}
                      onClick={() => addItem(selectedCategory)}
                      style={{
                        marginTop: "16px",
                        background: colors.success,
                        borderColor: colors.success,
                        borderRadius: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Add First Item
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "60px 40px",
                    textAlign: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <MdRestaurantMenu size={60} color="#ddd" />
                  <h3 style={{ margin: "16px 0 8px", color: "#333" }}>
                    Select a Category
                  </h3>
                  <p style={{ color: "#888", margin: 0 }}>
                    Choose a category from the left panel or create a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MenuPage;
