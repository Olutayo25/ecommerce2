// Global Variables
let products = [];
let cart = [];
let selectedLocation = '';
let isDeliveryMode = false;
let deliveryFee = 1500;
let freeDeliveryThreshold = 25000;
let currentPage = 1;
let itemsPerPage = 12;
let isLoading = false;
let syncInterval;
let lastSyncTime = null;

// Location data with enhanced information
const locationData = {
    'ikeja': {
        name: 'Ikeja Branch',
        address: '123 Ikeja Way, Lagos State',
        phone: '+2348123456001',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Adebayo Johnson'
    },
    'victoria-island': {
        name: 'Victoria Island Branch',
        address: '456 Victoria Island, Lagos State',
        phone: '+2348123456002',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Funmi Adebayo'
    },
    'surulere': {
        name: 'Surulere Branch',
        address: '789 Surulere Road, Lagos State',
        phone: '+2348123456003',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Kemi Okafor'
    },
    'lekki': {
        name: 'Lekki Branch',
        address: '321 Lekki Phase 1, Lagos State',
        phone: '+2348123456004',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Tunde Bakare'
    },
    'ajah': {
        name: 'Ajah Branch',
        address: '654 Ajah Express, Lagos State',
        phone: '+2348123456005',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Blessing Okoro'
    },
    'yaba': {
        name: 'Yaba Branch',
        address: '987 Yaba College Road, Lagos State',
        phone: '+2348123456006',
        hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
        manager: 'Chidi Okonkwo'
    }
};

// Sample product data (fallback if no admin data)
const sampleProducts = [
    {
        id: 1,
        name: "Fresh Tomatoes",
        category: "groceries",
        price: 800,
        unit: "kg",
        description: "Fresh, ripe tomatoes perfect for cooking",
        image: "",
        stock: {
            "ikeja": 50,
            "victoria-island": 30,
            "surulere": 45,
            "lekki": 25,
            "ajah": 35,
            "yaba": 40
        },
        popularity: 95
    },
    {
        id: 2,
        name: "Whole Milk",
        category: "dairy",
        price: 1200,
        unit: "liter",
        description: "Fresh whole milk, rich in calcium",
        image: "",
        stock: {
            "ikeja": 20,
            "victoria-island": 15,
            "surulere": 25,
            "lekki": 18,
            "ajah": 22,
            "yaba": 30
        },
        popularity: 88
    },
    {
        id: 3,
        name: "Chicken Breast",
        category: "meat",
        price: 3500,
        unit: "kg",
        description: "Fresh, boneless chicken breast",
        image: "",
        stock: {
            "ikeja": 15,
            "victoria-island": 10,
            "surulere": 20,
            "lekki": 8,
            "ajah": 12,
            "yaba": 18
        },
        popularity: 92
    },
    {
        id: 4,
        name: "Dishwashing Liquid",
        category: "household",
        price: 650,
        unit: "bottle",
        description: "Effective dishwashing liquid for clean dishes",
        image: "",
        stock: {
            "ikeja": 40,
            "victoria-island": 35,
            "surulere": 30,
            "lekki": 25,
            "ajah": 45,
            "yaba": 38
        },
        popularity: 75
    },
    {
        id: 5,
        name: "Bluetooth Speaker",
        category: "electronics",
        price: 15000,
        unit: "piece",
        description: "Portable Bluetooth speaker with great sound quality",
        image: "",
        stock: {
            "ikeja": 5,
            "victoria-island": 3,
            "surulere": 7,
            "lekki": 4,
            "ajah": 6,
            "yaba": 8
        },
        popularity: 82
    },
    {
        id: 6,
        name: "Portable Gas Grill",
        category: "grills",
        price: 45000,
        unit: "piece",
        description: "Compact portable gas grill perfect for outdoor cooking",
        image: "",
        stock: {
            "ikeja": 2,
            "victoria-island": 1,
            "surulere": 3,
            "lekki": 2,
            "ajah": 1,
            "yaba": 4
        },
        popularity: 68
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load initial data
    loadProductsFromAdmin();
    loadCartFromStorage();
    loadUserPreferences();
    
    // Setup event listeners
    initializeEventListeners();
    
    // Start data synchronization
    startDataSync();
    
    // Initialize UI
    updateCartDisplay();
    displayProducts();
    updateQuickCartCount();
    
    // Track page load
    trackEvent('page_load', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    });
    
    console.log('🛒 FreshMart Customer App Initialized');
}

