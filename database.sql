-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    manager TEXT NOT NULL,
    hours TEXT DEFAULT 'Mon-Sun: 8:00 AM - 10:00 PM',
    status TEXT DEFAULT 'active',
    total_products INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    description TEXT,
    image TEXT,
    stock JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    location TEXT NOT NULL REFERENCES locations(id),
    status TEXT DEFAULT 'pending',
    delivery_type TEXT DEFAULT 'delivery',
    delivery_address TEXT,
    notes TEXT,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recent activities table
CREATE TABLE IF NOT EXISTS recent_activities (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGSERIAL PRIMARY KEY,
    store_name TEXT DEFAULT 'FreshMart',
    store_description TEXT DEFAULT 'Your trusted supermarket with multiple locations across Lagos.',
    business_hours TEXT DEFAULT 'Mon-Sun: 8:00 AM - 10:00 PM',
    currency TEXT DEFAULT 'NGN',
    default_language TEXT DEFAULT 'en',
    time_zone TEXT DEFAULT 'Africa/Lagos',
    auto_save_interval TEXT DEFAULT '30',
    base_delivery_fee TEXT DEFAULT '1500',
    free_delivery_threshold TEXT DEFAULT '25000',
    delivery_radius TEXT DEFAULT '15',
    delivery_time TEXT DEFAULT '30-60 minutes',
    pickup_time TEXT DEFAULT '15-30 minutes',
    scheduled_pickup BOOLEAN DEFAULT true,
    pickup_slots TEXT,
    low_stock_threshold TEXT DEFAULT '10',
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    notification_email TEXT DEFAULT 'admin@freshmart.ng',
    new_order_alerts BOOLEAN DEFAULT true,
    order_status_updates BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT true,
    default_whatsapp TEXT DEFAULT '+2348123456000',
    order_template TEXT,
    enable_whatsapp BOOLEAN DEFAULT true,
    payment_gateway TEXT DEFAULT 'none',
    payment_api_key TEXT,
    enable_online_payments BOOLEAN DEFAULT false,
    bank_details TEXT,
    session_timeout TEXT DEFAULT '60',
    auto_logout BOOLEAN DEFAULT true,
    remember_login BOOLEAN DEFAULT false,
    backup_frequency TEXT DEFAULT 'daily',
    data_retention TEXT DEFAULT '365',
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
    id BIGSERIAL PRIMARY KEY,
    backup_data JSONB NOT NULL,
    backup_type TEXT DEFAULT 'manual',
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    url TEXT,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGSERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health logs table
CREATE TABLE IF NOT EXISTS health_logs (
    id BIGSERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    response_time INTEGER,
    error_message TEXT,
    checks JSONB,
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    notifications JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_product_name ON order_items(product_name);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

-- Activity and log indexes
CREATE INDEX IF NOT EXISTS idx_recent_activities_created_at ON recent_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_health_logs_created_at ON health_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_last_sync ON settings(last_sync);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function to get top selling products
CREATE OR REPLACE FUNCTION get_top_selling_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
    product_name TEXT,
    total_quantity BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    GROUP BY oi.product_name
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get top products by quantity
CREATE OR REPLACE FUNCTION get_top_products()
RETURNS TABLE(product_name TEXT, total_quantity BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity
    FROM order_items oi
    GROUP BY oi.product_name
    ORDER BY total_quantity DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to safely update product stock
CREATE OR REPLACE FUNCTION update_product_stock_safe(
    product_id BIGINT,
    location_id TEXT,
    new_stock INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock JSONB;
BEGIN
    -- Get current stock
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_id;
    
    -- Update the specific location stock
    current_stock = COALESCE(current_stock, '{}'::jsonb) || jsonb_build_object(location_id, new_stock);
    
    -- Update the product
    UPDATE products
    SET stock = current_stock,
        updated_at = NOW()
    WHERE id = product_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products(threshold INTEGER DEFAULT 10)
RETURNS TABLE(
    product_id BIGINT,
    product_name TEXT,
    location_id TEXT,
    stock_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        l.id,
        COALESCE((p.stock->>l.id)::INTEGER, 0) as stock_level
    FROM products p
    CROSS JOIN locations l
    WHERE COALESCE((p.stock->>l.id)::INTEGER, 0) <= threshold
    AND COALESCE((p.stock->>l.id)::INTEGER, 0) > 0
    ORDER BY stock_level ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get out of stock products
CREATE OR REPLACE FUNCTION get_out_of_stock_products()
RETURNS TABLE(
    product_id BIGINT,
    product_name TEXT,
    location_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        l.id
    FROM products p
    CROSS JOIN locations l
    WHERE COALESCE((p.stock->>l.id)::INTEGER, 0) = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily sales summary
CREATE OR REPLACE FUNCTION get_daily_sales_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_orders BIGINT,
    total_revenue NUMERIC,
    average_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(AVG(o.total), 0) as average_order_value
    FROM orders o
    WHERE DATE(o.created_at) = target_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get orders by status count
CREATE OR REPLACE FUNCTION get_orders_by_status()
RETURNS TABLE(
    status TEXT,
    order_count BIGINT,
    total_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.status,
        COUNT(*) as order_count,
        COALESCE(SUM(o.total), 0) as total_value
    FROM orders o
    GROUP BY o.status
    ORDER BY order_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search across all entities
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE(
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    entity_details TEXT
) AS $$
BEGIN
    -- Search products
    RETURN QUERY
    SELECT 
        'product'::TEXT as entity_type,
        p.id::TEXT as entity_id,
        p.name as entity_name,
        p.description as entity_details
    FROM products p
    WHERE p.name ILIKE '%' || search_term || '%'
       OR p.description ILIKE '%' || search_term || '%'
       OR p.category ILIKE '%' || search_term || '%';
    
    -- Search orders
    RETURN QUERY
    SELECT 
        'order'::TEXT as entity_type,
        o.id::TEXT as entity_id,
        o.customer_name as entity_name,
        o.customer_phone as entity_details
    FROM orders o
    WHERE o.id::TEXT ILIKE '%' || search_term || '%'
       OR o.customer_name ILIKE '%' || search_term || '%'
       OR o.customer_phone ILIKE '%' || search_term || '%'
       OR o.customer_email ILIKE '%' || search_term || '%';
    
    -- Search locations
    RETURN QUERY
    SELECT 
        'location'::TEXT as entity_type,
        l.id as entity_id,
        l.name as entity_name,
        l.address as entity_details
    FROM locations l
    WHERE l.name ILIKE '%' || search_term || '%'
       OR l.address ILIKE '%' || search_term || '%'
       OR l.manager ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- Function to get inventory summary by location
CREATE OR REPLACE FUNCTION get_inventory_summary_by_location()
RETURNS TABLE(
    location_id TEXT,
    location_name TEXT,
    total_products BIGINT,
    total_stock BIGINT,
    low_stock_count BIGINT,
    out_of_stock_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        COUNT(p.id) as total_products,
        COALESCE(SUM(COALESCE((p.stock->>l.id)::INTEGER, 0)), 0) as total_stock,
        COUNT(CASE WHEN COALESCE((p.stock->>l.id)::INTEGER, 0) <= 10 AND COALESCE((p.stock->>l.id)::INTEGER, 0) > 0 THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN COALESCE((p.stock->>l.id)::INTEGER, 0) = 0 THEN 1 END) as out_of_stock_count
    FROM locations l
    CROSS JOIN products p
    WHERE p.stock ? l.id
    GROUP BY l.id, l.name
    ORDER BY l.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent orders with customer info
CREATE OR REPLACE FUNCTION get_recent_orders(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    order_id BIGINT,
	customer_name TEXT,
    customer_phone TEXT,
    location TEXT,
    total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    item_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_name,
        o.customer_phone,
        o.location,
        o.total,
        o.status,
        o.created_at,
        COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id, o.customer_name, o.customer_phone, o.location, o.total, o.status, o.created_at
    ORDER BY o.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search customers
CREATE OR REPLACE FUNCTION search_customers(search_term TEXT)
RETURNS TABLE(
    name TEXT,
    phone TEXT,
    email TEXT,
    orders BIGINT,
    total_spent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        COUNT(o.id) as orders,
        SUM(o.total) as total_spent
    FROM orders o
    WHERE 
        o.customer_name ILIKE '%' || search_term || '%' OR
        o.customer_phone ILIKE '%' || search_term || '%' OR
        o.customer_email ILIKE '%' || search_term || '%'
    GROUP BY o.customer_name, o.customer_phone, o.customer_email
    ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze customer segments
CREATE OR REPLACE FUNCTION analyze_customer_segments(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH customer_stats AS (
        SELECT 
            customer_name,
            COUNT(*) as order_count,
            SUM(total) as total_spent,
            AVG(total) as avg_order_value,
            MAX(created_at) as last_order_date
        FROM orders 
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY customer_name
    )
    SELECT jsonb_build_object(
        'vip', (SELECT jsonb_agg(row_to_json(cs)) FROM customer_stats cs WHERE total_spent > 50000),
        'regular', (SELECT jsonb_agg(row_to_json(cs)) FROM customer_stats cs WHERE total_spent BETWEEN 10000 AND 50000),
        'occasional', (SELECT jsonb_agg(row_to_json(cs)) FROM customer_stats cs WHERE total_spent < 10000)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze product performance
CREATE OR REPLACE FUNCTION analyze_product_performance(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS TABLE(
    product_name TEXT,
    total_quantity BIGINT,
    total_revenue NUMERIC,
    order_count BIGINT,
    avg_quantity_per_order NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue,
        COUNT(DISTINCT o.id) as order_count,
        AVG(oi.quantity) as avg_quantity_per_order
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at BETWEEN start_date AND end_date
    GROUP BY oi.product_name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze location performance
CREATE OR REPLACE FUNCTION analyze_location_performance(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS TABLE(
    location TEXT,
    order_count BIGINT,
    total_revenue NUMERIC,
    avg_order_value NUMERIC,
    delivery_orders BIGINT,
    pickup_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.location,
        COUNT(*) as order_count,
        SUM(o.total) as total_revenue,
        AVG(o.total) as avg_order_value,
        COUNT(*) FILTER (WHERE o.delivery_type = 'delivery') as delivery_orders,
        COUNT(*) FILTER (WHERE o.delivery_type = 'pickup') as pickup_orders
    FROM orders o
    WHERE o.created_at BETWEEN start_date AND end_date
    GROUP BY o.location
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate product velocity
CREATE OR REPLACE FUNCTION calculate_product_velocity(product_name TEXT, start_date TIMESTAMP)
RETURNS NUMERIC AS $$
DECLARE
    total_sold NUMERIC;
    days_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(oi.quantity), 0) INTO total_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_name = calculate_product_velocity.product_name
    AND o.created_at >= start_date;
    
    SELECT EXTRACT(DAY FROM NOW() - start_date) INTO days_count;
    
    IF days_count > 0 THEN
        RETURN total_sold / days_count;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate database size
CREATE OR REPLACE FUNCTION calculate_database_size()
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT;
BEGIN
    SELECT pg_database_size(current_database()) INTO total_size;
    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STOCK MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to remove location from stock
CREATE OR REPLACE FUNCTION remove_location_from_stock(location_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET stock = stock - location_id::text,
        updated_at = NOW()
    WHERE stock ? location_id::text;
END;
$$ LANGUAGE plpgsql;

-- Function to add location to all products
CREATE OR REPLACE FUNCTION add_location_to_all_products(location_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET stock = stock || jsonb_build_object(location_id, 0),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update location ID in stock
CREATE OR REPLACE FUNCTION update_location_id_in_stock(old_location_id TEXT, new_location_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET stock = (stock - old_location_id::text) || jsonb_build_object(new_location_id, COALESCE((stock->>old_location_id)::integer, 0)),
        updated_at = NOW()
    WHERE stock ? old_location_id::text;
END;
$$ LANGUAGE plpgsql;

-- Function for bulk stock updates
CREATE OR REPLACE FUNCTION bulk_update_stock(
    product_ids BIGINT[],
    locations TEXT[],
    update_type TEXT,
    stock_amount INTEGER
)
RETURNS VOID AS $$
DECLARE
    product_id BIGINT;
    location_name TEXT;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    FOREACH product_id IN ARRAY product_ids
    LOOP
        FOREACH location_name IN ARRAY locations
        LOOP
            SELECT COALESCE((stock->>location_name)::integer, 0) INTO current_stock
            FROM products WHERE id = product_id;
            
            CASE update_type
                WHEN 'add' THEN
                    new_stock := current_stock + stock_amount;
                WHEN 'subtract' THEN
                    new_stock := GREATEST(0, current_stock - stock_amount);
                WHEN 'set' THEN
                    new_stock := stock_amount;
                ELSE
                    new_stock := current_stock;
            END CASE;
            
            UPDATE products 
            SET stock = stock || jsonb_build_object(location_name, new_stock),
                updated_at = NOW()
            WHERE id = product_id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update location product counts
CREATE OR REPLACE FUNCTION update_location_product_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_products count for all locations when products change
    UPDATE locations 
    SET total_products = (
        SELECT COUNT(*)
        FROM products p
        WHERE p.stock ? locations.id
    ),
    updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for location product count
DROP TRIGGER IF EXISTS trigger_update_location_product_count ON products;
CREATE TRIGGER trigger_update_location_product_count
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_location_product_count();

-- Function to update location order counts
CREATE OR REPLACE FUNCTION update_location_order_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_orders count for the affected location
    IF TG_OP = 'DELETE' THEN
        UPDATE locations 
        SET total_orders = (
            SELECT COUNT(*)
            FROM orders
            WHERE location = OLD.location
        ),
        updated_at = NOW()
        WHERE id = OLD.location;
        RETURN OLD;
    ELSE
        UPDATE locations 
        SET total_orders = (
            SELECT COUNT(*)
            FROM orders
            WHERE location = NEW.location
        ),
        updated_at = NOW()
        WHERE id = NEW.location;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for location order count
DROP TRIGGER IF EXISTS trigger_update_location_order_count ON orders;
CREATE TRIGGER trigger_update_location_order_count
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_location_order_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_activities ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to read all data
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read orders" ON orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read order_items" ON order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read locations" ON locations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read recent_activities" ON recent_activities
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for authenticated users to modify data
CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify orders" ON orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify order_items" ON order_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify locations" ON locations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify settings" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to modify recent_activities" ON recent_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- User-specific policies
CREATE POLICY IF NOT EXISTS "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add check constraints
ALTER TABLE products ADD CONSTRAINT check_price_positive CHECK (price > 0);
ALTER TABLE products ADD CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0);

ALTER TABLE orders ADD CONSTRAINT check_total_positive CHECK (total > 0);
ALTER TABLE orders ADD CONSTRAINT check_customer_name_not_empty CHECK (length(trim(customer_name)) > 0);
ALTER TABLE orders ADD CONSTRAINT check_valid_status CHECK (status IN ('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'));
ALTER TABLE orders ADD CONSTRAINT check_valid_delivery_type CHECK (delivery_type IN ('delivery', 'pickup'));

ALTER TABLE order_items ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT check_item_price_positive CHECK (price > 0);

ALTER TABLE locations ADD CONSTRAINT check_location_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE locations ADD CONSTRAINT check_valid_location_status CHECK (status IN ('active', 'inactive', 'maintenance'));

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default settings if none exist
INSERT INTO settings (id) 
SELECT 1 
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Create default admin user role (if using custom roles)
-- Note: This would typically be handled through Supabase Auth dashboard

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- View for product stock summary
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.price,
        p.unit,
    jsonb_object_keys(p.stock) as location_id,
    (p.stock->>jsonb_object_keys(p.stock))::INTEGER as stock_quantity,
    CASE 
        WHEN (p.stock->>jsonb_object_keys(p.stock))::INTEGER = 0 THEN 'out_of_stock'
        WHEN (p.stock->>jsonb_object_keys(p.stock))::INTEGER <= 10 THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM products p,
     jsonb_object_keys(p.stock);

-- View for order summary with items
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.location,
    l.name as location_name,
    o.status,
    o.delivery_type,
    o.total,
    o.created_at,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN locations l ON o.location = l.id
GROUP BY o.id, o.customer_name, o.customer_phone, o.customer_email, 
         o.location, l.name, o.status, o.delivery_type, o.total, o.created_at;

-- View for location performance
CREATE OR REPLACE VIEW location_performance AS
SELECT 
    l.id,
    l.name,
    l.status,
    l.total_products,
    l.total_orders,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COALESCE(AVG(o.total), 0) as avg_order_value,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders
FROM locations l
LEFT JOIN orders o ON l.id = o.location
GROUP BY l.id, l.name, l.status, l.total_products, l.total_orders;

-- View for daily sales metrics
CREATE OR REPLACE VIEW daily_sales_metrics AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value,
    COUNT(CASE WHEN delivery_type = 'delivery' THEN 1 END) as delivery_orders,
    COUNT(CASE WHEN delivery_type = 'pickup' THEN 1 END) as pickup_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ============================================================================
-- ADDITIONAL UTILITY FUNCTIONS
-- ============================================================================

-- Function to get stock alerts
CREATE OR REPLACE FUNCTION get_stock_alerts()
RETURNS TABLE(
    alert_type TEXT,
    product_id BIGINT,
    product_name TEXT,
    location_id TEXT,
    location_name TEXT,
    current_stock INTEGER,
    threshold INTEGER
) AS $$
DECLARE
    low_stock_threshold INTEGER;
BEGIN
    -- Get threshold from settings
    SELECT COALESCE(s.low_stock_threshold::INTEGER, 10) INTO low_stock_threshold
    FROM settings s
    LIMIT 1;
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN COALESCE((p.stock->>l.id)::INTEGER, 0) = 0 THEN 'OUT_OF_STOCK'
            ELSE 'LOW_STOCK'
        END as alert_type,
        p.id,
        p.name,
        l.id,
        l.name,
        COALESCE((p.stock->>l.id)::INTEGER, 0) as current_stock,
        low_stock_threshold as threshold
    FROM products p
    CROSS JOIN locations l
    WHERE COALESCE((p.stock->>l.id)::INTEGER, 0) <= low_stock_threshold
    ORDER BY current_stock ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get sales trends
CREATE OR REPLACE FUNCTION get_sales_trends(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    trend_date DATE,
    daily_orders BIGINT,
    daily_revenue NUMERIC,
    cumulative_orders BIGINT,
    cumulative_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE(created_at) as sale_date,
            COUNT(*) as orders_count,
            SUM(total) as revenue
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
        GROUP BY DATE(created_at)
        ORDER BY sale_date
    )
    SELECT 
        ds.sale_date,
        ds.orders_count,
        ds.revenue,
        SUM(ds.orders_count) OVER (ORDER BY ds.sale_date) as cumulative_orders,
        SUM(ds.revenue) OVER (ORDER BY ds.sale_date) as cumulative_revenue
    FROM daily_stats ds;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer insights
CREATE OR REPLACE FUNCTION get_customer_insights()
RETURNS TABLE(
    customer_name TEXT,
    customer_phone TEXT,
    total_orders BIGINT,
    total_spent NUMERIC,
    avg_order_value NUMERIC,
    last_order_date TIMESTAMP WITH TIME ZONE,
    favorite_location TEXT,
    customer_segment TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_stats AS (
        SELECT 
            o.customer_name,
            o.customer_phone,
            COUNT(*) as order_count,
            SUM(o.total) as total_amount,
            AVG(o.total) as avg_amount,
            MAX(o.created_at) as last_order,
            MODE() WITHIN GROUP (ORDER BY o.location) as fav_location
        FROM orders o
        GROUP BY o.customer_name, o.customer_phone
    )
    SELECT 
        cs.customer_name,
        cs.customer_phone,
        cs.order_count,
        cs.total_amount,
        cs.avg_amount,
        cs.last_order,
        cs.fav_location,
        CASE 
            WHEN cs.total_amount > 50000 THEN 'VIP'
            WHEN cs.total_amount > 10000 THEN 'REGULAR'
            ELSE 'OCCASIONAL'
        END as segment
    FROM customer_stats cs
    ORDER BY cs.total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TEXT AS $$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
    result_message TEXT;
BEGIN
    -- Get retention period from settings
    SELECT COALESCE(s.data_retention::INTEGER, 365) INTO retention_days
    FROM settings s
    LIMIT 1;
    
    -- Delete old error logs
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '%s days' % retention_days;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := 'Deleted ' || deleted_count || ' old error logs. ';
    
    -- Delete old notification logs
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '%s days' % retention_days;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || 'Deleted ' || deleted_count || ' old notification logs. ';
    
    -- Delete old health logs (keep only last 1000)
    DELETE FROM health_logs 
    WHERE id NOT IN (
        SELECT id FROM health_logs 
        ORDER BY created_at DESC 
        LIMIT 1000
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || 'Deleted ' || deleted_count || ' old health logs. ';
    
    -- Delete old user activities (keep only last 6 months)
    DELETE FROM user_activities 
    WHERE created_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || 'Deleted ' || deleted_count || ' old user activities.';
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- Function to generate system report
CREATE OR REPLACE FUNCTION generate_system_report()
RETURNS JSONB AS $$
DECLARE
    report JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'database_size', pg_database_size(current_database()),
        'table_stats', (
            SELECT jsonb_object_agg(
                table_name,
                jsonb_build_object(
                    'row_count', row_count,
                    'size_bytes', pg_total_relation_size(table_name::regclass)
                )
            )
            FROM (
                SELECT 
                    schemaname||'.'||tablename as table_name,
                    n_tup_ins + n_tup_upd + n_tup_del as row_count
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
            ) t
        ),
        'performance_stats', (
            SELECT jsonb_build_object(
                'total_products', (SELECT COUNT(*) FROM products),
                'total_orders', (SELECT COUNT(*) FROM orders),
                'total_locations', (SELECT COUNT(*) FROM locations),
                'active_locations', (SELECT COUNT(*) FROM locations WHERE status = 'active'),
                'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
                'low_stock_items', (SELECT COUNT(*) FROM get_low_stock_products()),
                'out_of_stock_items', (SELECT COUNT(*) FROM get_out_of_stock_products())
            )
        ),
        'recent_activity', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'type', type,
                    'message', message,
                    'created_at', created_at
                )
            )
            FROM (
                SELECT type, message, created_at
                FROM recent_activities
                ORDER BY created_at DESC
                LIMIT 10
            ) ra
        )
    ) INTO report;
    
    RETURN report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULED MAINTENANCE (Optional - requires pg_cron extension)
-- ============================================================================

-- Note: These would require the pg_cron extension to be enabled
-- Uncomment and modify as needed

/*
-- Schedule daily cleanup at 2 AM
SELECT cron.schedule('daily-cleanup', '0 2 * * *', 'SELECT cleanup_old_data();');

-- Schedule weekly vacuum at 3 AM on Sundays
SELECT cron.schedule('weekly-vacuum', '0 3 * * 0', 'VACUUM ANALYZE;');

-- Schedule monthly statistics update at 4 AM on the 1st
SELECT cron.schedule('monthly-stats', '0 4 1 * *', 'ANALYZE;');
*/

-- ============================================================================
-- FINAL VALIDATION
-- ============================================================================

-- Validate all tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['products', 'orders', 'order_items', 'locations', 'settings', 
                           'recent_activities', 'backups', 'error_logs', 'notification_logs', 
                           'health_logs', 'user_activities', 'user_preferences', 'system_alerts'])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist successfully!';
    END IF;
END $$;

-- Validate all functions exist
DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_name TEXT;
BEGIN
    FOR function_name IN 
        SELECT unnest(ARRAY['get_top_selling_products', 'get_low_stock_products', 'get_out_of_stock_products',
                           'search_customers', 'analyze_customer_segments', 'calculate_product_velocity',
                           'bulk_update_stock', 'cleanup_old_data', 'generate_system_report'])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = function_name AND routine_schema = 'public') THEN
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE EXCEPTION 'Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE 'All required functions exist successfully!';
    END IF;
END $$;

RAISE NOTICE 'FreshMart database schema setup completed successfully! 🎉';
    

-- ============================================================================
-- ADDITIONAL FOR FRONTEND
-- ============================================================================

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance logs table
CREATE TABLE IF NOT EXISTS performance_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metrics JSONB NOT NULL,
    user_agent TEXT,
    viewport TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON performance_logs(created_at);

-- RLS Policies
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist" ON wishlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reviews" ON product_reviews
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read reviews" ON product_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own notifications" ON user_notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING (auth.uid() = id);
	
-- Customers table (phone as primary identifier)
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    last_order_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    label TEXT DEFAULT 'Home',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update orders table to reference customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- RPC function to get customer statistics
CREATE OR REPLACE FUNCTION get_customer_stats(customer_phone TEXT)
RETURNS TABLE(
    total_orders BIGINT,
    total_spent NUMERIC,
    average_order NUMERIC,
    last_order_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as total_spent,
        COALESCE(AVG(o.total), 0) as average_order,
        MAX(o.created_at) as last_order_date
    FROM orders o
    WHERE o.customer_phone = customer_phone;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer last_order_date when new order is created
CREATE OR REPLACE FUNCTION update_customer_last_order()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET last_order_date = NEW.created_at,
        updated_at = NOW()
    WHERE phone = NEW.customer_phone;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_last_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_last_order();

-- RLS policies for customer data
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Allow public read access for customer lookup (since we're using phone-based identification)
CREATE POLICY "Allow public customer lookup" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Allow public customer upsert" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public customer update" ON customers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public address access" ON customer_addresses
    FOR ALL USING (true);
	

