-- SQL Migration for Cherish Chow (Vendor BE) to Supabase
-- Based on analysis of Firestore usage in React codebase

-- 1. Users Table (from 'users' collection)
-- Used in: MobileNumberLogin.js
CREATE TABLE IF NOT EXISTS public.users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Or TEXT if you want to keep Firebase UIDs
    email TEXT,
    display_name TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auth Users Table (from 'authUser' collection)
-- Used in: MobileNumberLogin.js, ToolHeader.js
-- Seemingly used for permission/plan checking
CREATE TABLE IF NOT EXISTS public.auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ -- Stored as date string or timestamp in code
);

-- 3. Stores / Config Store (from 'configstore' collection)
-- Used in: Dashboard.js, MenuPage.js, Profile.js
-- The document ID is usually the user.uid
CREATE TABLE IF NOT EXISTS public.stores (
    user_id TEXT PRIMARY KEY, -- Maps to users.uid
    restaurant_name TEXT,
    restaurant_type TEXT,
    tagline TEXT,
    subtagline TEXT,
    tables INTEGER DEFAULT 0,
    primary_color TEXT,
    secondary_color TEXT,
    logo_url TEXT,
    menu JSONB -- Storing the nested category/item structure as JSONB to preserve frontend compatibility
);

-- 4. Customers (from 'customer' collection)
-- Used in: CustomerRelation.js
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_user_id TEXT REFERENCES public.stores(user_id), -- The vendor who owns this customer record
    display_name TEXT,
    photo_url TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Orders (from 'orders' collection)
-- Used in: Orders.js, CustomerRelation.js
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Firestore uses string IDs, UUID is better for Postgres
    store_id TEXT REFERENCES public.stores(user_id),
    customer_data JSONB, -- Stores snapshot of customer details {uid, displayName, email...} as used in code
    order_items JSONB, -- Stores the array of items: [{name, quantity, price, ...}]
    order_status TEXT DEFAULT 'new', -- 'new', 'accept', 'cancle', 'complete'
    table_no TEXT, -- 'table' field in code
    total_amount NUMERIC, -- calculated field in frontend, useful to store
    created_at TIMESTAMPTZ DEFAULT NOW(), -- 'timeStamp' in code
    customer_uid TEXT -- Optional: to link effectively to a central users table if needed
);

-- 6. Feedbacks (from 'feedbacks' collection)
-- Used in: CustomerRelation.js
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(user_id),
    order_id TEXT, -- Can be a foreign key if Types match
    customer_id TEXT,
    feedback_items JSONB, -- Array of feedback: [{itemName, rating, comment}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDICES for Performance (based on queries found)
CREATE INDEX IF NOT EXISTS idx_orders_store_timestamp ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_lookup ON public.feedbacks(store_id, order_id, customer_id);

-- NOTE: 
-- The 'menu', 'order_items', and 'feedback_items' are stored as JSONB. 
-- This allows your React app to continue working with the nested object structures 
-- it expects without rewriting the entire frontend logic to fetch user relational tables.