// Event Listeners Setup
function initializeEventListeners() {
    // Location selector
    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
        locationSelect.addEventListener('change', handleLocationChange);
    }
    
    // Delivery toggle
    const deliveryToggle = document.getElementById('deliveryToggle');
    if (deliveryToggle) {
        deliveryToggle.addEventListener('change', handleDeliveryToggle);
    }
    
    // Search and filters
    const searchFilter = document.getElementById('searchFilter');
    if (searchFilter) {
        searchFilter.addEventListener('input', debounce(applyFilters, 300));
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    const availabilityFilter = document.getElementById('availabilityFilter');
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', applyFilters);
    }
    
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
    
    // Checkout form
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmission);
    }
    
    // Window events
    window.addEventListener('beforeunload', saveCartToStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Visibility change for tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Data Loading Functions
function loadProductsFromAdmin() {
    try {
        const adminData = localStorage.getItem('freshmart_admin_data');
        if (adminData) {
            const data = JSON.parse(adminData);
            if (data.products && Array.isArray(data.products)) {
                products = data.products.map(product => ({
                    ...product,
                    popularity: product.popularity || Math.floor(Math.random() * 100)
                }));
                lastSyncTime = data.lastSaved || new Date().toISOString();
                showSyncIndicator('Products synced successfully');
                return;
            }
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
    
    // Fallback to sample data
    products = [...sampleProducts];
    console.log('Using sample product data');
}

function refreshProductData() {
    showLoadingOverlay();
    
    // Simulate network delay
    setTimeout(() => {
        loadProductsFromAdmin();
        displayProducts();
        updateProductsStats();
        hideLoadingOverlay();
        showNotification('Products refreshed successfully', 'success');
        
        // Track refresh action
        trackEvent('manual_refresh', {
            timestamp: new Date().toISOString(),
            location: selectedLocation
        });
    }, 1000);
}

// Location handling
function handleLocationChange(event) {
    const newLocation = event.target.value;
    const option = event.target.options[event.target.selectedIndex];
    
    selectedLocation = newLocation;
    
    // Update UI based on location selection
    updateLocationStatus(newLocation, option);
    updateStoreStatus(newLocation);
    displayProducts();
    updateProductsStats();
    updateDeliveryInfo();
    
    // Save preference
    localStorage.setItem('freshmart_selected_location', newLocation);
    
    // Track location selection
    trackEvent('location_selected', {
        location: newLocation,
        timestamp: new Date().toISOString()
    });
}

function updateLocationStatus(location, option) {
    const locationStatus = document.getElementById('locationStatus');
    
    if (location && locationData[location]) {
        const locationInfo = locationData[location];
        locationStatus.textContent = `Shopping at ${locationInfo.name}`;
        locationStatus.style.color = '#27ae60';
        locationStatus.style.fontWeight = '600';
    } else {
        locationStatus.textContent = 'Please select a location to view products';
        locationStatus.style.color = '#6c757d';
        locationStatus.style.fontWeight = 'normal';
    }
}

function updateStoreStatus(location) {
    const storeStatus = document.getElementById('storeStatus');
    const statusMessage = document.getElementById('statusMessage');
    const storeHours = document.getElementById('storeHours');
    const storePhone = document.getElementById('storePhone');
    
    if (location && locationData[location]) {
        const locationInfo = locationData[location];
        
        statusMessage.innerHTML = `
            <i class="fas fa-store"></i>
            Currently shopping at <strong>${locationInfo.name}</strong>
        `;
        
        storeHours.textContent = locationInfo.hours;
        storePhone.href = `tel:${locationInfo.phone}`;
        storePhone.innerHTML = `<i class="fas fa-phone"></i> ${locationInfo.phone}`;
        
        storeStatus.style.display = 'block';
    } else {
        storeStatus.style.display = 'none';
    }
}

// Delivery mode handling
function handleDeliveryToggle(event) {
    isDeliveryMode = event.target.checked;
    updateDeliveryInfo();
    updateCartSummary();
    
    // Save preference
    localStorage.setItem('freshmart_delivery_mode', isDeliveryMode);
    
    // Track delivery toggle
    trackEvent('delivery_toggle', {
        isDelivery: isDeliveryMode,
        timestamp: new Date().toISOString()
    });
    
    showNotification(
        isDeliveryMode ? 'Switched to delivery mode' : 'Switched to pickup mode',
        'info'
    );
}

function updateDeliveryInfo() {
    const deliveryInfo = document.getElementById('deliveryInfo');
    const deliveryOption = deliveryInfo.querySelector('.delivery-option');
    
    if (isDeliveryMode && selectedLocation) {
        deliveryOption.innerHTML = `
            <i class="fas fa-truck"></i>
            <span>Delivery - ₦${deliveryFee.toLocaleString()}</span>
        `;
    } else {
        deliveryOption.innerHTML = `
            <i class="fas fa-store"></i>
            <span>Pickup - FREE</span>
        `;
    }
}

// Product display functions
function displayProducts() {
    const productGrid = document.getElementById('productGrid');
    const filteredProducts = getFilteredProducts();
    
    if (!selectedLocation) {
        productGrid.innerHTML = createNoLocationMessage();
        hideProductsStats();
        return;
    }
    
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = createNoProductsMessage();
        hideProductsStats();
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    productGrid.innerHTML = paginatedProducts.map((product, index) => 
        createProductCard(product, index)
    ).join('');
    
    // Update load more button
    updateLoadMoreButton(filteredProducts.length, endIndex);
    
    // Show products stats
    showProductsStats();
    updateProductsStats();
    
    // Add intersection observer for lazy loading
    observeProductCards();
}

function createProductCard(product, index) {
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
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${product.category}</p>
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
            </div>
        </div>
    `;
}

function createNoLocationMessage() {
    return `
        <div class="no-location-message">
            <i class="fas fa-map-marker-alt"></i>
            <h3>Select a Location</h3>
            <p>Please choose a store location to view available products and their stock levels.</p>
            <button class="cta-btn" onclick="focusLocationSelector()">
                <i class="fas fa-map-marker-alt"></i>
                Choose Location
            </button>
        </div>
    `;
}

function createNoProductsMessage() {
    return `
        <div class="no-products-message">
            <i class="fas fa-search"></i>
            <h3>No Products Found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <button class="cta-btn" onclick="clearAllFilters()">
                <i class="fas fa-times"></i>
                Clear Filters
            </button>
        </div>
    `;
}

function focusLocationSelector() {
    document.getElementById('locationSelect').focus();
    document.getElementById('locationSelect').click();
}

function getProductIcon(category) {
    const icons = {
        groceries: 'fa-apple-alt',
        dairy: 'fa-glass-whiskey',
        meat: 'fa-drumstick-bite',
        household: 'fa-home',
        electronics: 'fa-mobile-alt',
        grills: 'fa-fire'
    };
    return icons[category] || 'fa-box';
}

function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock' };
    } else if (stock <= 10) {
        return { class: 'low-stock', text: 'Low Stock' };
    } else {
        return { class: 'in-stock', text: 'In Stock' };
    }
}

// Filtering and sorting
function getFilteredProducts() {
    let filtered = [...products];
    
    // Filter by search term
    const searchTerm = document.getElementById('searchFilter')?.value?.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by category
    const categoryFilter = document.getElementById('categoryFilter')?.value;
    if (categoryFilter) {
        filtered = filtered.filter(product => product.category === categoryFilter);
    }
    
    // Filter by availability
    const availabilityFilter = document.getElementById('availabilityFilter')?.value;
    if (availabilityFilter && selectedLocation) {
        filtered = filtered.filter(product => {
            const stock = product.stock[selectedLocation] || 0;
            switch (availabilityFilter) {
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
    
    // Sort products
    const sortFilter = document.getElementById('sortFilter')?.value;
    filtered.sort((a, b) => {
        switch (sortFilter) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'stock':
                const stockA = selectedLocation ? (a.stock[selectedLocation] || 0) : 0;
                const stockB = selectedLocation ? (b.stock[selectedLocation] || 0) : 0;
                return stockB - stockA;
            case 'popularity':
                return (b.popularity || 0) - (a.popularity || 0);
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    
    return filtered;
}

function applyFilters() {
    currentPage = 1; // Reset pagination
    displayProducts();
    
    // Track filter usage
    trackEvent('filters_applied', {
        search: document.getElementById('searchFilter')?.value || '',
        category: document.getElementById('categoryFilter')?.value || '',
        availability: document.getElementById('availabilityFilter')?.value || '',
        sort: document.getElementById('sortFilter')?.value || '',
        timestamp: new Date().toISOString()
    });
}

function clearAllFilters() {
    document.getElementById('searchFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('availabilityFilter').value = '';
    document.getElementById('sortFilter').value = 'name';
    
    applyFilters();
    showNotification('All filters cleared', 'info');
}

// Products Statistics
function showProductsStats() {
    const productsStats = document.getElementById('productsStats');
    if (productsStats) {
        productsStats.style.display = 'flex';
    }
}

function hideProductsStats() {
    const productsStats = document.getElementById('productsStats');
    if (productsStats) {
        productsStats.style.display = 'none';
    }
}

function updateProductsStats() {
    if (!selectedLocation) return;
    
    const totalProducts = products.length;
    let inStockCount = 0;
    let lowStockCount = 0;
    
    products.forEach(product => {
        const stock = product.stock[selectedLocation] || 0;
        if (stock > 10) {
            inStockCount++;
        } else if (stock > 0) {
            lowStockCount++;
        }
    });
    
    const totalProductsEl = document.getElementById('totalProductsCount');
    const inStockEl = document.getElementById('inStockCount');
    const lowStockEl = document.getElementById('lowStockCount');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (inStockEl) inStockEl.textContent = inStockCount;
    if (lowStockEl) lowStockEl.textContent = lowStockCount;
}

// Load More Functionality
function updateLoadMoreButton(totalItems, currentEndIndex) {
    const loadMoreSection = document.getElementById('loadMoreSection');
    
    if (totalItems > currentEndIndex) {
        loadMoreSection.style.display = 'block';
    } else {
        loadMoreSection.style.display = 'none';
    }
}

function loadMoreProducts() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    const originalText = loadMoreBtn.innerHTML;
    
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    loadMoreBtn.disabled = true;
    
    setTimeout(() => {
        currentPage++;
        displayProducts();
        
        loadMoreBtn.innerHTML = originalText;
        loadMoreBtn.disabled = false;
        
        showNotification('More products loaded', 'success');
        
        // Scroll to new products
        const productCards = document.querySelectorAll('.product-card');
        if (productCards.length > 0) {
            const newProductIndex = (currentPage - 1) * itemsPerPage;
            if (productCards[newProductIndex]) {
                productCards[newProductIndex].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }
    }, 800);
}

// Cart functionality
function addToCart(productId) {
    if (!selectedLocation) {
        showNotification('Please select a location first', 'error');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const availableStock = product.stock[selectedLocation] || 0;
    if (availableStock <= 0) {
        showNotification('Product is out of stock', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < availableStock) {
            existingItem.quantity += 1;
            showNotification(`Added ${product.name} to cart`, 'success');
        } else {
            showNotification('Cannot add more items than available stock', 'warning');
            return;
        }
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: 1,
            location: selectedLocation
        });
        showNotification(`Added ${product.name} to cart`, 'success');
    }
    
    updateCartDisplay();
    updateQuickCartCount();
    displayProducts(); // Refresh to update quantity controls
    saveCartToStorage();
    
    // Track add to cart
    trackEvent('add_to_cart', {
        productId: productId,
        productName: product.name,
        quantity: 1,
        location: selectedLocation,
        timestamp: new Date().toISOString()
    });
}

function updateQuantity(productId, change) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const availableStock = product.stock[selectedLocation] || 0;
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + change;
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (newQuantity <= availableStock) {
            existingItem.quantity = newQuantity;
            updateCartDisplay();
            updateQuickCartCount();
            displayProducts();
            saveCartToStorage();
        } else {
            showNotification('Cannot exceed available stock', 'warning');
        }
    } else if (change > 0) {
        addToCart(productId);
    }
}

function setQuantity(productId, quantity) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const availableStock = product.stock[selectedLocation] || 0;
    const newQuantity = parseInt(quantity) || 0;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else if (newQuantity <= availableStock) {
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity = newQuantity;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                unit: product.unit,
                quantity: newQuantity,
                location: selectedLocation
            });
        }
        updateCartDisplay();
        updateQuickCartCount();
        displayProducts();
        saveCartToStorage();
    } else {
        showNotification('Cannot exceed available stock', 'warning');
        displayProducts(); // Reset the input value
    }
}

function removeFromCart(productId) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        const item = cart[index];
        cart.splice(index, 1);
        showNotification(`Removed ${item.name} from cart`, 'success');
        updateCartDisplay();
        updateQuickCartCount();
        displayProducts();
        saveCartToStorage();
        
        // Track removal
        trackEvent('remove_from_cart', {
            productId: productId,
            productName: item.name,
            timestamp: new Date().toISOString()
        });
    }
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        if (cartItems) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    <small>Add items to get started</small>
                </div>
            `;
        }
        if (cartSummary) cartSummary.style.display = 'none';
    } else {
        if (cartItems) {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <i class="fas ${getProductIcon(products.find(p => p.id === item.id)?.category)}"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₦${item.price.toLocaleString()}/${item.unit}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)" title="Decrease">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="quantity-input" value="${item.quantity}" 
                                   onchange="setQuantity(${item.id}, this.value)" min="1">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)" title="Increase">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="remove-item" onclick="removeFromCart(${item.id})" title="Remove">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        if (cartSummary) {
            cartSummary.style.display = 'block';
            updateCartSummary();
        }
    }
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentDeliveryFee = isDeliveryMode && subtotal < freeDeliveryThreshold ? deliveryFee : 0;
    const total = subtotal + currentDeliveryFee;
    
    const subtotalEl = document.getElementById('subtotal');
    const deliveryFeeEl = document.getElementById('deliveryFee');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
        if (deliveryFeeEl) {
        if (isDeliveryMode && subtotal >= freeDeliveryThreshold) {
            deliveryFeeEl.innerHTML = `<span style="text-decoration: line-through;">₦${deliveryFee.toLocaleString()}</span> <span style="color: #27ae60; font-weight: bold;">FREE</span>`;
        } else {
            deliveryFeeEl.textContent = `₦${currentDeliveryFee.toLocaleString()}`;
        }
    }
    if (totalAmountEl) totalAmountEl.textContent = `₦${total.toLocaleString()}`;
}

