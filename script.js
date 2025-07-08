// Supabase Configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aydlkdolxygxhmtdxins.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5ZGxrZG9seHlneGhtdGR4aW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjY5NzMsImV4cCI6MjA2NzU0Mjk3M30.obBDqpr6K40VcQUPkh03ftDXsgIM9X6CDRgZ2hUZrGM'
const supabase = createClient(supabaseUrl, supabaseKey)

// Global Variables (updated)
let products = [];
let cart = [];
let selectedLocation = '';
let isDeliveryMode = false;
let deliveryFee = 1500;
let freeDeliveryThreshold = 25000;
let currentPage = 1;
let itemsPerPage = 12;
let isLoading = false;
let currentUser = null;
let realtimeSubscription = null;

// Initialize the application with Supabase
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication status
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = user;
        
        // Load initial data from Supabase
        await loadProductsFromSupabase();
        await loadLocationsFromSupabase();
        await loadSettingsFromSupabase();
        
        // Load user preferences
        loadCartFromStorage();
        loadUserPreferences();
        
        // Setup event listeners
        initializeEventListeners();
        
        // Start real-time subscriptions
        startRealtimeSubscriptions();
        
        // Initialize UI
        updateCartDisplay();
        displayProducts();
        updateQuickCartCount();
        
        // Track page load
        await trackEvent('page_load', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        console.log('🛒 FreshMart Customer App Initialized with Supabase');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error loading app. Please refresh the page.', 'error');
    }
}

// Load products from Supabase
async function loadProductsFromSupabase() {
    try {
        showLoadingOverlay();
        
        const { data: productsData, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        products = productsData.map(product => ({
            ...product,
            popularity: product.popularity || Math.floor(Math.random() * 100)
        }));
        
        hideLoadingOverlay();
        showNotification('Products loaded successfully', 'success');
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
        
        // Fallback to sample data
        products = [...sampleProducts];
    }
}

// Load locations from Supabase
async function loadLocationsFromSupabase() {
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .eq('status', 'active')
            .order('name');
        
        if (error) throw error;
        
        // Update location selector
        const locationSelect = document.getElementById('locationSelect');
        if (locationSelect) {
            locationSelect.innerHTML = '<option value="">Select a location</option>' +
                locations.map(location => 
                    `<option value="${location.id}">${location.name}</option>`
                ).join('');
        }
        
        // Update global locationData
        locations.forEach(location => {
            locationData[location.id] = {
                name: location.name,
                address: location.address,
                phone: location.phone,
                hours: location.hours,
                manager: location.manager
            };
        });
        
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Load settings from Supabase
async function loadSettingsFromSupabase() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        
        if (settings && settings.length > 0) {
            const setting = settings[0];
            deliveryFee = parseInt(setting.base_delivery_fee) || 1500;
            freeDeliveryThreshold = parseInt(setting.free_delivery_threshold) || 25000;
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Start real-time subscriptions
function startRealtimeSubscriptions() {
    // Subscribe to product changes
    realtimeSubscription = supabase
        .channel('product_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' },
            async (payload) => {
                console.log('Product change detected:', payload);
                await handleProductChange(payload);
            }
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'locations' },
            async (payload) => {
                console.log('Location change detected:', payload);
                await handleLocationChange(payload);
            }
        )
        .subscribe();
}

// Handle real-time product changes
async function handleProductChange(payload) {
    if (payload.eventType === 'UPDATE') {
        const updatedProduct = payload.new;
        const index = products.findIndex(p => p.id === updatedProduct.id);
        
        if (index !== -1) {
            products[index] = { ...updatedProduct, popularity: products[index].popularity };
            displayProducts();
            updateProductsStats();
            showNotification('Product updated', 'info');
        }
    } else if (payload.eventType === 'INSERT') {
        const newProduct = payload.new;
        products.push({ ...newProduct, popularity: Math.floor(Math.random() * 100) });
        displayProducts();
        updateProductsStats();
        showNotification('New product available', 'info');
    } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        products = products.filter(p => p.id !== deletedId);
        displayProducts();
        updateProductsStats();
        showNotification('Product removed', 'info');
    }
}