function updateQuickCartCount() {
    const quickCartCount = document.getElementById('quickCartCount');
    if (quickCartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        quickCartCount.textContent = totalItems;
        quickCartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Cart sidebar toggle
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.toggle('open');
        cartOverlay.classList.toggle('active');
        
        // Prevent body scroll when cart is open
        if (cartSidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Checkout functionality
function showCheckoutForm() {
    if (!selectedLocation) {
        showNotification('Please select a location first', 'error');
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        checkoutModal.classList.add('active');
        
        // Update delivery/pickup sections
        updateCheckoutSections();
        
        // Populate order summary
        updateCheckoutOrderSummary();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Track checkout start
        trackEvent('checkout_started', {
            cartValue: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
            location: selectedLocation,
            deliveryType: isDeliveryMode ? 'delivery' : 'pickup',
            timestamp: new Date().toISOString()
        });
    }
}

function closeCheckoutForm() {
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.reset();
        }
    }
}

function updateCheckoutSections() {
    const deliverySection = document.getElementById('deliverySection');
    const pickupSection = document.getElementById('pickupSection');
    const deliveryAddress = document.getElementById('deliveryAddress');
    
    if (isDeliveryMode) {
        if (deliverySection) deliverySection.style.display = 'block';
        if (pickupSection) pickupSection.style.display = 'none';
        if (deliveryAddress) deliveryAddress.required = true;
    } else {
        if (deliverySection) deliverySection.style.display = 'none';
        if (pickupSection) pickupSection.style.display = 'block';
        if (deliveryAddress) deliveryAddress.required = false;
        
        // Update pickup location info
        if (selectedLocation && locationData[selectedLocation]) {
            const locationInfo = locationData[selectedLocation];
            const pickupLocationName = document.getElementById('pickupLocationName');
            const pickupLocationAddress = document.getElementById('pickupLocationAddress');
            
            if (pickupLocationName) pickupLocationName.textContent = locationInfo.name;
            if (pickupLocationAddress) pickupLocationAddress.textContent = locationInfo.address;
        }
    }
}

function updateCheckoutOrderSummary() {
    const summaryContainer = document.getElementById('checkoutOrderSummary');
    if (!summaryContainer) return;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentDeliveryFee = isDeliveryMode && subtotal < freeDeliveryThreshold ? deliveryFee : 0;
    const total = subtotal + currentDeliveryFee;
    
    summaryContainer.innerHTML = `
        <div class="order-items">
            ${cart.map(item => `
                <div class="order-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>₦${(item.price * item.quantity).toLocaleString()}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-totals">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>₦${subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
                <span>${isDeliveryMode ? 'Delivery Fee:' : 'Pickup:'}</span>
                <span>${isDeliveryMode ? 
                    (subtotal >= freeDeliveryThreshold ? 
                        '<span style="text-decoration: line-through;">₦' + deliveryFee.toLocaleString() + '</span> <span style="color: #27ae60;">FREE</span>' : 
                        '₦' + currentDeliveryFee.toLocaleString()) : 
                    'FREE'}</span>
            </div>
            <div class="total-row final-total">
                <span><strong>Total:</strong></span>
                <span><strong>₦${total.toLocaleString()}</strong></span>
            </div>
        </div>
    `;
}

function handleCheckoutSubmission(event) {
    event.preventDefault();
    
    // Validate form
    const customerName = document.getElementById('customerName')?.value;
    const customerPhone = document.getElementById('customerPhone')?.value;
    const customerEmail = document.getElementById('customerEmail')?.value;
    
    if (!customerName || !customerPhone) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate phone number
    if (!isValidPhoneNumber(customerPhone)) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    // Validate email if provided
    if (customerEmail && !isValidEmail(customerEmail)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Build order message
    let orderMessage = `Hello! I'd like to place an order:\n\n`;
    orderMessage += `*Customer Information:*\n`;
    orderMessage += `Name: ${customerName}\n`;
    orderMessage += `Phone: ${customerPhone}\n`;
    if (customerEmail) orderMessage += `Email: ${customerEmail}\n`;
    
    if (isDeliveryMode) {
        const deliveryAddress = document.getElementById('deliveryAddress')?.value;
        const deliveryInstructions = document.getElementById('deliveryInstructions')?.value;
        
        if (!deliveryAddress) {
            showNotification('Please enter delivery address', 'error');
            return;
        }
        
        orderMessage += `\n*Delivery Details:*\n`;
        orderMessage += `Address: ${deliveryAddress}\n`;
        if (deliveryInstructions) orderMessage += `Instructions: ${deliveryInstructions}\n`;
    } else {
        const pickupTime = document.getElementById('pickupTime')?.value;
        const pickupNotes = document.getElementById('pickupNotes')?.value;
        const locationInfo = locationData[selectedLocation];
        
        orderMessage += `\n*Pickup Details:*\n`;
        orderMessage += `Location: ${locationInfo.name}\n`;
        orderMessage += `Address: ${locationInfo.address}\n`;
        if (pickupTime) orderMessage += `Preferred Time: ${pickupTime}\n`;
        if (pickupNotes) orderMessage += `Notes: ${pickupNotes}\n`;
    }
    
    // Add order items
    orderMessage += `\n*Order Items:*\n`;
    cart.forEach(item => {
        orderMessage += `• ${item.name} - ${item.quantity} ${item.unit}${item.quantity !== 1 ? 's' : ''} @ ₦${item.price.toLocaleString()} each\n`;
    });
    
    // Add totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentDeliveryFee = isDeliveryMode && subtotal < freeDeliveryThreshold ? deliveryFee : 0;
    const total = subtotal + currentDeliveryFee;
    
    orderMessage += `\n*Order Summary:*\n`;
    orderMessage += `Subtotal: ₦${subtotal.toLocaleString()}\n`;
    orderMessage += `${isDeliveryMode ? 'Delivery Fee' : 'Pickup'}: ${isDeliveryMode ? '₦' + currentDeliveryFee.toLocaleString() : 'FREE'}\n`;
    orderMessage += `*Total: ₦${total.toLocaleString()}*\n\n`;
    orderMessage += `Order Date: ${new Date().toLocaleDateString()}\n`;
    orderMessage += `Please confirm availability and processing time. Thank you!`;
    
    // Get WhatsApp number for selected location
    const locationInfo = locationData[selectedLocation];
    const whatsappNumber = locationInfo.phone.replace('+', '');
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderMessage)}`;
    
    // Track order completion
    trackEvent('order_completed', {
        orderId: generateOrderId(),
        customerName: customerName,
        customerPhone: customerPhone,
        location: selectedLocation,
        deliveryType: isDeliveryMode ? 'delivery' : 'pickup',
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        orderValue: total,
        timestamp: new Date().toISOString()
    });
    
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
    
    showNotification('Order sent via WhatsApp! Thank you for shopping with us.', 'success');
}

// Data synchronization
function startDataSync() {
    // Check for updates every 5 seconds
    syncInterval = setInterval(() => {
        checkForDataUpdates();
    }, 5000);
    
    // Initial sync
    checkForDataUpdates();
}

function checkForDataUpdates() {
    const dataUpdated = localStorage.getItem('freshmart_data_updated');
    if (dataUpdated === 'true') {
        // Clear the flag
        localStorage.removeItem('freshmart_data_updated');
        
        // Update products
        const adminData = localStorage.getItem('freshmart_admin_data');
        if (adminData) {
            try {
                const data = JSON.parse(adminData);
                if (data.products && data.lastSaved !== lastSyncTime) {
                    products = data.products.map(product => ({
                        ...product,
                        popularity: product.popularity || Math.floor(Math.random() * 100)
                    }));
                    lastSyncTime = data.lastSaved;
                    
                    displayProducts();
                    updateProductsStats();
                    showUpdateIndicator();
                    
                    console.log('Products updated from admin panel');
                }
            } catch (error) {
                console.error('Error updating data:', error);
            }
        }
    }
}

function showUpdateIndicator() {
    const indicator = document.getElementById('updateIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function showSyncIndicator(message) {
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.style.display = 'flex';
        syncIndicator.querySelector('span').textContent = message;
        
        setTimeout(() => {
            syncIndicator.style.display = 'none';
        }, 2000);
    }
}

// Storage functions
function saveCartToStorage() {
    try {
        localStorage.setItem('freshmart_cart', JSON.stringify(cart));
        localStorage.setItem('freshmart_location', selectedLocation);
        localStorage.setItem('freshmart_delivery', isDeliveryMode.toString());
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('freshmart_cart');
        const savedLocation = localStorage.getItem('freshmart_location');
        const savedDelivery = localStorage.getItem('freshmart_delivery');
        
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        
        if (savedLocation) {
            selectedLocation = savedLocation;
            const locationSelect = document.getElementById('locationSelect');
            if (locationSelect) {
                locationSelect.value = savedLocation;
                // Trigger change event to update UI
                const event = new Event('change');
                locationSelect.dispatchEvent(event);
            }
        }
        
        if (savedDelivery) {
            isDeliveryMode = savedDelivery === 'true';
            const deliveryToggle = document.getElementById('deliveryToggle');
            if (deliveryToggle) {
                deliveryToggle.checked = isDeliveryMode;
            }
            updateDeliveryInfo();
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
    }
}

function loadUserPreferences() {
    try {
        // Load theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-toggle-footer i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Load other preferences
        const installBannerDismissed = localStorage.getItem('installBannerDismissed');
        if (installBannerDismissed === 'true') {
            const installBanner = document.getElementById('installBanner');
            if (installBanner) {
                installBanner.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

function generateOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD${timestamp.slice(-6)}${random.toUpperCase()}`;
}

function formatCurrency(amount) {
    return `₦${amount.toLocaleString()}`;
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <p>
            <i class="fas ${icon}"></i>
            ${message}
        </p>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 4000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Online/Offline handling
function handleOnline() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) {
        offlineIndicator.style.display = 'none';
    }
    
    showNotification('Connection restored', 'success');
    
    // Restart data sync
    if (!syncInterval) {
        startDataSync();
    }
    
    // Refresh data
    refreshProductData();
}

function handleOffline() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) {
        offlineIndicator.style.display = 'block';
    }
    
    showNotification('You are now offline. Some features may not work.', 'warning');
    
    // Stop data sync
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

function retryConnection() {
    if (navigator.onLine) {
        handleOnline();
    } else {
        showNotification('Still offline. Please check your connection.', 'error');
    }
}

// Visibility change handling
function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, reduce sync frequency
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = setInterval(checkForDataUpdates, 30000); // 30 seconds
        }
    } else {
        // Page is visible, restore normal sync
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = setInterval(checkForDataUpdates, 5000); // 5 seconds
        }
        
        // Check for updates immediately
        checkForDataUpdates();
    }
}

// Intersection Observer for lazy loading
function observeProductCards() {
    const productCards = document.querySelectorAll('.product-card');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        productCards.forEach(card => {
            observer.observe(card);
        });
    }
}