// Enhanced checkout with Supabase order storage
async function handleCheckoutSubmission(event) {
    event.preventDefault();
    
    try {
        // Validate form
        const customerName = document.getElementById('customerName')?.value;
        const customerPhone = document.getElementById('customerPhone')?.value;
        const customerEmail = document.getElementById('customerEmail')?.value;
        
        if (!customerName || !customerPhone) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!isValidPhoneNumber(customerPhone)) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }
        
        if (customerEmail && !isValidEmail(customerEmail)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        showLoadingOverlay();
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentDeliveryFee = isDeliveryMode && subtotal < freeDeliveryThreshold ? deliveryFee : 0;
        const total = subtotal + currentDeliveryFee;
        
        // Prepare order data
        const orderData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            location: selectedLocation,
            status: 'pending',
            delivery_type: isDeliveryMode ? 'delivery' : 'pickup',
            delivery_address: isDeliveryMode ? document.getElementById('deliveryAddress')?.value : null,
            notes: isDeliveryMode ? 
                document.getElementById('deliveryInstructions')?.value : 
                document.getElementById('pickupNotes')?.value,
            total: total
        };
        
        // Insert order into Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        // Insert order items
        const orderItems = cart.map(item => ({
            order_id: order.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price
        }));
        
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
        
        if (itemsError) throw itemsError;
        
        // Update product stock
        await updateProductStock();
        
        // Generate WhatsApp message
        const whatsappMessage = generateWhatsAppMessage(order, orderItems);
        const locationInfo = locationData[selectedLocation];
        const whatsappNumber = locationInfo.phone.replace('+', '');
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        
        // Track order completion
        await trackEvent('order_completed', {
            orderId: order.id,
            customerName: customerName,
            customerPhone: customerPhone,
            location: selectedLocation,
            deliveryType: isDeliveryMode ? 'delivery' : 'pickup',
            itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
            orderValue: total,
            timestamp: new Date().toISOString()
        });
        
        hideLoadingOverlay();
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Clear cart and close modals
        cart = [];
        updateCartDisplay();
        updateQuickCartCount();
        displayProducts();
        closeCheckoutForm();
        toggleCart();
        saveCartToStorage();
        
        showNotification(`Order #${order.id} placed successfully! Check WhatsApp for confirmation.`, 'success');
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error submitting order:', error);
        showNotification('Error placing order. Please try again.', 'error');
    }
}

// Update product stock after order
async function updateProductStock() {
    try {
        for (const item of cart) {
            const product = products.find(p => p.name === item.name);
            if (product && product.stock && product.stock[selectedLocation]) {
                const currentStock = product.stock[selectedLocation];
                const newStock = Math.max(0, currentStock - item.quantity);
                
                // Update stock in Supabase
                const updatedStock = { ...product.stock, [selectedLocation]: newStock };
                
                const { error } = await supabase
                    .from('products')
                    .update({ 
                        stock: updatedStock,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', product.id);
                
                if (error) throw error;
                
                // Update local product data
                product.stock[selectedLocation] = newStock;
            }
        }
    } catch (error) {
        console.error('Error updating product stock:', error);
    }
}

// Generate WhatsApp message
function generateWhatsAppMessage(order, orderItems) {
    let message = `Hello! I'd like to place an order:\n\n`;
    message += `*Order #${order.id}*\n\n`;
    message += `*Customer Information:*\n`;
    message += `Name: ${order.customer_name}\n`;
    message += `Phone: ${order.customer_phone}\n`;
    if (order.customer_email) message += `Email: ${order.customer_email}\n`;
    
    if (order.delivery_type === 'delivery') {
        message += `\n*Delivery Details:*\n`;
        message += `Address: ${order.delivery_address}\n`;
        if (order.notes) message += `Instructions: ${order.notes}\n`;
    } else {
        const locationInfo = locationData[selectedLocation];
        message += `\n*Pickup Details:*\n`;
        message += `Location: ${locationInfo.name}\n`;
        message += `Address: ${locationInfo.address}\n`;
        if (order.notes) message += `Notes: ${order.notes}\n`;
    }
    
    message += `\n*Order Items:*\n`;
    orderItems.forEach(item => {
        message += `• ${item.product_name} - ${item.quantity} @ ₦${item.price.toLocaleString()} each\n`;
    });
    
    message += `\n*Order Summary:*\n`;
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const deliveryFeeAmount = order.delivery_type === 'delivery' && subtotal < freeDeliveryThreshold ? deliveryFee : 0;
    
    message += `Subtotal: ₦${subtotal.toLocaleString()}\n`;
    message += `${order.delivery_type === 'delivery' ? 'Delivery Fee' : 'Pickup'}: ${order.delivery_type === 'delivery' ? '₦' + deliveryFeeAmount.toLocaleString() : 'FREE'}\n`;
    message += `*Total: ₦${order.total.toLocaleString()}*\n\n`;
    message += `Order Date: ${new Date(order.created_at).toLocaleDateString()}\n`;
    message += `Please confirm availability and processing time. Thank you!`;
    
    return message;
}

// Enhanced search with Supabase
async function searchProducts(searchTerm) {
    try {
        if (!searchTerm.trim()) {
            await loadProductsFromSupabase();
            return;
        }
        
        const { data: searchResults, error } = await supabase
            .from('products')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
            .order('name');
        
        if (error) throw error;
        
        products = searchResults.map(product => ({
            ...product,
            popularity: product.popularity || Math.floor(Math.random() * 100)
        }));
        
        displayProducts();
        updateProductsStats();
        
    } catch (error) {
        console.error('Error searching products:', error);
        showNotification('Error searching products', 'error');
    }
}

// User authentication functions
async function signUpUser(email, password, userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: userData
            }
        });
        
        if (error) throw error;
        
        showNotification('Account created successfully! Please check your email for verification.', 'success');
        return data;
        
    } catch (error) {
        console.error('Error signing up:', error);
        showNotification('Error creating account: ' + error.message, 'error');
                throw error;
    }
}