// Analytics and tracking
function trackEvent(eventName, eventData) {
    try {
        // Store events locally for potential future sync
        const events = JSON.parse(localStorage.getItem('freshmart_analytics') || '[]');
        events.push({
            event: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId()
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('freshmart_analytics', JSON.stringify(events));
        
        // In a real app, you would send this to your analytics service
        console.log('Analytics Event:', eventName, eventData);
    } catch (error) {
        console.error('Error tracking event:', error);
    }
}

function getSessionId() {
    let sessionId = sessionStorage.getItem('freshmart_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('freshmart_session_id', sessionId);
    }
    return sessionId;
}

// Performance monitoring
function monitorPerformance() {
    // Monitor page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        trackEvent('page_load_time', {
            loadTime: Math.round(loadTime),
            timestamp: new Date().toISOString()
        });
        
        if (loadTime > 3000) {
            console.warn(`Slow page load: ${Math.round(loadTime)}ms`);
        }
    });
    
    // Monitor cart operations
    const originalAddToCart = addToCart;
    addToCart = function(productId) {
        const startTime = performance.now();
        originalAddToCart(productId);
        const endTime = performance.now();
        
        if (endTime - startTime > 100) {
            console.warn(`Slow add to cart operation: ${Math.round(endTime - startTime)}ms`);
        }
    };
}

// Error handling
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        trackEvent('javascript_error', {
            message: event.error?.message || 'Unknown error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        });
        
        showNotification('An error occurred. Please refresh the page if problems persist.', 'error');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        trackEvent('promise_rejection', {
            reason: event.reason?.toString() || 'Unknown rejection',
            timestamp: new Date().toISOString()
        });
    });
}

// Scroll functions
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    trackEvent('scroll_to_top', {
        timestamp: new Date().toISOString()
    });
}

function scrollToProducts() {
    const productsSection = document.getElementById('productsSection');
    if (productsSection) {
        productsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        trackEvent('scroll_to_products', {
            timestamp: new Date().toISOString()
        });
    }
}

// Theme toggle
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.querySelector('.theme-toggle-footer i');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showNotification(`Switched to ${newTheme} theme`, 'info');
    
    trackEvent('theme_toggle', {
        theme: newTheme,
        timestamp: new Date().toISOString()
    });
}

// PWA functions
function installApp() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                trackEvent('app_installed', {
                    timestamp: new Date().toISOString()
                });
            }
            window.deferredPrompt = null;
            document.getElementById('installBanner').style.display = 'none';
        });
    }
}

function dismissInstallBanner() {
    document.getElementById('installBanner').style.display = 'none';
    localStorage.setItem('installBannerDismissed', 'true');
    
    trackEvent('install_banner_dismissed', {
        timestamp: new Date().toISOString()
    });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchFilter');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape to close cart or checkout
        if (e.key === 'Escape') {
            const cartSidebar = document.getElementById('cartSidebar');
            const checkoutModal = document.getElementById('checkoutModal');
            
            if (checkoutModal && checkoutModal.classList.contains('active')) {
                closeCheckoutForm();
            } else if (cartSidebar && cartSidebar.classList.contains('open')) {
                toggleCart();
            }
        }
        
        // Ctrl/Cmd + R to refresh products
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshProductData();
        }
        
        // Ctrl/Cmd + Shift + C to toggle cart
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            toggleCart();
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup additional functionality
    setupErrorHandling();
    monitorPerformance();
    setupKeyboardShortcuts();
    
    // Show/hide quick actions based on scroll
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        const quickActions = document.getElementById('quickActionsCustomer');
        if (quickActions) {
            if (window.scrollY > 300) {
                quickActions.style.display = 'flex';
            } else {
                quickActions.style.display = 'none';
            }
        }
        
        // Debounce scroll tracking
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackEvent('scroll_position', {
                scrollY: window.scrollY,
                timestamp: new Date().toISOString()
            });
        }, 1000);
    });
    
    // Update delivery toggle when changed
    const deliveryToggle = document.getElementById('deliveryToggle');
    if (deliveryToggle) {
        deliveryToggle.addEventListener('change', function() {
            updateCheckoutSections();
            updateCheckoutOrderSummary();
        });
    }
    
    // Auto-hide notifications on mobile when scrolling
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) {
            const notificationContainer = document.getElementById('notificationContainer');
            if (notificationContainer) {
                if (window.scrollY > lastScrollY) {
                    notificationContainer.style.transform = 'translateY(-100%)';
                } else {
                    notificationContainer.style.transform = 'translateY(0)';
                }
            }
        }
        lastScrollY = window.scrollY;
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    // Save current state
    saveCartToStorage();
    
    // Clear intervals
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Track session end
    trackEvent('session_end', {
        duration: Date.now() - (sessionStorage.getItem('session_start') || Date.now()),
        timestamp: new Date().toISOString()
    });
});