async function signInUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        showNotification('Signed in successfully!', 'success');
        
        // Load user-specific data
        await loadUserOrderHistory();
        await loadUserPreferences();
        
        return data;
        
    } catch (error) {
        console.error('Error signing in:', error);
        showNotification('Error signing in: ' + error.message, 'error');
        throw error;
    }
}

async function signOutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        currentUser = null;
        showNotification('Signed out successfully', 'success');
        
        // Clear user-specific data
        clearUserData();
        
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error signing out', 'error');
    }
}

// Load user order history
async function loadUserOrderHistory() {
    if (!currentUser) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    quantity,
                    price
                )
            `)
            .eq('customer_email', currentUser.email)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        displayUserOrderHistory(orders);
        
    } catch (error) {
        console.error('Error loading order history:', error);
    }
}

// Display user order history
function displayUserOrderHistory(orders) {
    const orderHistoryContainer = document.getElementById('orderHistory');
    if (!orderHistoryContainer) return;
    
    if (orders.length === 0) {
        orderHistoryContainer.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-bag"></i>
                <h3>No Orders Yet</h3>
                <p>Start shopping to see your order history here.</p>
            </div>
        `;
        return;
    }
    
    orderHistoryContainer.innerHTML = orders.map(order => `
        <div class="order-history-item">
            <div class="order-header">
                <div class="order-id">Order #${order.id}</div>
                <div class="order-status status-${order.status}">${order.status}</div>
            </div>
            <div class="order-details">
                <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
                <div class="order-location">${locationData[order.location]?.name || order.location}</div>
                <div class="order-type">${order.delivery_type}</div>
                <div class="order-total">₦${order.total.toLocaleString()}</div>
            </div>
            <div class="order-items">
                ${order.order_items.map(item => `
                    <div class="order-item">
                        ${item.quantity}x ${item.product_name}
                    </div>
                `).join('')}
            </div>
            <div class="order-actions">
                <button class="btn-reorder" onclick="reorderItems(${order.id})">
                    <i class="fas fa-redo"></i> Reorder
                </button>
                <button class="btn-track" onclick="trackOrder(${order.id})">
                    <i class="fas fa-map-marker-alt"></i> Track
                </button>
            </div>
        </div>
    `).join('');
}

// Reorder functionality
async function reorderItems(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    quantity,
                    price
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        // Clear current cart
        cart = [];
        
        // Add items to cart if they're still available
        for (const item of order.order_items) {
            const product = products.find(p => p.name === item.product_name);
            if (product) {
                const availableStock = product.stock[order.location] || 0;
                const quantityToAdd = Math.min(item.quantity, availableStock);
                
                if (quantityToAdd > 0) {
                    cart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price, // Use current price
                        unit: product.unit,
                        quantity: quantityToAdd,
                        location: order.location
                    });
                }
            }
        }
        
        // Set location
        selectedLocation = order.location;
        const locationSelect = document.getElementById('locationSelect');
        if (locationSelect) {
            locationSelect.value = selectedLocation;
            locationSelect.dispatchEvent(new Event('change'));
        }
        
        // Update UI
        updateCartDisplay();
        updateQuickCartCount();
        displayProducts();
        saveCartToStorage();
        
        showNotification('Items added to cart from previous order', 'success');
        
        // Show cart
        toggleCart();
        
    } catch (error) {
        console.error('Error reordering:', error);
        showNotification('Error reordering items', 'error');
    }
}