// Track session start
sessionStorage.setItem('session_start', Date.now());
trackEvent('session_start', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`
});

// Export functions for global access
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

console.log('🚀 FreshMart Customer App fully loaded and ready!');

// Show admin link only if user has admin access (optional)
function checkAdminAccess() {
    // This could check for admin session or other indicators
    const hasAdminAccess = localStorage.getItem('admin_session');
    const adminLink = document.getElementById('adminLink');
    
    if (adminLink) {
        adminLink.style.display = hasAdminAccess ? 'flex' : 'none';
    }
}

// Call this on page load
document.addEventListener('DOMContentLoaded', checkAdminAccess);


// Enhanced session timeout with security
function setupSecureSessionTimeout() {
    let sessionTimeoutId;
    let warningTimeoutId;
    
    function resetSessionTimeout() {
        clearTimeout(sessionTimeoutId);
        clearTimeout(warningTimeoutId);
        
        if (!currentUser) return;
        
        const timeoutMinutes = parseInt(document.getElementById('sessionTimeout')?.value) || 60;
        const warningMinutes = 5; // Warn 5 minutes before timeout
        
        // Show warning before timeout
        warningTimeoutId = setTimeout(() => {
            showConfirmation(
                'Session Expiring',
                'Your session will expire in 5 minutes. Do you want to continue?',
                () => {
                    resetSessionTimeout(); // Reset if user wants to continue
                },
                () => {
                    logout(); // Logout if user doesn't respond
                }
            );
        }, (timeoutMinutes - warningMinutes) * 60 * 1000);
        
        // Auto logout
        sessionTimeoutId = setTimeout(() => {
            showNotification('Session expired for security reasons', 'warning');
            logout();
        }, timeoutMinutes * 60 * 1000);
    }
    
    // Reset timeout on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetSessionTimeout, true);
    });
    
    // Initial setup
    resetSessionTimeout();
}

// Security: Prevent admin panel access in iframe
if (window.top !== window.self) {
    window.top.location = window.self.location;
}

// Security: Clear sensitive data on page unload
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        // Clear any sensitive data from memory
        currentUser = null;
        
        // Clear forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
});

// Mobile-specific enhancements
function initializeMobileFeatures() {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Initialize mobile-specific features
        setupMobileGestures();
        setupMobileOptimizations();
        setupMobileCart();
        setupMobileKeyboard();
    }
}

// Mobile gesture support
function setupMobileGestures() {
    let startY = 0;
    let currentY = 0;
    let isScrolling = false;
    
    // Pull to refresh on product grid
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
        productGrid.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        productGrid.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 100 && window.scrollY === 0 && !isScrolling) {
                isScrolling = true;
                showNotification('Release to refresh products', 'info');
            }
        }, { passive: true });
        
        productGrid.addEventListener('touchend', () => {
            if (isScrolling) {
                refreshProductData();
                isScrolling = false;
            }
        }, { passive: true });
    }
    
    // Swipe to close cart
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        let startX = 0;
        
        cartSidebar.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        
        cartSidebar.addEventListener('touchmove', (e) => {
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            if (diff > 100) {
                toggleCart();
            }
        }, { passive: true });
    }
}

// Mobile-specific optimizations
function setupMobileOptimizations() {
    // Optimize scroll performance
    let ticking = false;
    
    function updateScrollPosition() {
        const scrollY = window.scrollY;
        
        // Hide/show header on scroll
        const header = document.querySelector('.header');
        if (header) {
            if (scrollY > 100) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
        }
        
        // Update quick actions visibility
        const quickActions = document.getElementById('quickActionsCustomer');
        if (quickActions) {
            quickActions.style.display = scrollY > 200 ? 'flex' : 'none';
        }
        
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }, { passive: true });
    
    // Optimize touch events
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
}

// Enhanced mobile cart experience
function setupMobileCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar && cartOverlay) {
        // Prevent background scroll when cart is open
        const originalToggleCart = window.toggleCart;
        window.toggleCart = function() {
            const isOpen = cartSidebar.classList.contains('open');
            
            if (isOpen) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
            } else {
                const scrollY = window.scrollY;
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollY}px`;
                document.body.style.width = '100%';
            }
            
            originalToggleCart();
        };
    }
}

// Mobile keyboard handling
function setupMobileKeyboard() {
    // Handle virtual keyboard appearance
    const viewport = document.querySelector('meta[name=viewport]');
    
    function handleKeyboard() {
        if (window.visualViewport) {
            const handleViewportChange = () => {
                const currentHeight = window.visualViewport.height;
                const fullHeight = window.screen.height;
                const keyboardHeight = fullHeight - currentHeight;
                
                if (keyboardHeight > 150) {
                    // Keyboard is open
                    document.body.classList.add('keyboard-open');
                    
                    // Adjust checkout modal if open
                    const checkoutModal = document.getElementById('checkoutModal');
                    if (checkoutModal && checkoutModal.classList.contains('active')) {
                        checkoutModal.style.paddingBottom = `${keyboardHeight}px`;
                    }
                } else {
                    // Keyboard is closed
                    document.body.classList.remove('keyboard-open');
                    
                    const checkoutModal = document.getElementById('checkoutModal');
                    if (checkoutModal) {
                        checkoutModal.style.paddingBottom = '';
                    }
                }
            };
            
            window.visualViewport.addEventListener('resize', handleViewportChange);
        }
    }
    
    handleKeyboard();
}

// Enhanced mobile product card interactions
function enhanceMobileProductCards() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // Add touch feedback
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        }, { passive: true });
        
        card.addEventListener('touchend', () => {
            card.style.transform = '';
        }, { passive: true });
        
        // Double tap to add to cart
        let lastTap = 0;
        card.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                const productId = parseInt(card.dataset.productId);
                if (productId) {
                    addToCart(productId);
                    
                    // Visual feedback
                    card.style.animation = 'pulse 0.3s ease';
                    setTimeout(() => {
                        card.style.animation = '';
                    }, 300);
                }
            }
            lastTap = currentTime;
        });
    });
}

// Mobile-specific checkout enhancements
function enhanceMobileCheckout() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        // Auto-scroll to focused input
        const inputs = checkoutForm.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 300); // Wait for keyboard animation
            });
        });
        
        // Format phone number input
        const phoneInput = document.getElementById('customerPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.startsWith('234')) {
                    value = '+' + value;
                } else if (value.startsWith('0')) {
                    value = '+234' + value.substring(1);
                } else if (!value.startsWith('+')) {
                    value = '+234' + value;
                }
                e.target.value = value;
            });
        }
    }
}

// Initialize mobile features
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileFeatures();
    
    // Re-enhance product cards when they're updated
    const originalDisplayProducts = displayProducts;
    displayProducts = function() {
        originalDisplayProducts();
        enhanceMobileProductCards();
    };
    
    enhanceMobileCheckout();
});

// End of script.js