// Track order functionality
async function trackOrder(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    quantity,
                    price
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        showOrderTrackingModal(order);
        
    } catch (error) {
        console.error('Error tracking order:', error);
        showNotification('Error loading order details', 'error');
    }
}

// Show order tracking modal
function showOrderTrackingModal(order) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-map-marker-alt"></i> Track Order #${order.id}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="order-tracking">
                    <div class="tracking-status">
                        <div class="status-item ${order.status === 'pending' ? 'active' : order.status !== 'pending' ? 'completed' : ''}">
                            <div class="status-icon"><i class="fas fa-clock"></i></div>
                            <div class="status-text">Order Placed</div>
                        </div>
                        <div class="status-item ${order.status === 'confirmed' ? 'active' : ['processing', 'ready', 'delivered'].includes(order.status) ? 'completed' : ''}">
                            <div class="status-icon"><i class="fas fa-check"></i></div>
                            <div class="status-text">Confirmed</div>
                        </div>
                        <div class="status-item ${order.status === 'processing' ? 'active' : ['ready', 'delivered'].includes(order.status) ? 'completed' : ''}">
                            <div class="status-icon"><i class="fas fa-cog"></i></div>
                            <div class="status-text">Processing</div>
                        </div>
                        <div class="status-item ${order.status === 'ready' ? 'active' : order.status === 'delivered' ? 'completed' : ''}">
                            <div class="status-icon"><i class="fas fa-box"></i></div>
                            <div class="status-text">Ready</div>
                        </div>
                        <div class="status-item ${order.status === 'delivered' ? 'active completed' : ''}">
                            <div class="status-icon"><i class="fas fa-truck"></i></div>
                            <div class="status-text">${order.delivery_type === 'delivery' ? 'Delivered' : 'Picked Up'}</div>
                        </div>
                    </div>
                    
                    <div class="order-details-tracking">
                        <h4>Order Details</h4>
                        <div class="detail-row">
                            <span>Order Date:</span>
                            <span>${new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Location:</span>
                            <span>${locationData[order.location]?.name || order.location}</span>
                        </div>
                        <div class="detail-row">
                            <span>Type:</span>
                            <span>${order.delivery_type}</span>
                        </div>
                        <div class="detail-row">
                            <span>Total:</span>
                            <span>₦${order.total.toLocaleString()}</span>
                        </div>
                        
                        <h4>Items</h4>
                        <div class="order-items-tracking">
                            ${order.order_items.map(item => `
                                <div class="item-row">
                                    <span>${item.quantity}x ${item.product_name}</span>
                                    <span>₦${(item.quantity * item.price).toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Enhanced analytics with Supabase
async function trackEvent(eventName, eventData) {
    try {
        // Store events in Supabase
        const { error } = await supabase
            .from('user_activities')
            .insert([{
                user_id: currentUser?.id,
                activity_type: eventName,
                metadata: eventData
            }]);
        
        if (error) throw error;
        
        // Also store locally as backup
        const events = JSON.parse(localStorage.getItem('freshmart_analytics') || '[]');
        events.push({
            event: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId(),
            synced: true
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('freshmart_analytics', JSON.stringify(events));
        
    } catch (error) {
        console.error('Error tracking event:', error);
        
        // Store locally if Supabase fails
        const events = JSON.parse(localStorage.getItem('freshmart_analytics') || '[]');
        events.push({
            event: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId(),
            synced: false
        });
        
        localStorage.setItem('freshmart_analytics', JSON.stringify(events));
    }
}

// Sync offline events when back online
async function syncOfflineEvents() {
    try {
        const events = JSON.parse(localStorage.getItem('freshmart_analytics') || '[]');
        const unsyncedEvents = events.filter(event => !event.synced);
        
        if (unsyncedEvents.length === 0) return;
        
        for (const event of unsyncedEvents) {
            await supabase
                .from('user_activities')
                .insert([{
                    user_id: currentUser?.id,
                    activity_type: event.event,
                    metadata: event.data,
                    created_at: event.timestamp
                }]);
            
            event.synced = true;
        }
        
        localStorage.setItem('freshmart_analytics', JSON.stringify(events));
        console.log(`Synced ${unsyncedEvents.length} offline events`);
        
    } catch (error) {
        console.error('Error syncing offline events:', error);
    }
}

// Enhanced offline handling
function handleOnline() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) {
        offlineIndicator.style.display = 'none';
    }
    
    showNotification('Connection restored', 'success');
    
    // Restart real-time subscriptions
    if (!realtimeSubscription) {
        startRealtimeSubscriptions();
    }
    
    // Sync offline data
    syncOfflineEvents();
    
    // Refresh data
    refreshProductData();
}

function handleOffline() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) {
        offlineIndicator.style.display = 'block';
    }
    
    showNotification('You are now offline. Some features may not work.', 'warning');
    
    // Stop real-time subscriptions
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
}

// Enhanced refresh with Supabase
async function refreshProductData() {
    try {
        showLoadingOverlay();
        
        await Promise.all([
            loadProductsFromSupabase(),
            loadLocationsFromSupabase(),
            loadSettingsFromSupabase()
        ]);
        
        displayProducts();
        updateProductsStats();
        
        hideLoadingOverlay();
        showNotification('Data refreshed successfully', 'success');
        
        // Track refresh action
        await trackEvent('manual_refresh', {
            timestamp: new Date().toISOString(),
            location: selectedLocation
        });
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error refreshing data:', error);
        showNotification('Error refreshing data', 'error');
    }
}

// User preferences with Supabase
async function saveUserPreferences(preferences) {
    if (!currentUser) {
        // Save locally if not authenticated
        localStorage.setItem('freshmart_preferences', JSON.stringify(preferences));
        return;
    }
    
    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: currentUser.id,
                ...preferences,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error saving preferences:', error);
        // Fallback to localStorage
        localStorage.setItem('freshmart_preferences', JSON.stringify(preferences));
    }
}

async function loadUserPreferences() {
    try {
        if (currentUser) {
            const { data: preferences, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
            
            if (!error && preferences) {
                applyUserPreferences(preferences);
                return;
            }
        }
        
        // Fallback to localStorage
        const savedPrefs = localStorage.getItem('freshmart_preferences');
        if (savedPrefs) {
                        const preferences = JSON.parse(savedPrefs);
            applyUserPreferences(preferences);
        }
        
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

function applyUserPreferences(preferences) {
    // Apply theme
    if (preferences.theme) {
        document.documentElement.setAttribute('data-theme', preferences.theme);
        const themeIcon = document.querySelector('.theme-toggle-footer i');
        if (themeIcon) {
            themeIcon.className = preferences.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    // Apply language
    if (preferences.language) {
        // Implement language switching logic here
        console.log('Language preference:', preferences.language);
    }
    
    // Apply notification preferences
    if (preferences.notifications) {
        // Apply notification settings
        console.log('Notification preferences:', preferences.notifications);
    }
}

// Clear user data on sign out
function clearUserData() {
    // Clear order history
    const orderHistoryContainer = document.getElementById('orderHistory');
    if (orderHistoryContainer) {
        orderHistoryContainer.innerHTML = '';
    }
    
    // Clear any user-specific UI elements
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.innerHTML = '';
    }
}

// Enhanced search functionality
async function performAdvancedSearch(searchTerm, filters = {}) {
    try {
        let query = supabase.from('products').select('*');
        
        // Apply search term
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
        }
        
        // Apply category filter
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        
        // Apply price range filter
        if (filters.minPrice) {
            query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
            query = query.lte('price', filters.maxPrice);
        }
        
        // Apply availability filter
        if (filters.availability && selectedLocation) {
            // This would require a more complex query or RPC function
            // For now, we'll filter client-side after getting results
        }
        
        // Apply sorting
        switch (filters.sort) {
            case 'price-low':
                query = query.order('price', { ascending: true });
                break;
            case 'price-high':
                query = query.order('price', { ascending: false });
                break;
            case 'name':
            default:
                query = query.order('name');
                break;
        }
        
        const { data: searchResults, error } = await query;
        
        if (error) throw error;
        
        // Apply client-side availability filter if needed
        let filteredResults = searchResults;
        if (filters.availability && selectedLocation) {
            filteredResults = searchResults.filter(product => {
                const stock = product.stock[selectedLocation] || 0;
                switch (filters.availability) {
                    case 'in-stock':
                        return stock > 10;
                    case 'low-stock':
                        return stock > 0 && stock <= 10;
                    case 'out-of-stock':
                        return stock === 0;
                    default:
                        return true;
                }
            });
        }
        
        products = filteredResults.map(product => ({
            ...product,
            popularity: product.popularity || Math.floor(Math.random() * 100)
        }));
        
        displayProducts();
        updateProductsStats();
        
        return filteredResults;
        
    } catch (error) {
        console.error('Error performing advanced search:', error);
        showNotification('Error searching products', 'error');
        return [];
    }
}

// Wishlist functionality with Supabase
async function addToWishlist(productId) {
    if (!currentUser) {
        showNotification('Please sign in to add items to wishlist', 'warning');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('wishlists')
            .insert([{
                user_id: currentUser.id,
                product_id: productId
            }]);
        
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                showNotification('Item already in wishlist', 'info');
            } else {
                throw error;
            }
        } else {
            showNotification('Added to wishlist', 'success');
            updateWishlistUI(productId, true);
        }
        
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showNotification('Error adding to wishlist', 'error');
    }
}

async function removeFromWishlist(productId) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);
        
        if (error) throw error;
        
        showNotification('Removed from wishlist', 'success');
        updateWishlistUI(productId, false);
        
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showNotification('Error removing from wishlist', 'error');
    }
}

async function loadUserWishlist() {
    if (!currentUser) return [];
    
    try {
        const { data: wishlist, error } = await supabase
            .from('wishlists')
            .select(`
                product_id,
                products (*)
            `)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        return wishlist.map(item => item.products);
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        return [];
    }
}

function updateWishlistUI(productId, isInWishlist) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (productCard) {
        const wishlistBtn = productCard.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.classList.toggle('active', isInWishlist);
            wishlistBtn.innerHTML = isInWishlist ? 
                '<i class="fas fa-heart"></i>' : 
                '<i class="far fa-heart"></i>';
        }
    }
}

// Product reviews functionality
async function addProductReview(productId, rating, comment) {
    if (!currentUser) {
        showNotification('Please sign in to add reviews', 'warning');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('product_reviews')
            .insert([{
                user_id: currentUser.id,
                product_id: productId,
                rating: rating,
                comment: comment
            }]);
        
        if (error) throw error;
        
        showNotification('Review added successfully', 'success');
        await loadProductReviews(productId);
        
    } catch (error) {
        console.error('Error adding review:', error);
        showNotification('Error adding review', 'error');
    }
}

async function loadProductReviews(productId) {
    try {
        const { data: reviews, error } = await supabase
            .from('product_reviews')
            .select(`
                *,
                profiles (full_name)
            `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return reviews;
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        return [];
    }
}

// Enhanced product card with reviews and wishlist
function createEnhancedProductCard(product, index) {
    const stock = product.stock[selectedLocation] || 0;
    const stockStatus = getStockStatus(stock);
    const isInCart = cart.find(item => item.id === product.id);
    const cartQuantity = isInCart ? isInCart.quantity : 0;
    
    return `
        <div class="product-card fade-in" data-product-id="${product.id}" style="animation-delay: ${index * 0.1}s">
            <div class="product-image">
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" loading="lazy">` :
                    `<i class="fas ${getProductIcon(product.category)}"></i>`
                }
                <div class="stock-badge ${stockStatus.class}">${stockStatus.text}</div>
                ${currentUser ? `
                    <button class="wishlist-btn" onclick="toggleWishlist(${product.id})" title="Add to wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                ` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <div class="product-rating">
                    <div class="stars">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="far fa-star"></i>
                    </div>
                    <span class="rating-count">(${Math.floor(Math.random() * 50) + 1})</span>
                </div>
                <div class="product-price">₦${product.price.toLocaleString()}/${product.unit}</div>
                <div class="product-stock">
                    <i class="fas fa-warehouse"></i>
                    Stock: ${stock} ${product.unit}${stock !== 1 ? 's' : ''}
                </div>
                
                ${stock > 0 ? `
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${product.id}, -1)" 
                                ${cartQuantity <= 0 ? 'disabled' : ''} 
                                title="Decrease quantity">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${cartQuantity}" 
                               min="0" max="${stock}" 
                               onchange="setQuantity(${product.id}, this.value)"
                               title="Quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${product.id}, 1)" 
                                ${cartQuantity >= stock ? 'disabled' : ''} 
                                title="Increase quantity">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})" 
                            ${stock <= 0 ? 'disabled' : ''} 
                            title="Add to cart">
                        <i class="fas fa-cart-plus"></i>
                        Add to Cart
                    </button>
                ` : `
                    <button class="add-to-cart-btn" disabled title="Out of stock">
                        <i class="fas fa-times"></i>
                        Out of Stock
                    </button>
                `}
                
                <button class="product-details-btn" onclick="showProductDetails(${product.id})" title="View details">
                    <i class="fas fa-info-circle"></i>
                    Details
                </button>
            </div>
        </div>
    `;
}

// Product details modal
async function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
        // Load reviews
        const reviews = await loadProductReviews(productId);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content product-details-modal">
                <div class="modal-header">
                    <h3>${product.name}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="product-details-content">
                        <div class="product-image-large">
                            ${product.image ? 
                                `<img src="${product.image}" alt="${product.name}">` :
                                `<i class="fas ${getProductIcon(product.category)}"></i>`
                            }
                        </div>
                        <div class="product-info-detailed">
                            <div class="product-category-badge">${product.category}</div>
                            <h2>${product.name}</h2>
                            <div class="product-price-large">₦${product.price.toLocaleString()}/${product.unit}</div>
                            <p class="product-description">${product.description}</p>
                            
                            <div class="stock-info">
                                <h4>Stock Availability</h4>
                                ${Object.entries(product.stock).map(([locationId, stock]) => `
                                    <div class="stock-location">
                                        <span>${locationData[locationId]?.name || locationId}:</span>
                                        <span class="stock-amount ${stock > 10 ? 'high' : stock > 0 ? 'low' : 'out'}">${stock} units</span>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="product-actions">
                                ${currentUser ? `
                                    <button class="btn-wishlist" onclick="toggleWishlist(${product.id})">
                                        <i class="far fa-heart"></i> Add to Wishlist
                                    </button>
                                ` : ''}
                                <button class="btn-add-cart" onclick="addToCart(${product.id}); this.closest('.modal').remove();">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-reviews">
                        <h4>Customer Reviews</h4>
                        ${currentUser ? `
                            <div class="add-review">
                                <h5>Add Your Review</h5>
                                <div class="rating-input">
                                    <span>Rating:</span>
                                    <div class="stars-input" data-rating="0">
                                        ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}"></i>`).join('')}
                                    </div>
                                </div>
                                <textarea placeholder="Write your review..." id="reviewComment"></textarea>
                                <button onclick="submitReview(${product.id})">Submit Review</button>
                            </div>
                        ` : ''}
                        
                        <div class="reviews-list">
                            ${reviews.length > 0 ? reviews.map(review => `
                                <div class="review-item">
                                    <div class="review-header">
                                        <span class="reviewer-name">${review.profiles?.full_name || 'Anonymous'}</span>
                                        <div class="review-rating">
                                            ${[1,2,3,4,5].map(i => `
                                                                                                <i class="fas fa-star ${i <= review.rating ? 'active' : ''}"></i>
                                            `).join('')}
                                        </div>
                                        <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p class="review-comment">${review.comment}</p>
                                </div>
                            `).join('') : '<p class="no-reviews">No reviews yet. Be the first to review!</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add star rating functionality
        const starsInput = modal.querySelector('.stars-input');
        if (starsInput) {
            const stars = starsInput.querySelectorAll('i');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    const rating = index + 1;
                    starsInput.dataset.rating = rating;
                    stars.forEach((s, i) => {
                        s.className = i < rating ? 'fas fa-star' : 'far fa-star';
                    });
                });
            });
        }
        
    } catch (error) {
        console.error('Error showing product details:', error);
        showNotification('Error loading product details', 'error');
    }
}

// Submit product review
async function submitReview(productId) {
    const rating = parseInt(document.querySelector('.stars-input').dataset.rating);
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (rating === 0) {
        showNotification('Please select a rating', 'warning');
        return;
    }
    
    if (!comment) {
        showNotification('Please write a review comment', 'warning');
        return;
    }
    
    await addProductReview(productId, rating, comment);
    
    // Close modal and refresh
    document.querySelector('.modal').remove();
    showProductDetails(productId);
}

// Toggle wishlist
async function toggleWishlist(productId) {
    if (!currentUser) {
        showNotification('Please sign in to use wishlist', 'warning');
        return;
    }
    
    const wishlistBtn = document.querySelector(`[data-product-id="${productId}"] .wishlist-btn`);
    const isActive = wishlistBtn?.classList.contains('active');
    
    if (isActive) {
        await removeFromWishlist(productId);
    } else {
        await addToWishlist(productId);
    }
}

// Enhanced notification system with persistence
async function showPersistentNotification(message, type = 'info', persistent = false) {
    // Show regular notification
    showNotification(message, type);
    
    // Store persistent notifications in Supabase if user is logged in
    if (persistent && currentUser) {
        try {
            await supabase
                .from('user_notifications')
                .insert([{
                    user_id: currentUser.id,
                    message: message,
                    type: type,
                    read: false
                }]);
        } catch (error) {
            console.error('Error storing notification:', error);
        }
    }
}

// Load user notifications
async function loadUserNotifications() {
    if (!currentUser) return [];
    
    try {
        const { data: notifications, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('read', false)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return notifications;
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        return [];
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await supabase
            .from('user_notifications')
            .update({ read: true })
            .eq('id', notificationId);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Enhanced error handling with Supabase logging
async function logError(error, context = '') {
    try {
        await supabase
            .from('error_logs')
            .insert([{
                error_message: error.message,
                error_stack: error.stack,
                url: window.location.href,
                user_agent: navigator.userAgent,
                user_id: currentUser?.id,
                context: context
            }]);
    } catch (logError) {
        console.error('Failed to log error to database:', logError);
    }
    
    // Also track locally
    trackEvent('javascript_error', {
        message: error.message,
        context: context,
        timestamp: new Date().toISOString()
    });
}

// Enhanced error handling setup
function setupEnhancedErrorHandling() {
    window.addEventListener('error', async (event) => {
        console.error('Global error:', event.error);
        await logError(event.error, 'Global error handler');
        showNotification('An error occurred. Please refresh the page if problems persist.', 'error');
    });
    
    window.addEventListener('unhandledrejection', async (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        await logError(new Error(event.reason), 'Unhandled promise rejection');
    });
}

// Performance monitoring with Supabase
async function logPerformanceMetrics() {
    try {
        const navigation = performance.getEntriesByType('navigation')[0];
        const metrics = {
            page_load_time: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
            first_paint: 0,
            largest_contentful_paint: 0
        };
        
        // Get paint metrics if available
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
            if (entry.name === 'first-paint') {
                metrics.first_paint = Math.round(entry.startTime);
            }
        });
        
        // Get LCP if available
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                metrics.largest_contentful_paint = Math.round(lastEntry.startTime);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        // Log to Supabase
        await supabase
            .from('performance_logs')
            .insert([{
                user_id: currentUser?.id,
                metrics: metrics,
                user_agent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`
            }]);
        
    } catch (error) {
        console.error('Error logging performance metrics:', error);
    }
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    // Setup enhanced error handling
    setupEnhancedErrorHandling();
    
    // Log performance metrics after page load
    window.addEventListener('load', () => {
        setTimeout(logPerformanceMetrics, 1000);
    });
    
    // Setup auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await loadUserOrderHistory();
            await loadUserPreferences();
            showNotification('Welcome back!', 'success');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            clearUserData();
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', async function() {
    // Save current state
    saveCartToStorage();
    
    // Unsubscribe from real-time updates
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
    
    // Track session end
    await trackEvent('session_end', {
        duration: Date.now() - (sessionStorage.getItem('session_start') || Date.now()),
        timestamp: new Date().toISOString()
    });
});

// Export enhanced functions for global access
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.setQuantity = setQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.showCheckoutForm = showCheckoutForm;
window.closeCheckoutForm = closeCheckoutForm;
window.refreshProductData = refreshProductData;
window.clearAllFilters = clearAllFilters;
window.scrollToTop = scrollToTop;
window.scrollToProducts = scrollToProducts;
window.toggleTheme = toggleTheme;
window.installApp = installApp;
window.dismissInstallBanner = dismissInstallBanner;
window.retryConnection = retryConnection;
window.loadMoreProducts = loadMoreProducts;
window.focusLocationSelector = focusLocationSelector;
window.reorderItems = reorderItems;
window.trackOrder = trackOrder;
window.showProductDetails = showProductDetails;
window.submitReview = submitReview;
window.toggleWishlist = toggleWishlist;
window.signUpUser = signUpUser;
window.signInUser = signInUser;
window.signOutUser = signOutUser;

console.log('🚀 FreshMart Customer App with Supabase integration fully loaded!');
