// Supabase client setup (add this at the top of your file if not already present)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aydlkdolxygxhmtdxins.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5ZGxrZG9seHlneGhtdGR4aW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjY5NzMsImV4cCI6MjA2NzU0Mjk3M30.obBDqpr6K40VcQUPkh03ftDXsgIM9X6CDRgZ2hUZrGM'
const supabase = createClient(supabaseUrl, supabaseKey)

// Global Variables
let currentUser = null;
let currentPage = 1;
let itemsPerPage = 10;
let currentOrdersPage = 1;
let ordersPerPage = 10;
let autoSaveInterval;
let sessionStartTime = new Date();
let selectedProducts = [];
let confirmationCallback = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    await initializeAdminData();
    setupEventListeners();
    await updateSystemInfo();
});

async function initializeAdminData() {
    try {
        // Check if user is authenticated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user) {
            currentUser = {
                id: user.id,
                email: user.email,
                role: 'administrator',
                loginTime: new Date().toISOString()
            };
            
            showAdminDashboard();
            await loadDashboardData();
            enableAutoSave();
        } else {
            // Initialize sample data if no data exists
            await initializeSampleData();
        }
    } catch (error) {
        console.error('Error initializing admin data:', error);
        await initializeSampleData();
    }
}

async function initializeSampleData() {
    try {
        // Check if data already exists
        const [
            { count: productCount },
            { count: locationCount }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('locations').select('*', { count: 'exact', head: true })
        ]);

        // Only initialize if no data exists
        if (productCount === 0 && locationCount === 0) {
            // Insert sample locations first
            const sampleLocations = [
                {
                    id: 'ikeja',
                    name: 'Ikeja Branch',
                    address: '123 Ikeja Way, Lagos State',
                    phone: '+2347062793809',
                    manager: 'Adebayo Johnson',
                    status: 'active',
                    hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                    total_products: 150,
                    total_orders: 45
                },
                {
                    id: 'victoria-island',
                    name: 'Victoria Island Branch',
                    address: '456 Victoria Island, Lagos State',
                    phone: '+2348069115577',
                    manager: 'Funmi Adebayo',
                    status: 'active',
                    hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                    total_products: 120,
                    total_orders: 38
                },
                {
                    id: 'lekki',
                    name: 'Lekki Branch',
                    address: '321 Lekki Phase 1, Lagos State',
                    phone: '+2348069115577',
                    manager: 'Tunde Bakare',
                    status: 'active',
                    hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                    total_products: 110,
                    total_orders: 29
                }
            ];

            await supabase.from('locations').insert(sampleLocations);

            // Insert sample products
            const sampleProducts = [
                {
                    name: "Fresh Tomatoes",
                    category: "groceries",
                    price: 800,
                    unit: "kg",
                    description: "Fresh, ripe tomatoes perfect for cooking",
                    image: "",
                    stock: {
                        "ikeja": 50,
                        "victoria-island": 30,
                        "lekki": 25
                    }
                },
                {
                    name: "Whole Milk",
                    category: "dairy",
                    price: 1200,
                    unit: "liter",
                    description: "Fresh whole milk, rich in calcium",
                    image: "",
                    stock: {
                        "ikeja": 20,
                        "victoria-island": 15,
                        "lekki": 18
                    }
                },
                {
                    name: "Chicken Breast",
                    category: "meat",
                    price: 3500,
                    unit: "kg",
                    description: "Fresh, boneless chicken breast",
                    image: "",
                    stock: {
                        "ikeja": 15,
                        "victoria-island": 10,
                        "lekki": 8
                    }
                }
            ];

            await supabase.from('products').insert(sampleProducts);

            console.log('Sample data initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Add product form
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }
    
    // Add location form
    const addLocationForm = document.getElementById('addLocationForm');
    if (addLocationForm) {
        addLocationForm.addEventListener('submit', handleAddLocation);
    }
    
    // Filter events
    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locationFilter.addEventListener('change', filterInventory);
    }
    
    const categoryFilterInventory = document.getElementById('categoryFilterInventory');
    if (categoryFilterInventory) {
        categoryFilterInventory.addEventListener('change', filterInventory);
    }
    
    const searchInventory = document.getElementById('searchInventory');
    if (searchInventory) {
        searchInventory.addEventListener('input', debounce(filterInventory, 300));
    }
    
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', filterOrders);
    }
    
    const orderLocationFilter = document.getElementById('orderLocationFilter');
    if (orderLocationFilter) {
        orderLocationFilter.addEventListener('change', filterOrders);
    }
    
    const orderDateFilter = document.getElementById('orderDateFilter');
    if (orderDateFilter) {
        orderDateFilter.addEventListener('change', filterOrders);
    }
    
    const searchOrders = document.getElementById('searchOrders');
    if (searchOrders) {
        searchOrders.addEventListener('input', debounce(filterOrders, 300));
    }
    
    // Select all checkboxes
    const selectAllProducts = document.getElementById('selectAllProducts');
    if (selectAllProducts) {
        selectAllProducts.addEventListener('change', toggleSelectAllProducts);
    }
    
    const selectAllHeader = document.getElementById('selectAllHeader');
    if (selectAllHeader) {
        selectAllHeader.addEventListener('change', toggleSelectAllProducts);
    }
}

// Authentication with Supabase Auth
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('username').value; // Assuming email login
    const password = document.getElementById('password').value;
    
    try {
        showLoadingOverlay();
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            role: 'administrator',
            loginTime: new Date().toISOString()
        };
        
        sessionStartTime = new Date();
        showAdminDashboard();
        await loadDashboardData();
        enableAutoSave();
        
        hideLoadingOverlay();
        showNotification('Login successful', 'success');
        
        // Log login activity
        await supabase.from('user_activities').insert([{
            user_id: data.user.id,
            activity_type: 'login',
            timestamp: new Date().toISOString()
        }]);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
}

function showAdminDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

async function logout() {
    try {
        showConfirmation(
            'Confirm Logout',
            'Are you sure you want to logout? Any unsaved changes will be lost.',
            async () => {
                try {
                    // Log logout activity
                    if (currentUser) {
                        await supabase.from('user_activities').insert([{
                            user_id: currentUser.id,
                            activity_type: 'logout',
                            timestamp: new Date().toISOString()
                        }]);
                    }
                    
                    // Sign out from Supabase
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    
                    currentUser = null;
                    sessionStartTime = null;
                    
                    document.getElementById('loginScreen').style.display = 'flex';
                    document.getElementById('adminDashboard').style.display = 'none';
                    
                    // Reset forms
                    document.getElementById('loginForm').reset();
                    
                    // Clear auto-save
                    if (autoSaveInterval) {
                        clearInterval(autoSaveInterval);
                    }
                    
                    showNotification('Logged out successfully', 'success');
                } catch (error) {
                    console.error('Logout error:', error);
                    showNotification('Error during logout', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Logout confirmation error:', error);
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        await Promise.all([
            updateDashboardStats(),
            loadInventoryTable(),
            loadOrdersTable(),
            loadLocationsGrid(),
            loadTopProducts(),
            loadRecentActivity(),
            updateLocationOverview()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function updateDashboardStats() {
    try {
        // Get counts and totals from Supabase
        const [
            { count: totalOrdersCount },
            { data: revenueData },
            { data: products }
        ] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('total'),
            supabase.from('products').select('stock')
        ]);

        const totalRevenue = revenueData.reduce((sum, order) => sum + order.total, 0);
        
        // Calculate low stock items
        const lowStockItems = products.filter(product => {
            return Object.values(product.stock || {}).some(stock => stock <= 10);
        }).length;
        
        // Update with animation
        animateNumber('totalOrders', totalOrdersCount);
        animateNumber('totalRevenue', totalRevenue, true);
        animateNumber('lowStockItems', lowStockItems);
        
        // Update today's orders
        const today = new Date().toISOString().split('T')[0];
        const { data: todayOrders, error: todayError } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', today)
            .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (!todayError) {
            const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
            document.getElementById('todayOrders').textContent = todayOrders.length;
            document.getElementById('todayRevenue').textContent = `₦${todayRevenue.toLocaleString()}`;
        }
        
        // Update pending orders
        const { data: pendingOrders, error: pendingError } = await supabase
            .from('orders')
            .select('total')
            .eq('status', 'pending');

        if (!pendingError) {
            const pendingValue = pendingOrders.reduce((sum, order) => sum + order.total, 0);
            document.getElementById('pendingOrders').textContent = pendingOrders.length;
            document.getElementById('pendingValue').textContent = `₦${pendingValue.toLocaleString()}`;
        }
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

function animateNumber(elementId, targetValue, isCurrency = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
        
        if (isCurrency) {
            element.textContent = `₦${currentValue.toLocaleString()}`;
        } else {
            element.textContent = currentValue;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

async function loadTopProducts() {
    try {
        const { data: topProducts, error } = await supabase
            .rpc('get_top_selling_products', { limit_count: 5 });
        
        if (error) throw error;
        
        const topProductsContainer = document.getElementById('topProducts');
        if (topProductsContainer && topProducts) {
            topProductsContainer.innerHTML = topProducts.map((product, index) => `
                <div class="top-product-item fade-in" style="animation-delay: ${index * 0.1}s">
                    <div class="product-rank">${index + 1}</div>
                    <div class="product-details">
                        <h4>${product.product_name}</h4>
                        <p>${product.total_quantity} units sold</p>
                    </div>
                    <div class="product-sales">₦${product.total_revenue.toLocaleString()}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

async function loadRecentActivity() {
    try {
        const { data: activities, error } = await supabase
            .from('recent_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8);
        
        if (error) throw error;
        
        const recentActivityContainer = document.getElementById('recentActivity');
        if (recentActivityContainer && activities) {
            recentActivityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item">
				                    <div class="activity-icon" style="background: ${activity.color || '#3498db'}">
                        <i class="fas ${activity.icon || 'fa-info'}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <small>${formatTimeAgo(activity.created_at)}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Section navigation
async function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.classList.add('fade-in');
    }
    
    // Add active class to clicked menu item
    event.target.classList.add('active');
    
    // Load section-specific data
    try {
        switch(sectionId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'inventory':
                await loadInventoryTable();
                await updateInventoryStats();
                break;
            case 'orders':
                await loadOrdersTable();
                break;
            case 'locations':
                await loadLocationsGrid();
                await updateLocationOverview();
                break;
            case 'analytics':
                await generateAnalytics();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${sectionId} section:`, error);
        showNotification(`Error loading ${sectionId} data`, 'error');
    }
}

// Inventory management
async function loadInventoryTable() {
    try {
        const tableBody = document.getElementById('inventoryTableBody');
        if (!tableBody) return;
        
        const filteredProducts = await getFilteredProducts();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        // Get locations for stock display
        const { data: locations, error: locationsError } = await supabase
            .from('locations')
            .select('id, name');
        
        if (locationsError) throw locationsError;
        
        tableBody.innerHTML = paginatedProducts.map(product => `
            <tr class="fade-in">
                <td>
                    <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" 
                           onchange="toggleProductSelection(${product.id})">
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <i class="fas ${getProductIcon(product.category)}" style="font-size: 1.5rem; color: #3498db;"></i>
                        <div>
                            <strong>${product.name}</strong>
                            <br>
                            <small style="color: #666;">${product.description}</small>
                        </div>
                    </div>
                </td>
                <td style="text-transform: capitalize;">${product.category}</td>
                <td>₦${product.price.toLocaleString()}/${product.unit}</td>
                <td>
                    <div class="stock-levels">
                        ${locations.map(location => `
                            <div class="stock-item editable">
                                <span>${location.name}:</span>
                                <input type="number" value="${(product.stock && product.stock[location.id]) || 0}" min="0" 
                                       onchange="updateProductStock(${product.id}, '${location.id}', this.value)"
                                       style="width: 60px; margin-left: 0.5rem; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <strong>${Object.values(product.stock || {}).reduce((sum, stock) => sum + stock, 0)}</strong>
                </td>
                <td>
                    <span class="status-badge ${getOverallStockStatus(product.stock || {})}">
                        ${getOverallStockStatus(product.stock || {}).replace('-', ' ')}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editProduct(${product.id})" title="Edit Product">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id})" title="Delete Product">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        updatePagination(filteredProducts.length);
        await updateInventoryStats();
    } catch (error) {
        console.error('Error loading inventory table:', error);
        showNotification('Error loading inventory', 'error');
    }
}

async function getFilteredProducts() {
    try {
        let query = supabase.from('products').select('*');
        
        // Filter by category
        const categoryFilter = document.getElementById('categoryFilterInventory')?.value;
        if (categoryFilter) {
            query = query.eq('category', categoryFilter);
        }
        
        // Filter by search term
        const searchTerm = document.getElementById('searchInventory')?.value?.toLowerCase();
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        const { data: products, error } = await query.order('name');
        
        if (error) throw error;
        
        return products || [];
    } catch (error) {
        console.error('Error filtering products:', error);
        return [];
    }
}

async function updateInventoryStats() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('stock');
        
        if (error) throw error;
        
        const totalProducts = products.length;
        const lowStockProducts = products.filter(product => 
            Object.values(product.stock || {}).some(stock => stock <= 10 && stock > 0)
        ).length;
        const outOfStockProducts = products.filter(product => 
            Object.values(product.stock || {}).every(stock => stock === 0)
        ).length;
        
        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockCountEl = document.getElementById('lowStockCount');
        const outOfStockCountEl = document.getElementById('outOfStockCount');
        
        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (lowStockCountEl) lowStockCountEl.textContent = lowStockProducts;
        if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockProducts;
    } catch (error) {
        console.error('Error updating inventory stats:', error);
    }
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Update pagination info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    const paginationStart = document.getElementById('paginationStart');
    const paginationEnd = document.getElementById('paginationEnd');
    const paginationTotal = document.getElementById('paginationTotal');
    
    if (paginationStart) paginationStart.textContent = startItem;
    if (paginationEnd) paginationEnd.textContent = endItem;
    if (paginationTotal) paginationTotal.textContent = totalItems;
    
    // Update pagination controls
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    
    // Update page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers) {
        let paginationHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-number ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">${i}</button>
            `;
        }
        
        pageNumbers.innerHTML = paginationHTML;
    }
}

async function changePage(direction) {
    const filteredProducts = await getFilteredProducts();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        await loadInventoryTable();
    }
}

async function goToPage(page) {
    currentPage = page;
    await loadInventoryTable();
}

function getOverallStockStatus(stockObj) {
    const totalStock = Object.values(stockObj).reduce((sum, stock) => sum + stock, 0);
    const lowStockCount = Object.values(stockObj).filter(stock => stock <= 10 && stock > 0).length;
    const outOfStockCount = Object.values(stockObj).filter(stock => stock === 0).length;
    
    if (totalStock === 0) return 'out-of-stock';
    if (outOfStockCount > 0 || lowStockCount > Object.keys(stockObj).length / 2) return 'low-stock';
    return 'in-stock';
}

async function filterInventory() {
    currentPage = 1; // Reset to first page when filtering
    await loadInventoryTable();
}

async function updateProductStock(productId, location, newStock) {
    try {
        const stockValue = Math.max(0, parseInt(newStock) || 0);
        
        // Get current product
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock, name')
            .eq('id', productId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Update stock
        const updatedStock = { ...product.stock, [location]: stockValue };
        
        const { error: updateError } = await supabase
            .from('products')
            .update({ 
                stock: updatedStock,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if (updateError) throw updateError;
        
        // Get location name for notification
        const { data: locationData } = await supabase
            .from('locations')
            .select('name')
            .eq('id', location)
            .single();
        
        const locationName = locationData?.name || location;
        
        showNotification(`Stock updated for ${product.name} at ${locationName}`, 'success');
        
        // Update the display
        setTimeout(async () => {
            await loadInventoryTable();
            await updateDashboardStats();
        }, 100);
        
    } catch (error) {
        console.error('Error updating product stock:', error);
        showNotification('Error updating stock', 'error');
    }
}

async function editProduct(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        if (!product) return;
        
        // Show modal and populate with existing data
        showAddProductModal();
        
        // Update modal title
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        document.getElementById('submitButtonText').textContent = 'Update Product';
        
        // Fill form with existing data
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productUnit').value = product.unit;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productImage').value = product.image || '';
        
        // Fill stock levels
        const { data: locations } = await supabase.from('locations').select('id');
        locations.forEach(location => {
            const stockInput = document.getElementById(`stock-${location.id}`);
            if (stockInput) {
                stockInput.value = (product.stock && product.stock[location.id]) || 0;
            }
        });
        
        // Change form submission to update instead of add
        const form = document.getElementById('addProductForm');
        form.onsubmit = (e) => handleUpdateProduct(e, productId);
        
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showNotification('Error loading product data', 'error');
    }
}

async function deleteProduct(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('name')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        if (!product) return;
        
        showConfirmation(
            'Delete Product',
            `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
            async () => {
                try {
                    const { error: deleteError } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', productId);
                    
                    if (deleteError) throw deleteError;
                    
                    await loadInventoryTable();
                    await updateDashboardStats();
                    showNotification('Product deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting product:', error);
                    showNotification('Error deleting product', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error loading product for delete:', error);
        showNotification('Error loading product data', 'error');
    }
}

// Product selection functions
function toggleProductSelection(productId) {
    const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
    if (checkbox.checked) {
        if (!selectedProducts.includes(productId)) {
            selectedProducts.push(productId);
        }
    } else {
        selectedProducts = selectedProducts.filter(id => id !== productId);
    }
    
    updateBulkActionButtons();
    updateSelectAllCheckbox();
}

function toggleSelectAllProducts() {
        const selectAllCheckbox = document.getElementById('selectAllProducts') || document.getElementById('selectAllHeader');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    
    if (selectAllCheckbox.checked) {
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            const productId = parseInt(checkbox.dataset.productId);
            if (!selectedProducts.includes(productId)) {
                selectedProducts.push(productId);
            }
        });
    } else {
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedProducts = [];
    }
    
    updateBulkActionButtons();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllProducts');
    const selectAllHeader = document.getElementById('selectAllHeader');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    
    const allChecked = productCheckboxes.length > 0 && checkedCheckboxes.length === productCheckboxes.length;
    
    if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
    if (selectAllHeader) selectAllHeader.checked = allChecked;
}

function updateBulkActionButtons() {
    const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    
    const hasSelection = selectedProducts.length > 0;
    
    if (bulkUpdateBtn) bulkUpdateBtn.disabled = !hasSelection;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = !hasSelection;
}

// Orders management
async function loadOrdersTable() {
    try {
        const tableBody = document.getElementById('ordersTableBody');
        if (!tableBody) return;
        
        const filteredOrders = await getFilteredOrders();
        const startIndex = (currentOrdersPage - 1) * ordersPerPage;
        const endIndex = startIndex + ordersPerPage;
        const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
        
        tableBody.innerHTML = paginatedOrders.map(order => `
            <tr class="fade-in">
                <td><strong>${order.id}</strong></td>
                <td>
                    <div>
                        <strong>${order.customer_name}</strong>
                        <br>
                        <small style="color: #666;">${order.customer_phone}</small>
                        ${order.customer_email ? `<br><small style="color: #666;">${order.customer_email}</small>` : ''}
                    </div>
                </td>
                <td style="text-transform: capitalize;">${order.location.replace('-', ' ')}</td>
                <td>
                    <span class="delivery-type ${order.delivery_type}">
                        <i class="fas ${order.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'}"></i>
                        ${order.delivery_type}
                    </span>
                </td>
                <td>
                    <div style="max-width: 200px;">
                        ${order.order_items ? order.order_items.map(item => 
                            `<div style="font-size: 0.9rem; margin-bottom: 0.25rem;">
                                ${item.quantity}x ${item.product_name}
                            </div>`
                        ).join('') : 'No items'}
                        <button class="btn-link" onclick="showOrderDetails('${order.id}')" style="font-size: 0.8rem;">
                            View Details
                        </button>
                    </div>
                </td>
                <td><strong>₦${order.total.toLocaleString()}</strong></td>
                <td>
                    <span class="status-badge ${order.status}">${order.status}</span>
                </td>
                <td>
                    <div>
                        ${new Date(order.created_at).toLocaleDateString()}
                        <br>
                        <small style="color: #666;">${new Date(order.created_at).toLocaleTimeString()}</small>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <select onchange="updateOrderStatus('${order.id}', this.value)" 
                                style="padding: 0.25rem; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button class="action-btn delete" onclick="deleteOrder('${order.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        updateOrdersPagination(filteredOrders.length);
    } catch (error) {
        console.error('Error loading orders table:', error);
        showNotification('Error loading orders', 'error');
    }
}

async function getFilteredOrders() {
    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    quantity,
                    price
                )
            `);
        
        // Filter by status
        const statusFilter = document.getElementById('orderStatusFilter')?.value;
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }
        
        // Filter by location
        const locationFilter = document.getElementById('orderLocationFilter')?.value;
        if (locationFilter) {
            query = query.eq('location', locationFilter);
        }
        
        // Filter by date
        const dateFilter = document.getElementById('orderDateFilter')?.value;
        if (dateFilter) {
            const startDate = new Date(dateFilter).toISOString().split('T')[0];
            const endDate = new Date(new Date(dateFilter).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            query = query.gte('created_at', startDate).lt('created_at', endDate);
        }
        
        // Filter by search term
        const searchTerm = document.getElementById('searchOrders')?.value?.toLowerCase();
        if (searchTerm) {
            query = query.or(`id::text.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
        }
        
        const { data: orders, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return orders || [];
    } catch (error) {
        console.error('Error filtering orders:', error);
        return [];
    }
}

function updateOrdersPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ordersPerPage);
    
    // Update pagination info
    const startItem = (currentOrdersPage - 1) * ordersPerPage + 1;
    const endItem = Math.min(currentOrdersPage * ordersPerPage, totalItems);
    
    const paginationStart = document.getElementById('ordersPaginationStart');
    const paginationEnd = document.getElementById('ordersPaginationEnd');
    const paginationTotal = document.getElementById('ordersPaginationTotal');
    
    if (paginationStart) paginationStart.textContent = startItem;
    if (paginationEnd) paginationEnd.textContent = endItem;
    if (paginationTotal) paginationTotal.textContent = totalItems;
    
    // Update pagination controls
    const prevBtn = document.getElementById('prevOrdersPageBtn');
    const nextBtn = document.getElementById('nextOrdersPageBtn');
    
    if (prevBtn) prevBtn.disabled = currentOrdersPage === 1;
    if (nextBtn) nextBtn.disabled = currentOrdersPage === totalPages;
    
    // Update page numbers
    const pageNumbers = document.getElementById('ordersPageNumbers');
    if (pageNumbers) {
        let paginationHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentOrdersPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-number ${i === currentOrdersPage ? 'active' : ''}" 
                        onclick="goToOrdersPage(${i})">${i}</button>
            `;
        }
        
        pageNumbers.innerHTML = paginationHTML;
    }
}

async function changeOrdersPage(direction) {
    const filteredOrders = await getFilteredOrders();
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const newPage = currentOrdersPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentOrdersPage = newPage;
        await loadOrdersTable();
    }
}

async function goToOrdersPage(page) {
    currentOrdersPage = page;
    await loadOrdersTable();
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const oldStatus = order.status;
        
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
        
        if (updateError) throw updateError;
        
        await loadOrdersTable();
        await updateDashboardStats();
        
        showNotification(`Order ${orderId} status updated from ${oldStatus} to ${newStatus}`, 'success');
        
        // Add to recent activity
        await addRecentActivity({
            type: 'order_update',
            message: `Order ${orderId} status changed to ${newStatus}`,
            icon: 'fa-edit',
            color: '#f39c12'
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

async function deleteOrder(orderId) {
    try {
        showConfirmation(
            'Delete Order',
            `Are you sure you want to delete order ${orderId}? This action cannot be undone.`,
            async () => {
                try {
                    // Delete order items first (if not using CASCADE)
                    await supabase
                        .from('order_items')
                        .delete()
                        .eq('order_id', orderId);
                    
                    // Delete order
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .eq('id', orderId);
                    
                    if (error) throw error;
                    
                    await loadOrdersTable();
                    await updateDashboardStats();
                    showNotification('Order deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting order:', error);
                    showNotification('Error deleting order', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error in delete order confirmation:', error);
    }
}

async function showOrderDetails(orderId) {
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
        if (!order) return;
        
        const modal = document.getElementById('orderDetailsModal');
        const content = document.getElementById('orderDetailsContent');
        
        content.innerHTML = `
            <div class="order-details-grid">
                <div class="order-section">
                    <h4><i class="fas fa-info-circle"></i> Order Information</h4>
                    <div class="detail-item">
                        <span>Order ID:</span>
                        <span><strong>${order.id}</strong></span>
                    </div>
                    <div class="detail-item">
                        <span>Date:</span>
                        <span>${new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span>Status:</span>
                        <span><span class="status-badge ${order.status}">${order.status}</span></span>
                    </div>
                    <div class="detail-item">
                        <span>Type:</span>
                        <span>
                            <i class="fas ${order.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'}"></i>
                            ${order.delivery_type}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span>Location:</span>
                        <span>${order.location.replace('-', ' ')}</span>
                    </div>
                </div>
                
                <div class="order-section">
                    <h4><i class="fas fa-user"></i> Customer Information</h4>
                    <div class="detail-item">
                        <span>Name:</span>
                        <span>${order.customer_name}</span>
                    </div>
                    <div class="detail-item">
                        <span>Phone:</span>
                        <span><a href="tel:${order.customer_phone}">${order.customer_phone}</a></span>
                    </div>
                    ${order.customer_email ? `
                        <div class="detail-item">
                            <span>Email:</span>
                            <span><a href="mailto:${order.customer_email}">${order.customer_email}</a></span>
                        </div>
                    ` : ''}
                    ${order.delivery_type === 'delivery' && order.delivery_address ? `
                        <div class="detail-item">
                            <span>Address:</span>
                            <span>${order.delivery_address}</span>
                        </div>
                    ` : ''}
                    ${order.notes ? `
                        <div class="detail-item">
                            <span>Notes:</span>
                            <span>${order.notes}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="order-section full-width">
                    <h4><i class="fas fa-shopping-cart"></i> Order Items</h4>
                                        <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.order_items ? order.order_items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₦${item.price.toLocaleString()}</td>
                                    <td>₦${(item.quantity * item.price).toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4">No items found</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3"><strong>Total Amount:</strong></td>
                                <td><strong>₦${order.total.toLocaleString()}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
        
    } catch (error) {
        console.error('Error showing order details:', error);
        showNotification('Error loading order details', 'error');
    }
}

function printOrderDetails() {
    window.print();
}

async function filterOrders() {
    currentOrdersPage = 1; // Reset to first page when filtering
    await loadOrdersTable();
}

// Locations management
async function loadLocationsGrid() {
    try {
        const locationsGrid = document.getElementById('locationsGrid');
        if (!locationsGrid) return;
        
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        locationsGrid.innerHTML = locations.map((location, index) => `
            <div class="location-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="location-header">
                    <h3 class="location-name">${location.name}</h3>
                    <span class="location-status ${location.status}">${location.status}</span>
                </div>
                <div class="location-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                    <p><i class="fas fa-phone"></i> <a href="tel:${location.phone}">${location.phone}</a></p>
                    <p><i class="fas fa-user"></i> Manager: ${location.manager}</p>
                    <p><i class="fas fa-clock"></i> ${location.hours}</p>
                </div>
                <div class="location-stats">
                    <div class="location-stat">
                        <h4>${location.total_products || 0}</h4>
                        <p>Products</p>
                    </div>
                    <div class="location-stat">
                        <h4>${location.total_orders || 0}</h4>
                        <p>Orders</p>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editLocation('${location.id}')" title="Edit Location">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete" onclick="deleteLocation('${location.id}')" title="Delete Location">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading locations grid:', error);
        showNotification('Error loading locations', 'error');
    }
}

async function updateLocationOverview() {
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*');
        
        if (error) throw error;
        
        const totalLocations = locations.length;
        const activeLocations = locations.filter(loc => loc.status === 'active').length;
        const totalLocationProducts = locations.reduce((sum, loc) => sum + (loc.total_products || 0), 0);
        const averageStock = totalLocations > 0 ? Math.round(totalLocationProducts / totalLocations) : 0;
        
        const totalLocationsEl = document.getElementById('totalLocations');
        const activeLocationsEl = document.getElementById('activeLocations');
        const totalLocationProductsEl = document.getElementById('totalLocationProducts');
        const averageStockEl = document.getElementById('averageStock');
        
        if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
        if (activeLocationsEl) activeLocationsEl.textContent = activeLocations;
        if (totalLocationProductsEl) totalLocationProductsEl.textContent = totalLocationProducts;
        if (averageStockEl) averageStockEl.textContent = averageStock;
    } catch (error) {
        console.error('Error updating location overview:', error);
    }
}

// Helper functions
async function addRecentActivity(activity) {
    try {
        const { error } = await supabase
            .from('recent_activities')
            .insert([{
                type: activity.type,
                message: activity.message,
                icon: activity.icon,
                color: activity.color,
                user_id: currentUser?.id
            }]);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error adding recent activity:', error);
    }
}

function getProductIcon(category) {
    const icons = {
        'groceries': 'fa-apple-alt',
        'dairy': 'fa-cheese',
        'meat': 'fa-drumstick-bite',
        'household': 'fa-home',
        'electronics': 'fa-laptop',
        'grills': 'fa-fire',
        'beverages': 'fa-wine-bottle',
        'snacks': 'fa-cookie-bite',
        'personal-care': 'fa-soap',
        'cleaning': 'fa-spray-can'
    };
    return icons[category] || 'fa-box';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
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

// Debounce function for search inputs
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

// Auto-save functionality
function enableAutoSave(interval = 30000) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(async () => {
        try {
            // Update last_sync timestamp in settings
            const { error } = await supabase
                .from('settings')
                .update({ last_sync: new Date().toISOString() })
                .neq('id', 0);

            if (error) throw error;

            // Update sync status
            updateSyncStatus();
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }, interval);
}

async function saveDataImmediately() {
    try {
        // Update last_sync timestamp in settings
        const { error } = await supabase
            .from('settings')
            .update({ last_sync: new Date().toISOString() })
            .neq('id', 0);

        if (error) throw error;

        updateSyncStatus();
    } catch (error) {
        console.error('Immediate save error:', error);
    }
}

async function updateSyncStatus() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('last_sync')
            .limit(1);

        if (error) throw error;

        const syncStatusEl = document.getElementById('syncStatus');
        const lastSyncEl = document.getElementById('lastSync');

        if (syncStatusEl && lastSyncEl) {
            if (settings && settings.length > 0 && settings[0].last_sync) {
                const lastSync = new Date(settings[0].last_sync);
                const now = new Date();
                const timeDiff = now - lastSync;

                syncStatusEl.textContent = 'Synced';
                syncStatusEl.className = 'sync-status synced';
                lastSyncEl.textContent = `Last sync: ${formatTimeAgo(timeDiff)}`;
            } else {
                syncStatusEl.textContent = 'Not synced';
                syncStatusEl.className = 'sync-status not-synced';
                lastSyncEl.textContent = 'Never synced';
            }
        }
    } catch (error) {
        console.error('Error updating sync status:', error);
        const syncStatusEl = document.getElementById('syncStatus');
        if (syncStatusEl) {
            syncStatusEl.textContent = 'Sync error';
            syncStatusEl.className = 'sync-status error';
        }
    }
}

async function updateSystemInfo() {
    try {
        const systemInfoEl = document.getElementById('systemInfo');
        if (!systemInfoEl) return;

        // Get database statistics
        const [
            { count: totalProducts },
            { count: totalOrders },
            { count: totalLocations },
            { data: recentActivity }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('locations').select('*', { count: 'exact', head: true }),
            supabase.from('recent_activities').select('*').order('created_at', { ascending: false }).limit(1)
        ]);

        const lastActivity = recentActivity && recentActivity.length > 0 ? 
            new Date(recentActivity[0].created_at).toLocaleString() : 'No recent activity';

        systemInfoEl.innerHTML = `
            <div class="system-stat">
                <span class="stat-label">Database Status:</span>
                <span class="stat-value connected">Connected</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Products:</span>
                <span class="stat-value">${totalProducts}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Orders:</span>
                <span class="stat-value">${totalOrders}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Locations:</span>
                <span class="stat-value">${totalLocations}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Last Activity:</span>
                <span class="stat-value">${lastActivity}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">System Time:</span>
                <span class="stat-value">${new Date().toLocaleString()}</span>
            </div>
        `;
    } catch (error) {
        console.error('Error updating system info:', error);
        const systemInfoEl = document.getElementById('systemInfo');
        if (systemInfoEl) {
            systemInfoEl.innerHTML = `
                <div class="system-stat">
                    <span class="stat-label">Database Status:</span>
                    <span class="stat-value error">Connection Error</span>
                </div>
            `;
        }
    }
}

// Export global functions for HTML onclick handlers
window.showSection = showSection;
window.logout = logout;
window.toggleProductSelection = toggleProductSelection;
window.toggleSelectAllProducts = toggleSelectAllProducts;
window.updateProductStock = updateProductStock;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.showOrderDetails = showOrderDetails;
window.printOrderDetails = printOrderDetails;
window.changePage = changePage;
window.goToPage = goToPage;
window.changeOrdersPage = changeOrdersPage;
window.goToOrdersPage = goToOrdersPage;
window.filterInventory = filterInventory;
window.filterOrders = filterOrders;

// Initialize authentication state listener
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
        currentUser = {
            id: session.user.id,
            email: session.user.email,
            role: 'administrator',
            loginTime: new Date().toISOString()
        };
        
        sessionStartTime = new Date();
        showAdminDashboard();
        await loadDashboardData();
        enableAutoSave();
        
        showNotification('Session restored', 'info');
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        sessionStartTime = null;
        
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        
        // Clear intervals
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
    }

//		
		
// Locations management
async function loadLocationsGrid() {
    const locationsGrid = document.getElementById('locationsGrid');
    if (!locationsGrid) return;
    
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        locationsGrid.innerHTML = locations.map((location, index) => `
            <div class="location-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="location-header">
                    <h3 class="location-name">${location.name}</h3>
                    <span class="location-status ${location.status}">${location.status}</span>
                </div>
                <div class="location-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                    <p><i class="fas fa-phone"></i> <a href="tel:${location.phone}">${location.phone}</a></p>
                    <p><i class="fas fa-user"></i> Manager: ${location.manager}</p>
                    <p><i class="fas fa-clock"></i> ${location.hours}</p>
                </div>
                <div class="location-stats">
                    <div class="location-stat">
                        <h4>${location.total_products || 0}</h4>
                        <p>Products</p>
                    </div>
                    <div class="location-stat">
                        <h4>${location.total_orders || 0}</h4>
                        <p>Orders</p>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editLocation('${location.id}')" title="Edit Location">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete" onclick="deleteLocation('${location.id}')" title="Delete Location">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading locations:', error);
        showNotification('Error loading locations', 'error');
    }
}

async function updateLocationOverview() {
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*');
        
        if (error) throw error;
        
        const totalLocations = locations.length;
        const activeLocations = locations.filter(loc => loc.status === 'active').length;
        const totalLocationProducts = locations.reduce((sum, loc) => sum + (loc.total_products || 0), 0);
        const averageStock = totalLocations > 0 ? Math.round(totalLocationProducts / totalLocations) : 0;
        
        const totalLocationsEl = document.getElementById('totalLocations');
        const activeLocationsEl = document.getElementById('activeLocations');
        const totalLocationProductsEl = document.getElementById('totalLocationProducts');
        const averageStockEl = document.getElementById('averageStock');
        
        if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
        if (activeLocationsEl) activeLocationsEl.textContent = activeLocations;
        if (totalLocationProductsEl) totalLocationProductsEl.textContent = totalLocationProducts;
        if (averageStockEl) averageStockEl.textContent = averageStock;
    } catch (error) {
        console.error('Error updating location overview:', error);
    }
}

async function editLocation(locationId) {
    try {
        const { data: location, error } = await supabase
            .from('locations')
            .select('*')
            .eq('id', locationId)
            .single();
        
        if (error) throw error;
        if (!location) return;
        
        showAddLocationModal();
        
        // Fill form with existing data
        document.getElementById('locationName').value = location.name;
        document.getElementById('locationId').value = location.id;
        document.getElementById('locationAddress').value = location.address;
        document.getElementById('locationPhone').value = location.phone;
        document.getElementById('locationManager').value = location.manager;
        document.getElementById('locationHours').value = location.hours;
        document.getElementById('locationStatus').value = location.status;
        
        // Change form submission to update
        const form = document.getElementById('addLocationForm');
        form.onsubmit = (e) => handleUpdateLocation(e, locationId);
    } catch (error) {
        console.error('Error loading location for edit:', error);
        showNotification('Error loading location data', 'error');
    }
}

async function deleteLocation(locationId) {
    try {
        const { data: location, error } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
        
        if (error) throw error;
        if (!location) return;
        
        showConfirmation(
            'Delete Location',
            `Are you sure you want to delete "${location.name}"? This will also remove all stock data for this location.`,
            async () => {
                try {
                    // Remove location from product stock (if using JSONB column)
                    const { error: stockError } = await supabase.rpc('remove_location_from_stock', {
                        location_id: locationId
                    });
                    
                    if (stockError) throw stockError;
                    
                    // Delete location
                    const { error: deleteError } = await supabase
                        .from('locations')
                        .delete()
                        .eq('id', locationId);
                    
                    if (deleteError) throw deleteError;
                    
                    loadLocationsGrid();
                    updateLocationOverview();
                    loadInventoryTable();
                    showNotification('Location deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting location:', error);
                    showNotification('Error deleting location', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error loading location for delete:', error);
        showNotification('Error loading location data', 'error');
    }
}

// Product management modals
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.add('active');
    overlay.classList.add('active');
    
    // Reset form and modal title
    document.getElementById('addProductForm').reset();
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Add New Product';
    document.getElementById('submitButtonText').textContent = 'Add Product';
    
    // Reset form submission handler
    const form = document.getElementById('addProductForm');
    form.onsubmit = handleAddProduct;
}

function showAddLocationModal() {
    const modal = document.getElementById('addLocationModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.add('active');
    overlay.classList.add('active');
    
    // Reset form
    document.getElementById('addLocationForm').reset();
    
    // Reset form submission handler
    const form = document.getElementById('addLocationForm');
    form.onsubmit = handleAddLocation;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.remove('active');
    overlay.classList.remove('active');
    
    // Reset forms
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => form.reset());
}

async function handleAddProduct(event) {
    event.preventDefault();
    
    try {
        const newProduct = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: parseFloat(document.getElementById('productPrice').value),
            unit: document.getElementById('productUnit').value,
            description: document.getElementById('productDescription').value,
            image: document.getElementById('productImage').value || '',
            stock: {
                'ikeja': parseInt(document.getElementById('stock-ikeja').value) || 0,
                'victoria-island': parseInt(document.getElementById('stock-victoria-island').value) || 0,
                'surulere': parseInt(document.getElementById('stock-surulere').value) || 0,
                'lekki': parseInt(document.getElementById('stock-lekki').value) || 0,
                'ajah': parseInt(document.getElementById('stock-ajah').value) || 0,
                'yaba': parseInt(document.getElementById('stock-yaba').value) || 0
            }
        };
        
        const { data, error } = await supabase
            .from('products')
            .insert([newProduct])
            .select()
            .single();
        
        if (error) throw error;
        
        loadInventoryTable();
        updateDashboardStats();
        closeModal('addProductModal');
        showNotification('Product added successfully', 'success');
        
        // Add to recent activity
        await addRecentActivity({
            type: 'product_add',
            message: `New product "${newProduct.name}" added`,
            icon: 'fa-plus',
            color: '#27ae60'
        });
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Error adding product', 'error');
    }
}

async function handleUpdateProduct(event, productId) {
    event.preventDefault();
    
    try {
        const updatedProduct = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: parseFloat(document.getElementById('productPrice').value),
            unit: document.getElementById('productUnit').value,
            description: document.getElementById('productDescription').value,
            image: document.getElementById('productImage').value || '',
            stock: {
                'ikeja': parseInt(document.getElementById('stock-ikeja').value) || 0,
                'victoria-island': parseInt(document.getElementById('stock-victoria-island').value) || 0,
                'surulere': parseInt(document.getElementById('stock-surulere').value) || 0,
                'lekki': parseInt(document.getElementById('stock-lekki').value) || 0,
                'ajah': parseInt(document.getElementById('stock-ajah').value) || 0,
                'yaba': parseInt(document.getElementById('stock-yaba').value) || 0
            },
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('products')
            .update(updatedProduct)
            .eq('id', productId);
        
        if (error) throw error;
        
        loadInventoryTable();
        updateDashboardStats();
        closeModal('addProductModal');
        showNotification('Product updated successfully', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product', 'error');
    }
}

async function handleAddLocation(event) {
    event.preventDefault();
    
    try {
        const newLocation = {
            id: document.getElementById('locationId').value,
            name: document.getElementById('locationName').value,
            address: document.getElementById('locationAddress').value,
            phone: document.getElementById('locationPhone').value,
            manager: document.getElementById('locationManager').value,
            hours: document.getElementById('locationHours').value || 'Mon-Sun: 8:00 AM - 10:00 PM',
            status: document.getElementById('locationStatus').value,
            total_products: 0,
            total_orders: 0
        };
        
        const { data, error } = await supabase
            .from('locations')
            .insert([newLocation])
            .select()
            .single();
        
        if (error) throw error;
        
        // Add location to all existing products' stock using RPC function
        await supabase.rpc('add_location_to_all_products', {
            location_id: newLocation.id
        });
        
        loadLocationsGrid();
        updateLocationOverview();
        loadInventoryTable();
        closeModal('addLocationModal');
        showNotification('Location added successfully', 'success');
    } catch (error) {
        console.error('Error adding location:', error);
        showNotification('Error adding location', 'error');
    }
}

async function handleUpdateLocation(event, locationId) {
    event.preventDefault();
    
    try {
        const oldLocationId = locationId;
        const newLocationId = document.getElementById('locationId').value;
        
        const updatedLocation = {
            id: newLocationId,
            name: document.getElementById('locationName').value,
            address: document.getElementById('locationAddress').value,
            phone: document.getElementById('locationPhone').value,
            manager: document.getElementById('locationManager').value,
            hours: document.getElementById('locationHours').value,
            status: document.getElementById('locationStatus').value,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('locations')
            .update(updatedLocation)
            .eq('id', oldLocationId);
        
        if (error) throw error;
        
        // If location ID changed, update all products' stock using RPC function
        if (oldLocationId !== newLocationId) {
            await supabase.rpc('update_location_id_in_stock', {
                old_location_id: oldLocationId,
                new_location_id: newLocationId
            });
        }
        
        loadLocationsGrid();
        updateLocationOverview();
        loadInventoryTable();
        closeModal('addLocationModal');
        showNotification('Location updated successfully', 'success');
    } catch (error) {
        console.error('Error updating location:', error);
        showNotification('Error updating location', 'error');
    }
}

// Bulk operations
async function bulkUpdateStock() {
    if (selectedProducts.length === 0) {
        showNotification('Please select products to update', 'warning');
        return;
    }
    
    const modal = document.getElementById('bulkUpdateModal');
    const overlay = document.getElementById('modalOverlay');
    
    document.getElementById('selectedProductsCount').textContent = selectedProducts.length;
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

async function applyBulkUpdate() {
    const updateType = document.getElementById('bulkUpdateType').value;
    const stockAmount = parseInt(document.getElementById('bulkStockAmount').value) || 0;
    const selectedLocations = Array.from(document.querySelectorAll('#bulkUpdateModal input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    if (selectedLocations.length === 0) {
        showNotification('Please select at least one location', 'warning');
        return;
    }
    
    try {
        // Use RPC function for bulk stock update
        const { error } = await supabase.rpc('bulk_update_stock', {
            product_ids: selectedProducts,
            locations: selectedLocations,
            update_type: updateType,
            stock_amount: stockAmount
        });
        
        if (error) throw error;
        
        loadInventoryTable();
        updateDashboardStats();
        closeModal('bulkUpdateModal');
        
        // Clear selections
        selectedProducts = [];
                document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
        updateBulkActionButtons();
        updateSelectAllCheckbox();
        
        showNotification(`Bulk update applied to ${selectedProducts.length} products`, 'success');
    } catch (error) {
        console.error('Error applying bulk update:', error);
        showNotification('Error applying bulk update', 'error');
    }
}

async function bulkDeleteProducts() {
    if (selectedProducts.length === 0) {
        showNotification('Please select products to delete', 'warning');
        return;
    }
    
    showConfirmation(
        'Delete Selected Products',
        `Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`,
        async () => {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .in('id', selectedProducts);
                
                if (error) throw error;
                
                const deletedCount = selectedProducts.length;
                selectedProducts = [];
                
                loadInventoryTable();
                updateDashboardStats();
                updateBulkActionButtons();
                showNotification(`${deletedCount} products deleted successfully`, 'success');
            } catch (error) {
                console.error('Error deleting products:', error);
                showNotification('Error deleting products', 'error');
            }
        }
    );
}

// Analytics and reporting
async function generateAnalytics() {
    const dateFrom = document.getElementById('analyticsDateFrom')?.value;
    const dateTo = document.getElementById('analyticsDateTo')?.value;
    
    if (!dateFrom || !dateTo) {
        showNotification('Please select date range for analytics', 'warning');
        return;
    }
    
    showLoadingOverlay();
    
    try {
        const report = await generateSalesReport(dateFrom, dateTo);
        updateAnalyticsDisplay(report);
        hideLoadingOverlay();
        showNotification('Analytics generated successfully', 'success');
    } catch (error) {
        console.error('Error generating analytics:', error);
        hideLoadingOverlay();
        showNotification('Error generating analytics', 'error');
    }
}

async function generateSalesReport(startDate, endDate) {
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
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get products for category mapping
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('name, category');
        
        if (productsError) throw productsError;
        
        const productCategoryMap = {};
        products.forEach(product => {
            productCategoryMap[product.name] = product.category;
        });
        
        const report = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
            averageOrderValue: orders.length > 0 ? 
                orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
            ordersByLocation: {},
            ordersByStatus: {},
            ordersByType: { delivery: 0, pickup: 0 },
            topProducts: {},
            dailySales: {},
            categoryPerformance: {}
        };
        
        orders.forEach(order => {
            // Orders by location
            report.ordersByLocation[order.location] = 
                (report.ordersByLocation[order.location] || 0) + 1;
            
            // Orders by status
            report.ordersByStatus[order.status] = 
                (report.ordersByStatus[order.status] || 0) + 1;
            
            // Orders by type
            report.ordersByType[order.delivery_type]++;
            
            // Daily sales
            const orderDay = new Date(order.created_at).toDateString();
            report.dailySales[orderDay] = (report.dailySales[orderDay] || 0) + order.total;
            
            // Top products and category performance
            order.order_items.forEach(item => {
                if (report.topProducts[item.product_name]) {
                    report.topProducts[item.product_name].quantity += item.quantity;
                    report.topProducts[item.product_name].revenue += item.quantity * item.price;
                } else {
                    report.topProducts[item.product_name] = {
                        quantity: item.quantity,
                        revenue: item.quantity * item.price
                    };
                }
                
                // Category performance
                const category = productCategoryMap[item.product_name];
                if (category) {
                    if (report.categoryPerformance[category]) {
                        report.categoryPerformance[category] += item.quantity * item.price;
                    } else {
                        report.categoryPerformance[category] = item.quantity * item.price;
                    }
                }
            });
        });
        
        return report;
    } catch (error) {
        console.error('Error generating sales report:', error);
        throw error;
    }
}

function updateAnalyticsDisplay(report) {
    // Update location performance
    const locationPerformance = document.getElementById('locationPerformance');
    if (locationPerformance) {
        locationPerformance.innerHTML = Object.entries(report.ordersByLocation)
            .sort(([,a], [,b]) => b - a)
            .map(([location, orders]) => `
                <div class="performance-item">
                    <div class="performance-location">${location.replace('-', ' ')}</div>
                    <div class="performance-metric">${orders} orders</div>
                </div>
            `).join('');
    }
    
    // Update inventory turnover
    const turnoverData = document.getElementById('turnoverData');
    if (turnoverData) {
        const topProducts = Object.entries(report.topProducts)
            .sort(([,a], [,b]) => b.quantity - a.quantity)
            .slice(0, 5);
        
        turnoverData.innerHTML = topProducts.map(([name, data]) => `
            <div class="turnover-item">
                <div class="turnover-product">${name}</div>
                <div class="turnover-metric">${data.quantity} sold</div>
            </div>
        `).join('');
    }
    
    // Simulate chart updates (in a real app, you'd use a charting library)
    updateChartPlaceholders(report);
}

function updateChartPlaceholders(report) {
    const salesChart = document.getElementById('salesChart');
    const categoryChart = document.getElementById('categoryChart');
    
    if (salesChart) {
        salesChart.parentElement.innerHTML = `
            <div class="chart-placeholder">
                <div class="chart-data">
                    <h4>Sales Trend</h4>
                    <p>Total Revenue: ₦${report.totalRevenue.toLocaleString()}</p>
                    <p>Average Order: ₦${Math.round(report.averageOrderValue).toLocaleString()}</p>
                    <p>Total Orders: ${report.totalOrders}</p>
                </div>
            </div>
        `;
    }
    
    if (categoryChart) {
        categoryChart.parentElement.innerHTML = `
            <div class="chart-placeholder">
                <div class="chart-data">
                    <h4>Category Performance</h4>
                    ${Object.entries(report.categoryPerformance)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([category, revenue]) => `
                            <p>${category}: ₦${revenue.toLocaleString()}</p>
                        `).join('')}
                </div>
            </div>
        `;
    }
}

async function generateReport(reportType) {
    showLoadingOverlay();
    
    try {
        switch (reportType) {
            case 'sales':
                await printReport('sales');
                break;
            case 'inventory':
                await printReport('inventory');
                break;
            case 'customers':
                await generateCustomerReport();
                break;
            case 'financial':
                await generateFinancialReport();
                break;
            case 'summary':
                await generateSummaryReport();
                break;
        }
        hideLoadingOverlay();
    } catch (error) {
        console.error('Error generating report:', error);
        hideLoadingOverlay();
        showNotification('Error generating report', 'error');
    }
}

async function generateCustomerReport() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('customer_name, customer_phone, customer_email, total');
        
        if (error) throw error;
        
        const customerData = {};
        
        orders.forEach(order => {
            const customerKey = order.customer_name;
            if (customerData[customerKey]) {
                customerData[customerKey].orders++;
                customerData[customerKey].totalSpent += order.total;
            } else {
                customerData[customerKey] = {
                    orders: 1,
                    totalSpent: order.total,
                    phone: order.customer_phone,
                    email: order.customer_email || 'N/A'
                };
            }
        });
        
        const sortedCustomers = Object.entries(customerData)
            .sort(([,a], [,b]) => b.totalSpent - a.totalSpent);
        
        const reportContent = `
            <h2>Customer Report</h2>
            <table>
                <thead>
                    <tr>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Total Orders</th>
                        <th>Total Spent</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedCustomers.map(([name, data]) => `
                        <tr>
                            <td>${name}</td>
                            <td>${data.phone}</td>
                            <td>${data.email}</td>
                            <td>${data.orders}</td>
                            <td>₦${data.totalSpent.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        openPrintWindow('Customer Report', reportContent);
    } catch (error) {
        console.error('Error generating customer report:', error);
        throw error;
    }
}

async function generateFinancialReport() {
    try {
        const today = new Date();
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString();
        
        // Get this month's orders
        const { data: thisMonthOrders, error: thisMonthError } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', thisMonthStart);
        
        if (thisMonthError) throw thisMonthError;
        
        // Get last month's orders
        const { data: lastMonthOrders, error: lastMonthError } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', lastMonthStart)
            .lte('created_at', lastMonthEnd);
        
        if (lastMonthError) throw lastMonthError;
        
        const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
        const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
        const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
        
        const reportContent = `
            <h2>Financial Report</h2>
            <div class="financial-summary">
                <div class="financial-item">
                    <h3>This Month</h3>
                    <p>Revenue: ₦${thisMonthRevenue.toLocaleString()}</p>
                    <p>Orders: ${thisMonthOrders.length}</p>
                </div>
                <div class="financial-item">
                    <h3>Last Month</h3>
                    <p>Revenue: ₦${lastMonthRevenue.toLocaleString()}</p>
                    <p>Orders: ${lastMonthOrders.length}</p>
                </div>
                <div class="financial-item">
                    <h3>Growth</h3>
                    <p style="color: ${growth >= 0 ? '#27ae60' : '#e74c3c'}">
                        ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%
                    </p>
                </div>
            </div>
        `;
        
        openPrintWindow('Financial Report', reportContent);
    } catch (error) {
        console.error('Error generating financial report:', error);
        throw error;
    }
}

async function generateSummaryReport() {
    try {
        // Get counts from different tables
        const [
            { count: totalProducts },
            { count: totalOrders },
            { data: revenueData },
            { count: totalLocations }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('total'),
            supabase.from('locations').select('*', { count: 'exact', head: true })
        ]);
        
        const totalRevenue = revenueData.reduce((sum, order) => sum + order.total, 0);
        
        // Get recent orders for activity
        const { data: recentOrders, error: ordersError } = await supabase
            .from('orders')
            .select('id, customer_name, total')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (ordersError) throw ordersError;
        
        const reportContent = `
            <h2>System Summary Report</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <h3>Products</h3>
                    <p class="summary-number">${totalProducts}</p>
                </div>
                <div class="summary-item">
                    <h3>Orders</h3>
                    <p class="summary-number">${totalOrders}</p>
                </div>
                <div class="summary-item">
                    <h3>Revenue</h3>
                    <p class="summary-number">₦${totalRevenue.toLocaleString()}</p>
                </div>
                <div class="summary-item">
                    <h3>Locations</h3>
                    <p class="summary-number">${totalLocations}</p>
                </div>
            </div>
            
            <h3>Recent Activity</h3>
            <ul>
                ${recentOrders.map(order => `
                    <li>Order ${order.id} - ${order.customer_name} - ₦${order.total.toLocaleString()}</li>
				                `).join('')}
            </ul>
        `;
        
        openPrintWindow('Summary Report', reportContent);
    } catch (error) {
        console.error('Error generating summary report:', error);
        throw error;
    }
}

// Helper function to add recent activity
async function addRecentActivity(activity) {
    try {
        const { error } = await supabase
            .from('recent_activities')
            .insert([{
                type: activity.type,
                message: activity.message,
                icon: activity.icon,
                color: activity.color
            }]);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error adding recent activity:', error);
    }
}

// Additional helper functions for inventory and dashboard
async function loadInventoryTable() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                locations!inner(id, name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Update inventory table display
        updateInventoryDisplay(products);
    } catch (error) {
        console.error('Error loading inventory:', error);
        showNotification('Error loading inventory', 'error');
    }
}

async function updateDashboardStats() {
    try {
        const [
            { count: totalProducts },
            { count: totalOrders },
            { data: revenueData },
            { count: totalLocations }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('total'),
            supabase.from('locations').select('*', { count: 'exact', head: true })
        ]);
        
        const totalRevenue = revenueData.reduce((sum, order) => sum + order.total, 0);
        
        // Update dashboard elements
        const totalProductsEl = document.getElementById('totalProducts');
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const totalLocationsEl = document.getElementById('totalLocations');
        
        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = `₦${totalRevenue.toLocaleString()}`;
        if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Print report helper function
async function printReport(reportType) {
    try {
        let reportContent = '';
        
        switch (reportType) {
            case 'sales':
                const { data: salesData, error: salesError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            product_name,
                            quantity,
                            price
                        )
                    `)
                    .order('created_at', { ascending: false });
                
                if (salesError) throw salesError;
                
                reportContent = `
                    <h2>Sales Report</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesData.map(order => `
                                <tr>
                                    <td>${order.id}</td>
                                    <td>${order.customer_name}</td>
                                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>${order.location}</td>
                                    <td>${order.status}</td>
                                    <td>₦${order.total.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                break;
                
            case 'inventory':
                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('products')
                    .select('*')
                    .order('name');
                
                if (inventoryError) throw inventoryError;
                
                reportContent = `
                    <h2>Inventory Report</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Unit</th>
                                <th>Total Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryData.map(product => {
                                const totalStock = Object.values(product.stock || {}).reduce((sum, qty) => sum + qty, 0);
                                return `
                                    <tr>
                                        <td>${product.name}</td>
                                        <td>${product.category}</td>
                                        <td>₦${product.price.toLocaleString()}</td>
                                        <td>${product.unit}</td>
                                        <td>${totalStock}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
                break;
        }
        
        openPrintWindow(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, reportContent);
    } catch (error) {
        console.error(`Error generating ${reportType} report:`, error);
        throw error;
    }
}

// Initialize data loading when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await Promise.all([
            loadLocationsGrid(),
            updateLocationOverview(),
            loadInventoryTable(),
            updateDashboardStats()
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
});


// Settings management
function showSettingsTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

async function saveSettings() {
    try {
        const settings = {
            // General settings
            store_name: document.getElementById('storeName')?.value,
            store_description: document.getElementById('storeDescription')?.value,
            business_hours: document.getElementById('businessHours')?.value,
            currency: document.getElementById('currency')?.value,
            default_language: document.getElementById('defaultLanguage')?.value,
            time_zone: document.getElementById('timeZone')?.value,
            auto_save_interval: document.getElementById('autoSaveInterval')?.value,
            
            // Delivery settings
            base_delivery_fee: document.getElementById('baseDeliveryFee')?.value,
            free_delivery_threshold: document.getElementById('freeDeliveryThreshold')?.value,
            delivery_radius: document.getElementById('deliveryRadius')?.value,
            delivery_time: document.getElementById('deliveryTime')?.value,
            pickup_time: document.getElementById('pickupTime')?.value,
            scheduled_pickup: document.getElementById('scheduledPickup')?.checked,
            pickup_slots: document.getElementById('pickupSlots')?.value,
            
            // Notification settings
            low_stock_threshold: document.getElementById('lowStockThreshold')?.value,
            email_notifications: document.getElementById('emailNotifications')?.checked,
            sms_notifications: document.getElementById('smsNotifications')?.checked,
            notification_email: document.getElementById('notificationEmail')?.value,
            new_order_alerts: document.getElementById('newOrderAlerts')?.checked,
            order_status_updates: document.getElementById('orderStatusUpdates')?.checked,
            daily_summary: document.getElementById('dailySummary')?.checked,
            
            // Integration settings
            default_whatsapp: document.getElementById('defaultWhatsApp')?.value,
            order_template: document.getElementById('orderTemplate')?.value,
            enable_whatsapp: document.getElementById('enableWhatsApp')?.checked,
            payment_gateway: document.getElementById('paymentGateway')?.value,
            payment_api_key: document.getElementById('paymentApiKey')?.value,
            enable_online_payments: document.getElementById('enableOnlinePayments')?.checked,
            bank_details: document.getElementById('bankDetails')?.value,
            
            // Security settings
            session_timeout: document.getElementById('sessionTimeout')?.value,
            auto_logout: document.getElementById('autoLogout')?.checked,
            remember_login: document.getElementById('rememberLogin')?.checked,
            backup_frequency: document.getElementById('backupFrequency')?.value,
            data_retention: document.getElementById('dataRetention')?.value
        };

        // Check if settings record exists
        const { data: existingSettings, error: fetchError } = await supabase
            .from('settings')
            .select('id')
            .limit(1);

        if (fetchError) throw fetchError;

        let result;
        if (existingSettings && existingSettings.length > 0) {
            // Update existing settings
            result = await supabase
                .from('settings')
                .update(settings)
                .eq('id', existingSettings[0].id);
        } else {
            // Insert new settings
            result = await supabase
                .from('settings')
                .insert([settings]);
        }

        if (result.error) throw result.error;

        showNotification('Settings saved successfully', 'success');
        
        // Update auto-save interval if changed
        const newInterval = parseInt(settings.auto_save_interval) * 1000;
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        enableAutoSave(newInterval);

    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1);

        if (error) throw error;

        if (settings && settings.length > 0) {
            const setting = settings[0];
            
            // Load general settings
            if (setting.store_name) document.getElementById('storeName').value = setting.store_name;
            if (setting.store_description) document.getElementById('storeDescription').value = setting.store_description;
            if (setting.business_hours) document.getElementById('businessHours').value = setting.business_hours;
            if (setting.currency) document.getElementById('currency').value = setting.currency;
            if (setting.default_language) document.getElementById('defaultLanguage').value = setting.default_language;
            if (setting.time_zone) document.getElementById('timeZone').value = setting.time_zone;
            if (setting.auto_save_interval) document.getElementById('autoSaveInterval').value = setting.auto_save_interval;
            
            // Load delivery settings
            if (setting.base_delivery_fee) document.getElementById('baseDeliveryFee').value = setting.base_delivery_fee;
            if (setting.free_delivery_threshold) document.getElementById('freeDeliveryThreshold').value = setting.free_delivery_threshold;
            if (setting.delivery_radius) document.getElementById('deliveryRadius').value = setting.delivery_radius;
            if (setting.delivery_time) document.getElementById('deliveryTime').value = setting.delivery_time;
            if (setting.pickup_time) document.getElementById('pickupTime').value = setting.pickup_time;
            if (setting.scheduled_pickup !== undefined) document.getElementById('scheduledPickup').checked = setting.scheduled_pickup;
            if (setting.pickup_slots) document.getElementById('pickupSlots').value = setting.pickup_slots;
            
            // Load notification settings
            if (setting.low_stock_threshold) document.getElementById('lowStockThreshold').value = setting.low_stock_threshold;
            if (setting.email_notifications !== undefined) document.getElementById('emailNotifications').checked = setting.email_notifications;
            if (setting.sms_notifications !== undefined) document.getElementById('smsNotifications').checked = setting.sms_notifications;
            if (setting.notification_email) document.getElementById('notificationEmail').value = setting.notification_email;
            if (setting.new_order_alerts !== undefined) document.getElementById('newOrderAlerts').checked = setting.new_order_alerts;
            if (setting.order_status_updates !== undefined) document.getElementById('orderStatusUpdates').checked = setting.order_status_updates;
            if (setting.daily_summary !== undefined) document.getElementById('dailySummary').checked = setting.daily_summary;
            
            // Load integration settings
            if (setting.default_whatsapp) document.getElementById('defaultWhatsApp').value = setting.default_whatsapp;
            if (setting.order_template) document.getElementById('orderTemplate').value = setting.order_template;
            if (setting.enable_whatsapp !== undefined) document.getElementById('enableWhatsApp').checked = setting.enable_whatsapp;
            if (setting.payment_gateway) document.getElementById('paymentGateway').value = setting.payment_gateway;
            if (setting.payment_api_key) document.getElementById('paymentApiKey').value = setting.payment_api_key;
            if (setting.enable_online_payments !== undefined) document.getElementById('enableOnlinePayments').checked = setting.enable_online_payments;
            if (setting.bank_details) document.getElementById('bankDetails').value = setting.bank_details;
            
            // Load security settings
            if (setting.session_timeout) document.getElementById('sessionTimeout').value = setting.session_timeout;
            if (setting.auto_logout !== undefined) document.getElementById('autoLogout').checked = setting.auto_logout;
            if (setting.remember_login !== undefined) document.getElementById('rememberLogin').checked = setting.remember_login;
            if (setting.backup_frequency) document.getElementById('backupFrequency').value = setting.backup_frequency;
            if (setting.data_retention) document.getElementById('dataRetention').value = setting.data_retention;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

async function resetSettings() {
    showConfirmation(
        'Reset Settings',
        'Are you sure you want to reset all settings to default values?',
        async () => {
            try {
                // Delete existing settings
                const { error: deleteError } = await supabase
                    .from('settings')
                    .delete()
                    .neq('id', 0); // Delete all records

                if (deleteError) throw deleteError;

                // Insert default settings
                const defaultSettings = {
                    store_name: 'FreshMart',
                    store_description: 'Your trusted supermarket with multiple locations across Lagos.',
                    business_hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                    currency: 'NGN',
                    default_language: 'en',
                    time_zone: 'Africa/Lagos',
                    auto_save_interval: '30',
                    base_delivery_fee: '1500',
                    free_delivery_threshold: '25000',
                    delivery_radius: '15',
                    delivery_time: '30-60 minutes',
                    pickup_time: '15-30 minutes',
                    scheduled_pickup: true,
                    low_stock_threshold: '10',
                    email_notifications: true,
                    sms_notifications: false,
                    notification_email: 'admin@freshmart.ng',
                    new_order_alerts: true,
                    order_status_updates: true,
                    daily_summary: true,
                    default_whatsapp: '+2348123456000',
                    enable_whatsapp: true,
                    payment_gateway: 'none',
                    enable_online_payments: false,
                    session_timeout: '60',
                    auto_logout: true,
                    remember_login: false,
                    backup_frequency: 'daily',
                    data_retention: '365'
                };

                const { error: insertError } = await supabase
                    .from('settings')
                    .insert([defaultSettings]);

                if (insertError) throw insertError;

                // Reload settings to update form
                await loadSettings();
                
                showNotification('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                showNotification('Error resetting settings', 'error');
            }
        }
    );
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters long', 'error');
        return;
    }

    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Update password using Supabase Auth
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showNotification('Password changed successfully. Please login again.', 'success');
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Auto logout after password change
        setTimeout(async () => {
            await logout();
        }, 2000);

    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Error changing password', 'error');
    }
}

// Data management functions
async function exportData(type) {
    try {
        let data, filename;
        
        switch(type) {
            case 'products':
                const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select('*');
                if (productsError) throw productsError;
                data = products;
                filename = 'freshmart-products.json';
                break;
                
            case 'orders':
                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (*)
                    `);
                if (ordersError) throw ordersError;
                data = orders;
                filename = 'freshmart-orders.json';
                break;
                
            case 'locations':
                const { data: locations, error: locationsError } = await supabase
                    .from('locations')
                    .select('*');
                if (locationsError) throw locationsError;
                data = locations;
                filename = 'freshmart-locations.json';
                break;
                
            case 'all':
                const [productsResult, ordersResult, locationsResult] = await Promise.all([
                    supabase.from('products').select('*'),
                    supabase.from('orders').select('*, order_items (*)'),
                    supabase.from('locations').select('*')
                ]);
                
                if (productsResult.error) throw productsResult.error;
                if (ordersResult.error) throw ordersResult.error;
                if (locationsResult.error) throw locationsResult.error;
                
                data = {
                    products: productsResult.data,
                    orders: ordersResult.data,
                    locations: locationsResult.data,
                    exportDate: new Date().toISOString()
                };
                filename = 'freshmart-complete-backup.json';
                break;
                
            case 'dashboard':
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const endDate = new Date().toISOString().split('T')[0];
                const report = await generateSalesReport(startDate, endDate);
                data = report;
                filename = 'freshmart-dashboard-report.json';
                break;
                
            case 'top-products':
                const { data: topProductsData, error: topProductsError } = await supabase
                    .rpc('get_top_products');
                if (topProductsError) throw topProductsError;
                data = topProductsData;
                filename = 'freshmart-top-products.json';
                break;
                
            default:
                showNotification('Invalid export type', 'error');
                return;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
		        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`${type} data exported successfully`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting data', 'error');
    }
}

async function exportAllData() {
    await exportData('all');
}

async function clearOldData() {
    try {
        // Get retention days from settings
        const { data: settings, error: settingsError } = await supabase
            .from('settings')
            .select('data_retention')
            .limit(1);

        if (settingsError) throw settingsError;

        const retentionDays = settings && settings.length > 0 ? 
            parseInt(settings[0].data_retention) || 365 : 365;
        
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        
        showConfirmation(
            'Clear Old Data',
            `This will permanently delete all orders older than ${retentionDays} days. Are you sure?`,
            async () => {
                try {
                    // Get count of orders to be deleted
                    const { count: oldOrderCount, error: countError } = await supabase
                        .from('orders')
                        .select('*', { count: 'exact', head: true })
                        .lt('created_at', cutoffDate);

                    if (countError) throw countError;

                    // Delete old orders (order_items will be deleted automatically due to CASCADE)
                    const { error: deleteError } = await supabase
                        .from('orders')
                        .delete()
                        .lt('created_at', cutoffDate);

                    if (deleteError) throw deleteError;

                    // Refresh data displays
                    await Promise.all([
                        loadOrdersTable(),
                        updateDashboardStats()
                    ]);
                    
                    showNotification(`Deleted ${oldOrderCount || 0} old orders`, 'success');
                } catch (error) {
                    console.error('Error clearing old data:', error);
                    showNotification('Error clearing old data', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error getting retention settings:', error);
        showNotification('Error accessing retention settings', 'error');
    }
}

// Auto-save functionality
async function enableAutoSave(interval = 30000) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(async () => {
        try {
            // Update last_sync timestamp in settings
            const { error } = await supabase
                .from('settings')
                .update({ last_sync: new Date().toISOString() })
                .neq('id', 0); // Update all settings records

            if (error) throw error;

            // Update sync status
            updateSyncStatus();
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }, interval);
}

async function saveDataImmediately() {
    try {
        // Update last_sync timestamp in settings
        const { error } = await supabase
            .from('settings')
            .update({ last_sync: new Date().toISOString() })
            .neq('id', 0); // Update all settings records

        if (error) throw error;

        updateSyncStatus();
    } catch (error) {
        console.error('Immediate save error:', error);
    }
}

async function loadAutoSavedData() {
    try {
        // Get last sync time from settings
        const { data: settings, error } = await supabase
            .from('settings')
            .select('last_sync')
            .limit(1);

        if (error) throw error;

        if (settings && settings.length > 0 && settings[0].last_sync) {
            console.log(`Data last synced: ${new Date(settings[0].last_sync).toLocaleString()}`);
        }

        // Load all data from Supabase
        await Promise.all([
            loadLocationsGrid(),
            loadInventoryTable(),
            loadOrdersTable(),
            updateDashboardStats()
        ]);

    } catch (error) {
        console.error('Error loading auto-saved data:', error);
    }
}

// Backup and restore functions
async function createBackup() {
    try {
        showLoadingOverlay();

        // Get all data
        const [productsResult, ordersResult, locationsResult, settingsResult] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*, order_items (*)'),
            supabase.from('locations').select('*'),
            supabase.from('settings').select('*')
        ]);

        if (productsResult.error) throw productsResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (locationsResult.error) throw locationsResult.error;
        if (settingsResult.error) throw settingsResult.error;

        const backupData = {
            products: productsResult.data,
            orders: ordersResult.data,
            locations: locationsResult.data,
            settings: settingsResult.data,
            backup_date: new Date().toISOString(),
            version: '1.0'
        };

        // Store backup in Supabase
        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                backup_data: backupData,
                backup_type: 'manual',
                created_by: 'admin'
            }]);

        if (backupError) throw backupError;

        hideLoadingOverlay();
        showNotification('Backup created successfully', 'success');

        // Also download backup file
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `freshmart-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        hideLoadingOverlay();
        console.error('Backup error:', error);
        showNotification('Error creating backup', 'error');
    }
}

async function restoreFromBackup(backupFile) {
    try {
        showLoadingOverlay();

        const fileContent = await backupFile.text();
        const backupData = JSON.parse(fileContent);

        // Validate backup data structure
        if (!backupData.products || !backupData.orders || !backupData.locations) {
            throw new Error('Invalid backup file format');
        }

        showConfirmation(
            'Restore Backup',
            'This will replace all current data with the backup data. Are you sure?',
            async () => {
                try {
                    // Clear existing data
                    await Promise.all([
                        supabase.from('order_items').delete().neq('id', 0),
                        supabase.from('orders').delete().neq('id', 0),
                        supabase.from('products').delete().neq('id', 0),
                        supabase.from('locations').delete().neq('id', 0),
                        supabase.from('settings').delete().neq('id', 0)
                    ]);

                    // Restore data
                    await Promise.all([
                        supabase.from('locations').insert(backupData.locations),
                        supabase.from('products').insert(backupData.products),
                        supabase.from('settings').insert(backupData.settings || [])
                    ]);

                    // Restore orders and order items
                    if (backupData.orders && backupData.orders.length > 0) {
                        for (const order of backupData.orders) {
                            const orderItems = order.order_items || [];
                            delete order.order_items;

                            const { data: insertedOrder, error: orderError } = await supabase
                                .from('orders')
                                .insert([order])
                                .select()
                                .single();

                            if (orderError) throw orderError;

                            if (orderItems.length > 0) {
                                const itemsWithOrderId = orderItems.map(item => ({
                                    ...item,
                                    order_id: insertedOrder.id
                                }));

                                const { error: itemsError } = await supabase
                                    .from('order_items')
                                    .insert(itemsWithOrderId);

                                if (itemsError) throw itemsError;
                            }
                        }
                    }

                    hideLoadingOverlay();
                    showNotification('Backup restored successfully', 'success');

                    // Reload all data
                    await loadAutoSavedData();
                    await loadSettings();

                } catch (error) {
                    hideLoadingOverlay();
                    console.error('Restore error:', error);
                    showNotification('Error restoring backup', 'error');
                }
            }
        );

    } catch (error) {
        hideLoadingOverlay();
        console.error('Backup file error:', error);
        showNotification('Error reading backup file', 'error');
    }
}

// Sync status management
async function updateSyncStatus() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('last_sync')
            .limit(1);

        if (error) throw error;

        const syncStatusEl = document.getElementById('syncStatus');
        const lastSyncEl = document.getElementById('lastSync');

        if (syncStatusEl && lastSyncEl) {
            if (settings && settings.length > 0 && settings[0].last_sync) {
                const lastSync = new Date(settings[0].last_sync);
                const now = new Date();
                const timeDiff = now - lastSync;

                syncStatusEl.textContent = 'Synced';
                syncStatusEl.className = 'sync-status synced';
                lastSyncEl.textContent = `Last sync: ${formatTimeAgo(timeDiff)}`;
            } else {
                syncStatusEl.textContent = 'Not synced';
                syncStatusEl.className = 'sync-status not-synced';
                lastSyncEl.textContent = 'Never synced';
            }
        }
    } catch (error) {
        console.error('Error updating sync status:', error);
        const syncStatusEl = document.getElementById('syncStatus');
        if (syncStatusEl) {
            syncStatusEl.textContent = 'Sync error';
            syncStatusEl.className = 'sync-status error';
        }
    }
}

// Helper function to format time ago
function formatTimeAgo(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Logout function
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear any local data
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }

        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await Promise.all([
            loadSettings(),
            loadAutoSavedData(),
            updateSyncStatus()
        ]);

        // Enable auto-save with default interval
        enableAutoSave();
    } catch (error) {
        console.error('Error initializing settings:', error);
        showNotification('Error loading application settings', 'error');
    }
});


// Print functionality
async function printReport(reportType) {
    try {
        showLoadingOverlay();
        let content = '';
        
        switch(reportType) {
            case 'inventory':
                content = await generateInventoryReport();
                break;
            case 'orders':
                content = await generateOrdersReport();
                break;
            case 'sales':
                content = await generateSalesReportHTML();
                break;
        }
        
        hideLoadingOverlay();
        openPrintWindow(`FreshMart ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, content);
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error generating report:', error);
        showNotification('Error generating report', 'error');
    }
}

function openPrintWindow(title, content) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left; 
                }
                th { 
                    background-color: #f2f2f2; 
                    font-weight: bold;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                .date { 
                    color: #666; 
                    font-size: 0.9em;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }
                .summary-item {
                    text-align: center;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .summary-number {
                    font-size: 2em;
                    font-weight: bold;
                    color: #2c3e50;
                }
                .financial-summary {
                    display: flex;
                    justify-content: space-around;
                    margin: 20px 0;
                }
                .financial-item {
                    text-align: center;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    flex: 1;
                    margin: 0 10px;
                }
                .order-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .order-section {
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 5px;
                }
                .order-section.full-width {
                    grid-column: 1 / -1;
                }
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding: 5px 0;
                    border-bottom: 1px dotted #ccc;
                }
                .order-items-table {
                    width: 100%;
                    margin-top: 10px;
                }
                .order-items-table tfoot td {
                    font-weight: bold;
                    background-color: #f8f9fa;
                }
                @media print { 
                    .no-print { display: none; } 
                    body { margin: 0; }
                    .header { page-break-after: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
                <p class="date">Generated on ${new Date().toLocaleString()}</p>
                <p>FreshMart Admin System</p>
            </div>
            ${content}
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Print Report
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                    Close
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

async function generateInventoryReport() {
    try {
        // Get products and locations from Supabase
        const [productsResult, locationsResult] = await Promise.all([
            supabase.from('products').select('*').order('name'),
            supabase.from('locations').select('*').order('name')
        ]);

        if (productsResult.error) throw productsResult.error;
        if (locationsResult.error) throw locationsResult.error;

        const products = productsResult.data;
        const locations = locationsResult.data;

        return `
            <h2>Inventory Report</h2>
            <table>
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Total Stock</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => {
                        const totalStock = Object.values(product.stock || {}).reduce((sum, stock) => sum + stock, 0);
                        return `
                            <tr>
                                <td>${product.name}</td>
                                <td style="text-transform: capitalize;">${product.category}</td>
                                <td>₦${product.price.toLocaleString()}</td>
                                <td>${totalStock}</td>
                                <td>${getOverallStockStatus(product.stock || {}).replace('-', ' ')}</td>
                                <td>${new Date(product.updated_at).toLocaleDateString()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <h3>Stock by Location</h3>
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        ${locations.map(location => `<th>${location.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.name}</td>
                            ${locations.map(location => 
                                `<td>${(product.stock && product.stock[location.id]) || 0}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error generating inventory report:', error);
        throw error;
    }
}

async function generateOrdersReport() {
    try {
        // Get orders with order items from Supabase
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

        return `
            <h2>Orders Report</h2>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customer_name}<br><small>${order.customer_phone}</small></td>
                            <td style="text-transform: capitalize;">${order.location.replace('-', ' ')}</td>
                            <td style="text-transform: capitalize;">${order.delivery_type}</td>
                            <td>₦${order.total.toLocaleString()}</td>
                            <td style="text-transform: capitalize;">${order.status}</td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3>Order Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <h4>Total Orders</h4>
                    <div class="summary-number">${orders.length}</div>
                </div>
                <div class="summary-item">
                    <h4>Total Revenue</h4>
                    <div class="summary-number">₦${totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                    <h4>Average Order</h4>
                    <div class="summary-number">₦${Math.round(averageOrder).toLocaleString()}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating orders report:', error);
        throw error;
    }
}

async function generateSalesReportHTML() {
    try {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const report = await generateSalesReport(startDate, endDate);
        
        return `
            <h2>Sales Report (Last 30 Days)</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <h4>Total Orders</h4>
                    <div class="summary-number">${report.totalOrders}</div>
                </div>
                <div class="summary-item">
                    <h4>Total Revenue</h4>
                    <div class="summary-number">₦${report.totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                    <h4>Average Order Value</h4>
                    <div class="summary-number">₦${Math.round(report.averageOrderValue).toLocaleString()}</div>
                </div>
            </div>
            
            <h3>Sales by Location</h3>
            <table>
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Orders</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.ordersByLocation)
                        .sort(([,a], [,b]) => b - a)
                        .map(([location, orders]) => `
                            <tr>
                                <td style="text-transform: capitalize;">${location.replace('-', ' ')}</td>
                                <td>${orders}</td>
                                <td>${((orders / report.totalOrders) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
            
            <h3>Top Products</h3>
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.topProducts)
                        .sort(([,a], [,b]) => b.revenue - a.revenue)
                        .slice(0, 10)
                        .map(([product, data]) => `
                            <tr>
                                <td>${product}</td>
                                <td>${data.quantity}</td>
                                <td>₦${data.revenue.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
            
            <h3>Order Status Distribution</h3>
            <table>
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.ordersByStatus)
                        .map(([status, count]) => `
                            <tr>
                                <td style="text-transform: capitalize;">${status}</td>
                                <td>${count}</td>
                                <td>${((count / report.totalOrders) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error generating sales report HTML:', error);
        throw error;
    }
}

// Dashboard filter function
async function filterDashboardData() {
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    if (dateFrom && dateTo) {
        try {
            // Filter orders from Supabase based on date range
            const { data: filteredOrders, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', dateFrom)
                .lte('created_at', dateTo + 'T23:59:59.999Z');

            if (error) throw error;

            // Update stats with filtered data
            const totalOrders = filteredOrders.length;
            const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
            
            document.getElementById('totalOrders').textContent = totalOrders;
            document.getElementById('totalRevenue').textContent = `₦${totalRevenue.toLocaleString()}`;
            
            // Update other dashboard elements with filtered data
            await updateFilteredDashboardStats(filteredOrders);
            
            showNotification(`Dashboard filtered for ${dateFrom} to ${dateTo}`, 'info');
        } catch (error) {
                        console.error('Error filtering dashboard data:', error);
            showNotification('Error filtering dashboard data', 'error');
        }
    } else {
        showNotification('Please select both start and end dates', 'warning');
    }
}

// Update dashboard stats with filtered data
async function updateFilteredDashboardStats(filteredOrders) {
    try {
        // Calculate filtered statistics
        const ordersByStatus = {};
        const ordersByLocation = {};
        const recentOrders = filteredOrders.slice(0, 5);

        filteredOrders.forEach(order => {
            ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
            ordersByLocation[order.location] = (ordersByLocation[order.location] || 0) + 1;
        });

        // Update pending orders count
        const pendingOrdersEl = document.getElementById('pendingOrders');
        if (pendingOrdersEl) {
            pendingOrdersEl.textContent = ordersByStatus.pending || 0;
        }

        // Update recent orders list
        const recentOrdersList = document.getElementById('recentOrdersList');
        if (recentOrdersList) {
            recentOrdersList.innerHTML = recentOrders.map(order => `
                <div class="recent-order-item">
                    <div class="order-info">
                        <span class="order-id">#${order.id}</span>
                        <span class="customer-name">${order.customer_name}</span>
                    </div>
                    <div class="order-amount">₦${order.total.toLocaleString()}</div>
                </div>
            `).join('');
        }

        // Update location performance chart/data
        updateLocationPerformanceChart(ordersByLocation);

    } catch (error) {
        console.error('Error updating filtered dashboard stats:', error);
    }
}

// Update location performance visualization
function updateLocationPerformanceChart(ordersByLocation) {
    const locationPerformanceEl = document.getElementById('locationPerformance');
    if (locationPerformanceEl) {
        locationPerformanceEl.innerHTML = Object.entries(ordersByLocation)
            .sort(([,a], [,b]) => b - a)
            .map(([location, orders]) => `
                <div class="performance-item">
                    <div class="performance-location">${location.replace('-', ' ')}</div>
                    <div class="performance-metric">${orders} orders</div>
                </div>
            `).join('');
    }
}

// Reset dashboard filter
async function resetDashboardFilter() {
    try {
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        
        // Reload all dashboard data without filters
        await updateDashboardStats();
        showNotification('Dashboard filter reset', 'info');
    } catch (error) {
        console.error('Error resetting dashboard filter:', error);
        showNotification('Error resetting dashboard filter', 'error');
    }
}

// Enhanced system info with Supabase data
async function updateSystemInfo() {
    try {
        const systemInfoEl = document.getElementById('systemInfo');
        if (!systemInfoEl) return;

        // Get database statistics
        const [
            { count: totalProducts },
            { count: totalOrders },
            { count: totalLocations },
            { data: recentActivity }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('locations').select('*', { count: 'exact', head: true }),
            supabase.from('recent_activities').select('*').order('created_at', { ascending: false }).limit(1)
        ]);

        const lastActivity = recentActivity && recentActivity.length > 0 ? 
            new Date(recentActivity[0].created_at).toLocaleString() : 'No recent activity';

        systemInfoEl.innerHTML = `
            <div class="system-stat">
                <span class="stat-label">Database Status:</span>
                <span class="stat-value connected">Connected</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Products:</span>
                <span class="stat-value">${totalProducts}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Orders:</span>
                <span class="stat-value">${totalOrders}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Total Locations:</span>
                <span class="stat-value">${totalLocations}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">Last Activity:</span>
                <span class="stat-value">${lastActivity}</span>
            </div>
            <div class="system-stat">
                <span class="stat-label">System Time:</span>
                <span class="stat-value">${new Date().toLocaleString()}</span>
            </div>
        `;
    } catch (error) {
        console.error('Error updating system info:', error);
        const systemInfoEl = document.getElementById('systemInfo');
        if (systemInfoEl) {
            systemInfoEl.innerHTML = `
                <div class="system-stat">
                    <span class="stat-label">Database Status:</span>
                    <span class="stat-value error">Connection Error</span>
                </div>
            `;
        }
    }
}

// Enhanced real-time updates simulation
async function simulateRealTimeUpdates() {
    try {
        // Check for new orders periodically
        const { data: latestOrders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Store last known order count
        if (!window.lastOrderCount) {
            window.lastOrderCount = latestOrders.length;
        }

        // Check if there are new orders
        if (latestOrders.length > window.lastOrderCount) {
            const newOrdersCount = latestOrders.length - window.lastOrderCount;
            showNotification(`${newOrdersCount} new order(s) received!`, 'info');
            
            // Update dashboard
            await updateDashboardStats();
            window.lastOrderCount = latestOrders.length;
        }

        // Schedule next check
        setTimeout(simulateRealTimeUpdates, 30000); // Check every 30 seconds
    } catch (error) {
        console.error('Error in real-time updates:', error);
        // Retry after longer interval on error
        setTimeout(simulateRealTimeUpdates, 60000);
    }
}

// Enhanced cache clearing with Supabase
async function clearCache() {
    try {
        showLoadingOverlay();
        
        // Clear browser cache
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        // Clear localStorage
        localStorage.clear();
        sessionStorage.clear();

        // Reload fresh data from Supabase
        await Promise.all([
            loadLocationsGrid(),
            loadInventoryTable(),
            updateDashboardStats(),
            loadSettings()
        ]);

        hideLoadingOverlay();
        showNotification('Cache cleared and data refreshed', 'success');
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error clearing cache:', error);
        showNotification('Error clearing cache', 'error');
    }
}

// Enhanced download logs with Supabase data
async function downloadLogs() {
    try {
        showLoadingOverlay();

        // Get recent activities and system logs
        const { data: activities, error } = await supabase
            .from('recent_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) throw error;

        // Create log content
        const logContent = {
            timestamp: new Date().toISOString(),
            system_info: {
                user_agent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                online: navigator.onLine
            },
            recent_activities: activities,
            performance: {
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
                } : 'Not available',
                timing: performance.timing
            }
        };

        // Download logs
        const blob = new Blob([JSON.stringify(logContent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `freshmart-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        hideLoadingOverlay();
        showNotification('System logs downloaded', 'success');
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error downloading logs:', error);
        showNotification('Error downloading logs', 'error');
    }
}

// Enhanced system reset with Supabase
async function resetSystem() {
    showConfirmation(
        'Reset System',
        'This will delete ALL data including products, orders, locations, and settings. This action cannot be undone!',
        async () => {
            try {
                showLoadingOverlay();

                // Delete all data from Supabase tables
                await Promise.all([
                    supabase.from('order_items').delete().neq('id', 0),
                    supabase.from('orders').delete().neq('id', 0),
                    supabase.from('products').delete().neq('id', 0),
                    supabase.from('locations').delete().neq('id', 0),
                    supabase.from('settings').delete().neq('id', 0),
                    supabase.from('recent_activities').delete().neq('id', 0),
                    supabase.from('backups').delete().neq('id', 0)
                ]);

                // Clear local storage
                localStorage.clear();
                sessionStorage.clear();

                // Insert default data
                await initializeDefaultData();

                hideLoadingOverlay();
                showNotification('System reset completed. Reloading...', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error) {
                hideLoadingOverlay();
                console.error('Error resetting system:', error);
                showNotification('Error resetting system', 'error');
            }
        }
    );
}

// Initialize default data after system reset
async function initializeDefaultData() {
    try {
        // Insert default locations
        const defaultLocations = [
            {
                id: 'ikeja',
                name: 'Ikeja',
                address: '123 Obafemi Awolowo Way, Ikeja, Lagos',
                phone: '+234 801 234 5678',
                manager: 'John Doe',
                hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                status: 'active'
            },
            {
                id: 'victoria-island',
                name: 'Victoria Island',
                address: '456 Ahmadu Bello Way, Victoria Island, Lagos',
                phone: '+234 802 345 6789',
                manager: 'Jane Smith',
                hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
                status: 'active'
            }
        ];

        await supabase.from('locations').insert(defaultLocations);

        // Insert default settings
        const defaultSettings = {
            store_name: 'FreshMart',
            store_description: 'Your trusted supermarket with multiple locations across Lagos.',
            business_hours: 'Mon-Sun: 8:00 AM - 10:00 PM',
            currency: 'NGN',
            default_language: 'en',
            time_zone: 'Africa/Lagos'
        };

        await supabase.from('settings').insert([defaultSettings]);

        console.log('Default data initialized successfully');
    } catch (error) {
        console.error('Error initializing default data:', error);
        throw error;
    }
}

// Initialize real-time updates and auto-save when dashboard loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load settings on startup
        setTimeout(async () => {
            await loadSettings();
        }, 500);
        
        // Start real-time updates simulation after a delay
        setTimeout(() => {
            simulateRealTimeUpdates();
        }, 5000);
        
        // Update system info periodically
        setInterval(async () => {
            await updateSystemInfo();
        }, 60000); // Every minute
        
        // Session timeout handling with Supabase auth
        let sessionTimeoutId;
        
        async function resetSessionTimeout() {
            clearTimeout(sessionTimeoutId);
            
            try {
                const { data: settings, error } = await supabase
                    .from('settings')
                    .select('session_timeout, auto_logout')
                    .limit(1);

                if (error) throw error;

                const timeoutMinutes = settings && settings.length > 0 ? 
                    parseInt(settings[0].session_timeout) || 60 : 60;
                const autoLogoutEnabled = settings && settings.length > 0 ? 
                    settings[0].auto_logout !== false : true;
                
                // Check if user is authenticated
                const { data: { user } } = await supabase.auth.getUser();
                
                if (autoLogoutEnabled && user) {
                    sessionTimeoutId = setTimeout(async () => {
                        showNotification('Session expired. Please login again.', 'warning');
                        setTimeout(async () => {
                            await logout();
                        }, 2000);
                    }, timeoutMinutes * 60 * 1000);
                }
            } catch (error) {
                console.error('Error setting session timeout:', error);
            }
        }
        
        // Reset timeout on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetSessionTimeout, true);
        });

        // Initial session timeout setup
        await resetSessionTimeout();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error initializing dashboard', 'error');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', async function(e) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Save data one final time
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await saveDataImmediately();
        }
    } catch (error) {
        console.error('Error saving data on unload:', error);
    }
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
    
    // Log error to Supabase if possible
    try {
        supabase.from('error_logs').insert([{
                        error_message: e.error.message,
            error_stack: e.error.stack,
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }]);
    } catch (logError) {
        console.error('Failed to log error to database:', logError);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('An error occurred while processing data.', 'error');
    
    // Log promise rejection to Supabase if possible
    try {
        supabase.from('error_logs').insert([{
            error_message: e.reason.message || 'Unhandled promise rejection',
            error_stack: e.reason.stack || 'No stack trace available',
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }]);
    } catch (logError) {
        console.error('Failed to log promise rejection to database:', logError);
    }
});

// Enhanced stock status helper function
function getOverallStockStatus(stock) {
    const totalStock = Object.values(stock || {}).reduce((sum, qty) => sum + qty, 0);
    if (totalStock === 0) return 'out-of-stock';
    if (totalStock < 10) return 'low-stock';
    return 'in-stock';
}

// Enhanced notification system with database logging
async function showNotificationWithLogging(message, type = 'info', duration = 3000) {
    // Show the notification
    showNotification(message, type, duration);
    
    // Log notification to database for audit trail
    try {
        await supabase.from('notification_logs').insert([{
            message: message,
            type: type,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
        }]);
    } catch (error) {
        console.error('Failed to log notification:', error);
    }
}

// Database health check function
async function checkDatabaseHealth() {
    try {
        const startTime = performance.now();
        
        // Test basic connectivity
        const { data, error } = await supabase
            .from('settings')
            .select('id')
            .limit(1);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
        
        return {
            status: 'healthy',
            responseTime: responseTime,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Periodic database health monitoring
async function startDatabaseHealthMonitoring() {
    const checkHealth = async () => {
        const health = await checkDatabaseHealth();
        
        if (health.status === 'unhealthy') {
            console.error('Database health check failed:', health.error);
            showNotification('Database connection issues detected', 'warning');
        }
        
        // Update health status in UI if element exists
        const healthStatusEl = document.getElementById('databaseHealth');
        if (healthStatusEl) {
            healthStatusEl.textContent = health.status;
            healthStatusEl.className = `health-status ${health.status}`;
        }
    };
    
    // Initial check
    await checkHealth();
    
    // Schedule periodic checks every 5 minutes
    setInterval(checkHealth, 5 * 60 * 1000);
}

// Enhanced data synchronization
async function syncDataWithServer() {
    try {
        showLoadingOverlay();
        
        // Get latest data from all tables
        const [products, orders, locations, settings] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*, order_items (*)'),
            supabase.from('locations').select('*'),
            supabase.from('settings').select('*')
        ]);
        
        // Check for errors
        if (products.error) throw products.error;
        if (orders.error) throw orders.error;
        if (locations.error) throw locations.error;
        if (settings.error) throw settings.error;
        
        // Update local cache/state if needed
        window.cachedData = {
            products: products.data,
            orders: orders.data,
            locations: locations.data,
            settings: settings.data,
            lastSync: new Date().toISOString()
        };
        
        // Update sync timestamp
        await supabase
            .from('settings')
            .update({ last_sync: new Date().toISOString() })
            .neq('id', 0);
        
        hideLoadingOverlay();
        showNotification('Data synchronized successfully', 'success');
        
        // Update sync status indicator
        await updateSyncStatus();
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Sync error:', error);
        showNotification('Failed to synchronize data', 'error');
    }
}

// Auto-sync functionality
function enableAutoSync(interval = 5 * 60 * 1000) { // Default 5 minutes
    if (window.autoSyncInterval) {
        clearInterval(window.autoSyncInterval);
    }
    
    window.autoSyncInterval = setInterval(async () => {
        try {
            await syncDataWithServer();
        } catch (error) {
            console.error('Auto-sync failed:', error);
        }
    }, interval);
}

// Export global functions for HTML onclick handlers
window.showSection = showSection;
window.logout = logout;
window.showAddProductModal = showAddProductModal;
window.showAddLocationModal = showAddLocationModal;
window.closeModal = closeModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.updateProductStock = updateProductStock;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.showOrderDetails = showOrderDetails;
window.printOrderDetails = printOrderDetails;
window.toggleProductSelection = toggleProductSelection;
window.toggleSelectAllProducts = toggleSelectAllProducts;
window.bulkUpdateStock = bulkUpdateStock;
window.bulkDeleteProducts = bulkDeleteProducts;
window.applyBulkUpdate = applyBulkUpdate;
window.changePage = changePage;
window.goToPage = goToPage;
window.changeOrdersPage = changeOrdersPage;
window.goToOrdersPage = goToOrdersPage;
window.generateAnalytics = generateAnalytics;
window.generateReport = generateReport;
window.showSettingsTab = showSettingsTab;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.changePassword = changePassword;
window.exportData = exportData;
window.exportAllData = exportAllData;
window.clearOldData = clearOldData;
window.toggleQuickActions = toggleQuickActions;
window.toggleShortcutsHelp = toggleShortcutsHelp;
window.showSystemInfo = showSystemInfo;
window.clearCache = clearCache;
window.downloadLogs = downloadLogs;
window.resetSystem = resetSystem;
window.printReport = printReport;
window.filterDashboardData = filterDashboardData;
window.resetDashboardFilter = resetDashboardFilter;
window.closeConfirmation = closeConfirmation;
window.confirmAction = confirmAction;
window.syncDataWithServer = syncDataWithServer;
window.checkDatabaseHealth = checkDatabaseHealth;
window.createBackup = createBackup;
window.restoreFromBackup = restoreFromBackup;
window.handleBackupFileUpload = handleBackupFileUpload;
window.performSystemHealthCheck = performSystemHealthCheck;


// Advanced search functionality
async function performAdvancedSearch(searchTerm, searchType = 'all') {
    try {
        const results = {
            products: [],
            orders: [],
            customers: []
        };
        
        const term = searchTerm.toLowerCase();
        
        if (searchType === 'all' || searchType === 'products') {
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
            
            if (productsError) throw productsError;
            results.products = products;
        }
        
        if (searchType === 'all' || searchType === 'orders') {
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .or(`id::text.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,customer_email.ilike.%${term}%`);
            
            if (ordersError) throw ordersError;
            results.orders = orders;
        }
        
        if (searchType === 'all' || searchType === 'customers') {
            const { data: customerData, error: customerError } = await supabase
                .rpc('search_customers', { search_term: term });
            
            if (customerError) throw customerError;
            results.customers = customerData;
        }
        
        return results;
    } catch (error) {
        console.error('Error performing advanced search:', error);
        throw error;
    }
}

// Data validation functions (enhanced with Supabase constraints)
async function validateProductData(productData) {
    const errors = [];
    
    if (!productData.name || productData.name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters long');
    }
    
    if (!productData.category) {
        errors.push('Product category is required');
    }
    
    if (!productData.price || productData.price <= 0) {
        errors.push('Product price must be greater than 0');
    }
    
    if (!productData.unit || productData.unit.trim().length < 1) {
        errors.push('Product unit is required');
    }
    
    // Check for duplicate product names
    try {
        const { data: existingProduct, error } = await supabase
            .from('products')
            .select('id')
            .eq('name', productData.name)
            .neq('id', productData.id || 0)
            .limit(1);
        
        if (error) throw error;
        
        if (existingProduct && existingProduct.length > 0) {
            errors.push('Product name already exists');
        }
    } catch (error) {
        console.error('Error checking duplicate product:', error);
    }
    
    // Validate stock values
    if (productData.stock) {
        Object.entries(productData.stock).forEach(([location, stock]) => {
            if (stock < 0) {
                errors.push(`Stock for ${location} cannot be negative`);
            }
        });
    }
    
    return errors;
}

async function validateOrderData(orderData) {
    const errors = [];
    
    if (!orderData.customer_name || orderData.customer_name.trim().length < 2) {
        errors.push('Customer name must be at least 2 characters long');
    }
    
    if (!orderData.customer_phone || !/^\+?[\d\s\-\(\)]{10,}$/.test(orderData.customer_phone)) {
        errors.push('Valid phone number is required');
    }
    
    if (orderData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.customer_email)) {
        errors.push('Valid email address is required');
    }
    
    if (!orderData.location) {
        errors.push('Location is required');
    }
    
    // Validate location exists
    try {
        const { data: location, error } = await supabase
            .from('locations')
            .select('id')
            .eq('id', orderData.location)
            .limit(1);
        
        if (error) throw error;
        
        if (!location || location.length === 0) {
            errors.push('Selected location does not exist');
        }
    } catch (error) {
        console.error('Error validating location:', error);
    }
    
    if (!orderData.order_items || orderData.order_items.length === 0) {
        errors.push('At least one item is required');
    }
    
    if (orderData.delivery_type === 'delivery' && !orderData.delivery_address) {
        errors.push('Delivery address is required for delivery orders');
    }
    
    return errors;
}

// Data import functionality
async function importData(type, file) {
    try {
        showLoadingOverlay();
        
        const fileContent = await file.text();
        const importedData = JSON.parse(fileContent);
        
        // Validate imported data structure
        const validationResult = await validateImportedData(type, importedData);
        if (!validationResult.isValid) {
            throw new Error(validationResult.errors.join(', '));
        }
        
        let result;
        switch(type) {
            case 'products':
                result = await importProducts(importedData);
                break;
            case 'orders':
                result = await importOrders(importedData);
                break;
            case 'locations':
                result = await importLocations(importedData);
                break;
            case 'complete':
                result = await importCompleteBackup(importedData);
                break;
        }
        
        hideLoadingOverlay();
        await refreshDataDisplays();
        return result;
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Import error:', error);
        throw error;
    }
}

async function importProducts(products) {
    try {
        // Get existing product IDs to avoid duplicates
        const { data: existingProducts, error: fetchError } = await supabase
            .from('products')
            .select('id, name');
        
        if (fetchError) throw fetchError;
        
        const existingIds = existingProducts.map(p => p.id);
        const existingNames = existingProducts.map(p => p.name.toLowerCase());
        
        // Filter out duplicates
        const newProducts = products.filter(p => 
            !existingIds.includes(p.id) && 
            !existingNames.includes(p.name.toLowerCase())
        );
        
        if (newProducts.length === 0) {
            return 'No new products to import (all already exist)';
        }
        
        // Insert new products
        const { error: insertError } = await supabase
            .from('products')
            .insert(newProducts);
        
        if (insertError) throw insertError;
        
        return `${newProducts.length} products imported successfully`;
    } catch (error) {
        console.error('Error importing products:', error);
        throw error;
    }
}

async function importOrders(orders) {
    try {
        // Get existing order IDs
        const { data: existingOrders, error: fetchError } = await supabase
            .from('orders')
            .select('id');
        
        if (fetchError) throw fetchError;
        
        const existingIds = existingOrders.map(o => o.id);
        const newOrders = orders.filter(o => !existingIds.includes(o.id));
        
        if (newOrders.length === 0) {
            return 'No new orders to import (all already exist)';
        }
        
        // Import orders with their items
        for (const order of newOrders) {
            const orderItems = order.order_items || [];
            delete order.order_items;
            
            // Insert order
            const { data: insertedOrder, error: orderError } = await supabase
                .from('orders')
                .insert([order])
                .select()
                .single();
            
            if (orderError) throw orderError;
            
            // Insert order items
            if (orderItems.length > 0) {
                const itemsWithOrderId = orderItems.map(item => ({
                    ...item,
                    order_id: insertedOrder.id
                }));
                
                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsWithOrderId);
                
                if (itemsError) throw itemsError;
            }
        }
        
        return `${newOrders.length} orders imported successfully`;
    } catch (error) {
        console.error('Error importing orders:', error);
        throw error;
    }
}

async function importLocations(locations) {
    try {
        // Get existing location IDs
        const { data: existingLocations, error: fetchError } = await supabase
            .from('locations')
            .select('id');
        
        if (fetchError) throw fetchError;
        
        const existingIds = existingLocations.map(l => l.id);
        const newLocations = locations.filter(l => !existingIds.includes(l.id));
        
        if (newLocations.length === 0) {
            return 'No new locations to import (all already exist)';
        }
        
        // Insert new locations
        const { error: insertError } = await supabase
            .from('locations')
            .insert(newLocations);
        
        if (insertError) throw insertError;
        
        // Add new locations to all existing products' stock
        for (const location of newLocations) {
            await supabase.rpc('add_location_to_all_products', {
                location_id: location.id
            });
        }
        
        return `${newLocations.length} locations imported successfully`;
    } catch (error) {
        console.error('Error importing locations:', error);
        throw error;
    }
}

async function importCompleteBackup(backupData) {
    try {
        let results = [];
        
        if (backupData.products) {
            const productResult = await importProducts(backupData.products);
            results.push(productResult);
        }
        
        if (backupData.locations) {
            const locationResult = await importLocations(backupData.locations);
            results.push(locationResult);
        }
        
        if (backupData.orders) {
            const orderResult = await importOrders(backupData.orders);
            results.push(orderResult);
        }
        
        if (backupData.settings) {
            // Import settings
            const { error: settingsError } = await supabase
                .from('settings')
                .upsert(backupData.settings);
            
            if (settingsError) throw settingsError;
            results.push('Settings imported successfully');
        }
        
        return results.join('; ');
    } catch (error) {
        console.error('Error importing complete backup:', error);
        throw error;
    }
}

async function validateImportedData(type, data) {
    const result = { isValid: true, errors: [] };
    
    if (!Array.isArray(data) && type !== 'complete') {
        result.isValid = false;
        result.errors.push('Data must be an array');
        return result;
    }
    
    switch(type) {
        case 'products':
            data.forEach((item, index) => {
                if (!item.name || !item.category || !item.price) {
                    result.errors.push(`Product at index ${index} is missing required fields`);
                }
            });
            break;
            
        case 'orders':
            data.forEach((item, index) => {
                if (!item.customer_name || !item.customer_phone || !item.location) {
                    result.errors.push(`Order at index ${index} is missing required fields`);
                }
            });
            break;
            
        case 'locations':
            data.forEach((item, index) => {
                if (!item.id || !item.name || !item.address || !item.phone) {
                    result.errors.push(`Location at index ${index} is missing required fields`);
                }
            });
            break;
            
        case 'complete':
            if (!data.products && !data.orders && !data.locations) {
                result.errors.push('Complete backup must contain at least one data type');
            }
            break;
    }
    
    if (result.errors.length > 0) {
        result.isValid = false;
    }
    
    return result;
}

// Advanced analytics functions
async function generateAdvancedAnalytics(dateRange) {
    try {
        const { startDate, endDate } = dateRange;
        
        // Get filtered orders from Supabase
        const { data: filteredOrders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);
        
        if (error) throw error;
        
        return {
            salesTrends: await calculateSalesTrends(filteredOrders),
            customerSegmentation: await analyzeCustomerSegmentation(filteredOrders),
            productPerformance: await analyzeProductPerformance(filteredOrders),
            locationAnalysis: await analyzeLocationPerformance(filteredOrders),
            seasonalPatterns: analyzeSeasonalPatterns(filteredOrders),
            profitabilityAnalysis: analyzeProfitability(filteredOrders)
        };
    } catch (error) {
        console.error('Error generating advanced analytics:', error);
        throw error;
    }
}

async function calculateSalesTrends(orders) {
    const dailySales = {};
    const weeklySales = {};
    const monthlySales = {};
    
    orders.forEach(order => {
        const date = new Date(order.created_at);
        const dayKey = date.toDateString();
        const weekKey = getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        dailySales[dayKey] = (dailySales[dayKey] || 0) + order.total;
        weeklySales[weekKey] = (weeklySales[weekKey] || 0) + order.total;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + order.total;
    });
    
    return { dailySales, weeklySales, monthlySales };
}

async function analyzeCustomerSegmentation(orders) {
    try {
        // Use RPC function for complex customer analysis
        const { data: customerSegments, error } = await supabase
            .rpc('analyze_customer_segments', {
                start_date: orders.length > 0 ? orders[orders.length - 1].created_at : new Date().toISOString(),
                end_date: orders.length > 0 ? orders[0].created_at : new Date().toISOString()
            });
        
        if (error) throw error;
        
        return customerSegments;
    } catch (error) {
                console.error('Error analyzing customer segmentation:', error);
        
        // Fallback to client-side analysis
        const customers = {};
        
        orders.forEach(order => {
            if (!customers[order.customer_name]) {
                customers[order.customer_name] = {
                    name: order.customer_name,
                    orders: 0,
                    totalSpent: 0,
                    averageOrderValue: 0,
                    lastOrderDate: order.created_at,
                    preferredLocation: {},
                    preferredDeliveryType: {}
                };
            }
            
            const customer = customers[order.customer_name];
            customer.orders++;
            customer.totalSpent += order.total;
            customer.averageOrderValue = customer.totalSpent / customer.orders;
            
            if (new Date(order.created_at) > new Date(customer.lastOrderDate)) {
                customer.lastOrderDate = order.created_at;
            }
            
            customer.preferredLocation[order.location] = (customer.preferredLocation[order.location] || 0) + 1;
            customer.preferredDeliveryType[order.delivery_type] = (customer.preferredDeliveryType[order.delivery_type] || 0) + 1;
        });
        
        // Segment customers
        const customerArray = Object.values(customers);
        const segments = {
            vip: customerArray.filter(c => c.totalSpent > 50000),
            regular: customerArray.filter(c => c.totalSpent > 10000 && c.totalSpent <= 50000),
            occasional: customerArray.filter(c => c.totalSpent <= 10000)
        };
        
        return segments;
    }
}

async function analyzeProductPerformance(orders) {
    try {
        // Use RPC function for product performance analysis
        const { data: productStats, error } = await supabase
            .rpc('analyze_product_performance', {
                start_date: orders.length > 0 ? orders[orders.length - 1].created_at : new Date().toISOString(),
                end_date: orders.length > 0 ? orders[0].created_at : new Date().toISOString()
            });
        
        if (error) throw error;
        
        return productStats;
    } catch (error) {
        console.error('Error analyzing product performance:', error);
        
        // Fallback to client-side analysis
        const productStats = {};
        
        orders.forEach(order => {
            order.order_items.forEach(item => {
                if (!productStats[item.product_name]) {
                    productStats[item.product_name] = {
                        name: item.product_name,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        orderCount: 0,
                        averageQuantityPerOrder: 0
                    };
                }
                
                const stats = productStats[item.product_name];
                stats.totalQuantity += item.quantity;
                stats.totalRevenue += item.quantity * item.price;
                stats.orderCount++;
                stats.averageQuantityPerOrder = stats.totalQuantity / stats.orderCount;
            });
        });
        
        return Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
}

async function analyzeLocationPerformance(orders) {
    try {
        // Use RPC function for location performance analysis
        const { data: locationStats, error } = await supabase
            .rpc('analyze_location_performance', {
                start_date: orders.length > 0 ? orders[orders.length - 1].created_at : new Date().toISOString(),
                end_date: orders.length > 0 ? orders[0].created_at : new Date().toISOString()
            });
        
        if (error) throw error;
        
        return locationStats;
    } catch (error) {
        console.error('Error analyzing location performance:', error);
        
        // Fallback to client-side analysis
        const locationStats = {};
        
        orders.forEach(order => {
            if (!locationStats[order.location]) {
                locationStats[order.location] = {
                    location: order.location,
                    orderCount: 0,
                    totalRevenue: 0,
                    averageOrderValue: 0,
                    deliveryOrders: 0,
                    pickupOrders: 0
                };
            }
            
            const stats = locationStats[order.location];
            stats.orderCount++;
            stats.totalRevenue += order.total;
            stats.averageOrderValue = stats.totalRevenue / stats.orderCount;
            
            if (order.delivery_type === 'delivery') {
                stats.deliveryOrders++;
            } else {
                stats.pickupOrders++;
            }
        });
        
        return Object.values(locationStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
}

function analyzeSeasonalPatterns(orders) {
    const patterns = {
        hourly: {},
        daily: {},
        monthly: {}
    };
    
    orders.forEach(order => {
        const date = new Date(order.created_at);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sunday
        const month = date.getMonth(); // 0 = January
        
        patterns.hourly[hour] = (patterns.hourly[hour] || 0) + order.total;
        patterns.daily[day] = (patterns.daily[day] || 0) + order.total;
        patterns.monthly[month] = (patterns.monthly[month] || 0) + order.total;
    });
    
    return patterns;
}

function analyzeProfitability(orders) {
    // Simplified profitability analysis
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const estimatedCosts = totalRevenue * 0.7; // Assume 70% cost ratio
    const estimatedProfit = totalRevenue - estimatedCosts;
    const profitMargin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;
    
    return {
        totalRevenue,
        estimatedCosts,
        estimatedProfit,
        profitMargin
    };
}

// Inventory optimization functions
async function analyzeInventoryOptimization() {
    try {
        const analysis = {
            overstockedItems: [],
            understockedItems: [],
            optimalStockLevels: {},
            reorderRecommendations: []
        };
        
        // Get products with current stock
        const { data: products, error } = await supabase
            .from('products')
            .select('*');
        
        if (error) throw error;
        
        for (const product of products) {
            const totalStock = Object.values(product.stock || {}).reduce((sum, stock) => sum + stock, 0);
            const salesVelocity = await calculateSalesVelocity(product.name);
            const daysOfStock = salesVelocity > 0 ? totalStock / salesVelocity : Infinity;
            
            // Determine if overstocked (more than 60 days of stock)
            if (daysOfStock > 60) {
                analysis.overstockedItems.push({
                    product: product.name,
                    currentStock: totalStock,
                    daysOfStock: Math.round(daysOfStock),
                    recommendation: 'Reduce ordering or run promotion'
                });
            }
            
            // Determine if understocked (less than 7 days of stock)
            if (daysOfStock < 7 && daysOfStock > 0) {
                analysis.understockedItems.push({
                    product: product.name,
                    currentStock: totalStock,
                    daysOfStock: Math.round(daysOfStock),
                    recommendation: 'Increase stock immediately'
                });
            }
            
            // Calculate optimal stock level (30 days of stock)
            const optimalStock = Math.ceil(salesVelocity * 30);
            analysis.optimalStockLevels[product.name] = optimalStock;
            
            // Generate reorder recommendations
            if (totalStock < optimalStock * 0.5) {
                analysis.reorderRecommendations.push({
                    product: product.name,
                    currentStock: totalStock,
                    recommendedOrder: optimalStock - totalStock,
                    priority: daysOfStock < 7 ? 'High' : 'Medium'
                });
            }
        }
        
        return analysis;
    } catch (error) {
        console.error('Error analyzing inventory optimization:', error);
        throw error;
    }
}

async function calculateSalesVelocity(productName) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: salesData, error } = await supabase
            .rpc('calculate_product_velocity', {
                product_name: productName,
                start_date: thirtyDaysAgo
            });
        
        if (error) throw error;
        
        return salesData || 0;
    } catch (error) {
        console.error('Error calculating sales velocity:', error);
        return 0;
    }
}

// Advanced reporting functions
async function generateExecutiveSummary(dateRange) {
    try {
        const { startDate, endDate } = dateRange;
        
        // Get filtered orders from Supabase
        const { data: filteredOrders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);
        
        if (error) throw error;
        
        const summary = {
            period: `${startDate} to ${endDate}`,
            totalOrders: filteredOrders.length,
            totalRevenue: filteredOrders.reduce((sum, order) => sum + order.total, 0),
            averageOrderValue: 0,
            topPerformingLocation: null,
            topSellingProduct: null,
            customerGrowth: 0,
            revenueGrowth: 0,
            keyInsights: []
        };
        
        // Calculate average order value
        summary.averageOrderValue = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;
        
        // Find top performing location
        const locationPerformance = {};
        filteredOrders.forEach(order => {
            locationPerformance[order.location] = (locationPerformance[order.location] || 0) + order.total;
        });
        summary.topPerformingLocation = Object.entries(locationPerformance)
            .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        // Find top selling product
        const productSales = {};
        filteredOrders.forEach(order => {
            order.order_items.forEach(item => {
                productSales[item.product_name] = (productSales[item.product_name] || 0) + (item.quantity * item.price);
            });
        });
        summary.topSellingProduct = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        // Calculate growth metrics (compare with previous period)
        const periodLength = new Date(endDate) - new Date(startDate);
        const previousStartDate = new Date(new Date(startDate) - periodLength).toISOString();
        const previousEndDate = new Date(startDate).toISOString();
        
        const { data: previousOrders, error: prevError } = await supabase
            .from('orders')
            .select('total, customer_name')
            .gte('created_at', previousStartDate)
            .lt('created_at', previousEndDate);
        
        if (prevError) throw prevError;
        
        const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);
        const previousCustomers = new Set(previousOrders.map(order => order.customer_name)).size;
        const currentCustomers = new Set(filteredOrders.map(order => order.customer_name)).size;
        
        summary.revenueGrowth = previousRevenue > 0 ? 
            ((summary.totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        summary.customerGrowth = previousCustomers > 0 ? 
            ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0;
        
        // Generate key insights
        if (summary.revenueGrowth > 10) {
            summary.keyInsights.push('Strong revenue growth indicates successful business expansion');
        } else if (summary.revenueGrowth < -5) {
            summary.keyInsights.push('Revenue decline requires immediate attention and strategy review');
        }
        
        if (summary.averageOrderValue > 15000) {
            summary.keyInsights.push('High average order value suggests effective upselling strategies');
        }
        
        if (currentCustomers > previousCustomers * 1.2) {
            summary.keyInsights.push('Significant customer acquisition growth');
        }
        
        return summary;
    } catch (error) {
        console.error('Error generating executive summary:', error);
        throw error;
    }
}

// Data backup and restore functions
async function createSystemBackup() {
    try {
        showLoadingOverlay();
        
        // Get all data from Supabase
        const [productsResult, ordersResult, locationsResult, settingsResult] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*, order_items (*)'),
            supabase.from('locations').select('*'),
            supabase.from('settings').select('*')
        ]);
        
        if (productsResult.error) throw productsResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (locationsResult.error) throw locationsResult.error;
        if (settingsResult.error) throw settingsResult.error;
        
        const backup = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            data: {
                products: productsResult.data,
                orders: ordersResult.data,
                locations: locationsResult.data
            },
            settings: settingsResult.data,
            metadata: {
                totalProducts: productsResult.data.length,
                totalOrders: ordersResult.data.length,
                totalLocations: locationsResult.data.length,
                backupSize: JSON.stringify({
                    products: productsResult.data,
                    orders: ordersResult.data,
                    locations: locationsResult.data
                }).length
            }
        };
        
        // Store backup in Supabase
        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                backup_data: backup,
                backup_type: 'system',
                created_by: 'admin'
            }]);
        
        if (backupError) throw backupError;
        
        hideLoadingOverlay();
        return backup;
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error creating system backup:', error);
        throw error;
    }
}

async function restoreSystemBackup(backupData) {
    try {
        showLoadingOverlay();
        
        // Validate backup structure
        if (!backupData.data || !backupData.data.products || !backupData.data.orders || !backupData.data.locations) {
            throw new Error('Invalid backup file structure');
        }
        
                // Clear existing data
        await Promise.all([
            supabase.from('order_items').delete().neq('id', 0),
            supabase.from('orders').delete().neq('id', 0),
            supabase.from('products').delete().neq('id', 0),
            supabase.from('locations').delete().neq('id', 0),
            supabase.from('settings').delete().neq('id', 0)
        ]);
        
        // Restore data
        await Promise.all([
            supabase.from('locations').insert(backupData.data.locations),
            supabase.from('products').insert(backupData.data.products),
            supabase.from('settings').insert(backupData.settings || [])
        ]);
        
        // Restore orders and order items
        if (backupData.data.orders && backupData.data.orders.length > 0) {
            for (const order of backupData.data.orders) {
                const orderItems = order.order_items || [];
                delete order.order_items;
                
                const { data: insertedOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert([order])
                    .select()
                    .single();
                
                if (orderError) throw orderError;
                
                if (orderItems.length > 0) {
                    const itemsWithOrderId = orderItems.map(item => ({
                        ...item,
                        order_id: insertedOrder.id
                    }));
                    
                    const { error: itemsError } = await supabase
                        .from('order_items')
                        .insert(itemsWithOrderId);
                    
                    if (itemsError) throw itemsError;
                }
            }
        }
        
        // Refresh all displays
        await refreshDataDisplays();
        
        hideLoadingOverlay();
        return 'System backup restored successfully';
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error restoring system backup:', error);
        throw error;
    }
}

// Performance monitoring functions
async function monitorSystemPerformance() {
    try {
        const performance = {
            dataSize: await calculateDataSize(),
            loadTimes: await measureLoadTimes(),
            memoryUsage: estimateMemoryUsage(),
            databaseHealth: await checkDatabaseHealth(),
            recommendations: []
        };
        
        // Generate performance recommendations
        if (performance.dataSize > 50000000) { // 50MB
            performance.recommendations.push('Consider implementing data archiving for old orders');
        }
        
        if (performance.databaseHealth.responseTime > 1000) { // 1 second
            performance.recommendations.push('Database response time is slow, consider optimization');
        }
        
        // Get table counts for recommendations
        const [
            { count: productCount },
            { count: orderCount }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true })
        ]);
        
        if (productCount > 1000) {
            performance.recommendations.push('Large product catalog may benefit from pagination optimization');
        }
        
        if (orderCount > 5000) {
            performance.recommendations.push('Consider archiving orders older than 1 year');
        }
        
        return performance;
    } catch (error) {
        console.error('Error monitoring system performance:', error);
        throw error;
    }
}

async function calculateDataSize() {
    try {
        // Get approximate data size from Supabase
        const { data: sizeData, error } = await supabase
            .rpc('calculate_database_size');
        
        if (error) throw error;
        
        return sizeData || 0;
    } catch (error) {
        console.error('Error calculating data size:', error);
        return 0;
    }
}

async function measureLoadTimes() {
    try {
        const start = performance.now();
        
        // Test database query performance
        await Promise.all([
            supabase.from('products').select('*').limit(10),
            supabase.from('orders').select('*').limit(10),
            supabase.from('locations').select('*').limit(10)
        ]);
        
        const end = performance.now();
        
        return {
            dataProcessing: Math.round(end - start),
            lastMeasurement: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error measuring load times:', error);
        return {
            dataProcessing: 0,
            lastMeasurement: new Date().toISOString()
        };
    }
}

function estimateMemoryUsage() {
    // Use performance.memory if available
    if (performance.memory) {
        return {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
            unit: 'MB'
        };
    }
    
    // Fallback estimation
    return {
        used: 'Unknown',
        total: 'Unknown',
        limit: 'Unknown',
        unit: 'MB'
    };
}

// Automated alerts system
async function checkSystemAlerts() {
    try {
        const alerts = [];
        
        // Get low stock threshold from settings
        const { data: settings, error: settingsError } = await supabase
            .from('settings')
            .select('low_stock_threshold')
            .limit(1);
        
        if (settingsError) throw settingsError;
        
        const lowStockThreshold = settings && settings.length > 0 ? 
            parseInt(settings[0].low_stock_threshold) || 10 : 10;
        
        // Check for low stock items
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*');
        
        if (productsError) throw productsError;
        
        products.forEach(product => {
            Object.entries(product.stock || {}).forEach(([location, stock]) => {
                if (stock <= lowStockThreshold && stock > 0) {
                    alerts.push({
                        type: 'low_stock',
                        severity: 'warning',
                        message: `Low stock alert: ${product.name} at ${location.replace('-', ' ')} (${stock} remaining)`,
                        product: product.name,
                        location: location,
                        stock: stock
                    });
                } else if (stock === 0) {
                    alerts.push({
                        type: 'out_of_stock',
                        severity: 'critical',
                        message: `Out of stock: ${product.name} at ${location.replace('-', ' ')}`,
                        product: product.name,
                        location: location,
                        stock: stock
                    });
                }
            });
        });
        
        // Check for pending orders older than 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: oldPendingOrders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'pending')
            .lt('created_at', oneDayAgo);
        
        if (ordersError) throw ordersError;
        
        oldPendingOrders.forEach(order => {
            const ageHours = Math.floor((new Date() - new Date(order.created_at)) / (1000 * 60 * 60));
            alerts.push({
                type: 'old_pending_order',
                severity: 'warning',
                message: `Order ${order.id} has been pending for over 24 hours`,
                orderId: order.id,
                customer: order.customer_name,
                age: ageHours
            });
        });
        
        // Check for system performance issues
        const dataSize = await calculateDataSize();
        if (dataSize > 100000000) { // 100MB
            alerts.push({
                type: 'performance',
                severity: 'info',
                message: 'Large data size detected. Consider archiving old data.',
                dataSize: Math.round(dataSize / 1000000) + 'MB'
            });
        }
        
        // Check database health
        const dbHealth = await checkDatabaseHealth();
        if (dbHealth.status === 'unhealthy') {
            alerts.push({
                type: 'database',
                severity: 'critical',
                message: 'Database connection issues detected',
                error: dbHealth.error
            });
        }
        
        return alerts;
    } catch (error) {
        console.error('Error checking system alerts:', error);
        return [{
            type: 'system_error',
            severity: 'critical',
            message: 'Error checking system alerts: ' + error.message
        }];
    }
}

async function displaySystemAlerts() {
    try {
        const alerts = await checkSystemAlerts();
        
        alerts.forEach(alert => {
            if (alert.severity === 'critical') {
                showNotification(alert.message, 'error');
            } else if (alert.severity === 'warning') {
                showNotification(alert.message, 'warning');
            }
        });
        
        // Store alerts in database for audit trail
        if (alerts.length > 0) {
            const alertsToStore = alerts.map(alert => ({
                alert_type: alert.type,
                severity: alert.severity,
                message: alert.message,
                metadata: JSON.stringify(alert)
            }));
            
            await supabase.from('system_alerts').insert(alertsToStore);
        }
        
        return alerts;
    } catch (error) {
        console.error('Error displaying system alerts:', error);
        return [];
    }
}

// Helper functions
function getWeekKey(date) {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Refresh data displays helper
async function refreshDataDisplays() {
    try {
        await Promise.all([
            loadLocationsGrid(),
            loadInventoryTable(),
            updateDashboardStats(),
            loadSettings()
        ]);
    } catch (error) {
        console.error('Error refreshing data displays:', error);
    }
}

// Enhanced authentication with Supabase Auth
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('username').value; // Assuming email login
    const password = document.getElementById('password').value;
    
    try {
        showLoadingOverlay();
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            role: 'administrator',
            loginTime: new Date().toISOString()
        };
        
        sessionStartTime = new Date();
        showAdminDashboard();
        await loadDashboardData();
        enableAutoSave();
        showQuickActions();
        
        hideLoadingOverlay();
        showNotification('Login successful', 'success');
        
        // Log login activity
        await supabase.from('user_activities').insert([{
            user_id: data.user.id,
            activity_type: 'login',
            timestamp: new Date().toISOString()
        }]);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        showConfirmation(
            'Confirm Logout',
            'Are you sure you want to logout? Any unsaved changes will be lost.',
            async () => {
                try {
                    // Log logout activity
                    if (currentUser) {
                        await supabase.from('user_activities').insert([{
                            user_id: currentUser.id,
                            activity_type: 'logout',
                            timestamp: new Date().toISOString()
                        }]);
                    }
                    
                    // Sign out from Supabase
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    
                    currentUser = null;
                    sessionStartTime = null;
                    
                    hideQuickActions();
                    
                    document.getElementById('loginScreen').style.display = 'flex';
                    document.getElementById('adminDashboard').style.display = 'none';
                    
                    // Reset forms
                    document.getElementById('loginForm').reset();
                    
                    // Clear auto-save
                    if (autoSaveInterval) {
                        clearInterval(autoSaveInterval);
                    }
                    
                    showNotification('Logged out successfully', 'success');
                } catch (error) {
                    console.error('Logout error:', error);
                    showNotification('Error during logout', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Logout confirmation error:', error);
    }
}

// Initialize alert checking with Supabase
setInterval(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && document.getElementById('dashboard').classList.contains('active')) {
            await displaySystemAlerts();
        }
    } catch (error) {
        console.error('Error in alert checking interval:', error);
    }
}, 300000); // Check every 5 minutes

// Export additional functions for potential external use
window.performAdvancedSearch = performAdvancedSearch;
window.importData = importData;
window.generateAdvancedAnalytics = generateAdvancedAnalytics;
window.analyzeInventoryOptimization = analyzeInventoryOptimization;
window.generateExecutiveSummary = generateExecutiveSummary;
window.createSystemBackup = createSystemBackup;
window.restoreSystemBackup = restoreSystemBackup;
window.monitorSystemPerformance = monitorSystemPerformance;
window.checkSystemAlerts = checkSystemAlerts;
window.displaySystemAlerts = displaySystemAlerts;

// Enhanced initialization
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication status
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            currentUser = {
                id: user.id,
                email: user.email,
                role: 'administrator',
                loginTime: new Date().toISOString()
            };
            
            showAdminDashboard();
            await loadDashboardData();
            enableAutoSave();
            showQuickActions();
        } else {
            hideAdminElements();
        }
        
        // Initialize other components
        await Promise.all([
            startDatabaseHealthMonitoring(),
            enableAutoSync()
        ]);
        
    } catch (error) {
	        console.error('Error during initialization:', error);
        showNotification('Error initializing application', 'error');
    }
});

// Enhanced drag and drop functionality for file imports
document.addEventListener('DOMContentLoaded', function() {
    // Add drag and drop functionality for file imports
    const dropZones = document.querySelectorAll('.drop-zone');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', async function(e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const dataType = zone.dataset.type;
                
                if (file.type === 'application/json') {
                    try {
                        const message = await importData(dataType, file);
                        showNotification(message, 'success');
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                } else {
                    showNotification('Please upload a JSON file', 'error');
                }
            }
        });
    });
});

// Enhanced error handling and logging with Supabase
class ErrorLogger {
    static async log(error, context = '') {
        const errorLog = {
            error_message: error.message,
            error_stack: error.stack,
            context: context,
            user_agent: navigator.userAgent,
            url: window.location.href,
            user_id: currentUser?.id || null,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Store in Supabase
            await supabase.from('error_logs').insert([errorLog]);
        } catch (dbError) {
            console.error('Failed to log error to database:', dbError);
            
            // Fallback to localStorage
            const existingLogs = JSON.parse(localStorage.getItem('freshmart_error_logs') || '[]');
            existingLogs.push(errorLog);
            
            // Keep only last 50 errors
            if (existingLogs.length > 50) {
                existingLogs.splice(0, existingLogs.length - 50);
            }
            
            localStorage.setItem('freshmart_error_logs', JSON.stringify(existingLogs));
        }
        
        console.error('Error logged:', errorLog);
    }
    
    static async getLogs(limit = 100) {
        try {
            const { data: logs, error } = await supabase
                .from('error_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return logs;
        } catch (error) {
            console.error('Error fetching logs from database:', error);
            // Fallback to localStorage
            return JSON.parse(localStorage.getItem('freshmart_error_logs') || '[]');
        }
    }
    
    static async clearLogs() {
        try {
            await supabase.from('error_logs').delete().neq('id', 0);
            localStorage.removeItem('freshmart_error_logs');
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    }
}

// Enhanced error handling
window.addEventListener('error', function(e) {
    ErrorLogger.log(e.error, 'Global error handler');
});

window.addEventListener('unhandledrejection', function(e) {
    ErrorLogger.log(new Error(e.reason), 'Unhandled promise rejection');
});

// Data synchronization with Supabase real-time
class DataSync {
    static async initRealTimeSync() {
        try {
            // Subscribe to real-time changes
            const ordersSubscription = supabase
                .channel('orders_changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'orders' },
                    (payload) => {
                        console.log('Order change detected:', payload);
                        this.handleOrderChange(payload);
                    }
                )
                .subscribe();
            
            const productsSubscription = supabase
                .channel('products_changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'products' },
                    (payload) => {
                        console.log('Product change detected:', payload);
                        this.handleProductChange(payload);
                    }
                )
                .subscribe();
            
            console.log('Real-time sync initialized');
            return { ordersSubscription, productsSubscription };
        } catch (error) {
            console.error('Error initializing real-time sync:', error);
        }
    }
    
    static handleOrderChange(payload) {
        if (payload.eventType === 'INSERT') {
            showNotification('New order received!', 'info');
            updateDashboardStats();
        } else if (payload.eventType === 'UPDATE') {
            showNotification('Order updated', 'info');
            updateDashboardStats();
        }
    }
    
    static handleProductChange(payload) {
        if (payload.eventType === 'UPDATE') {
            loadInventoryTable();
        }
    }
    
    static async syncWithServer() {
        try {
            await updateSyncStatus();
            console.log('Server sync completed');
            return Promise.resolve();
        } catch (error) {
            console.error('Server sync error:', error);
            throw error;
        }
    }
    
    static async backupToCloud() {
        try {
            const backup = await createSystemBackup();
            console.log('Cloud backup completed');
            return backup;
        } catch (error) {
            console.error('Cloud backup error:', error);
            throw error;
        }
    }
    
    static async restoreFromCloud(backupId) {
        try {
            const { data: backup, error } = await supabase
                .from('backups')
                .select('backup_data')
                .eq('id', backupId)
                .single();
            
            if (error) throw error;
            
            await restoreSystemBackup(backup.backup_data);
            console.log('Cloud restore completed');
            return Promise.resolve();
        } catch (error) {
            console.error('Cloud restore error:', error);
            throw error;
        }
    }
}

// Advanced search with fuzzy matching (if Fuse.js is available)
function fuzzySearch(query, items, keys) {
    if (typeof Fuse !== 'undefined') {
        const fuse = new Fuse(items, {
            keys: keys,
            threshold: 0.3,
            includeScore: true
        });
        
        return fuse.search(query);
    } else {
        // Fallback to simple search
        return items.filter(item => {
            return keys.some(key => {
                const value = key.split('.').reduce((obj, prop) => obj?.[prop], item);
                return value && value.toString().toLowerCase().includes(query.toLowerCase());
            });
        });
    }
}

// Real-time collaboration features
class Collaboration {
    static async init() {
        try {
            // Initialize real-time presence
            const channel = supabase.channel('admin_presence');
            
            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    console.log('Active users:', state);
                    this.updateActiveUsers(state);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('User joined:', newPresences);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('User left:', leftPresences);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            user_id: currentUser?.id,
                            email: currentUser?.email,
                            online_at: new Date().toISOString()
                        });
                    }
                });
            
            console.log('Collaboration features initialized');
        } catch (error) {
            console.error('Error initializing collaboration:', error);
        }
    }
    
    static updateActiveUsers(presenceState) {
        const activeUsersEl = document.getElementById('activeUsers');
        if (activeUsersEl) {
            const users = Object.values(presenceState).flat();
            activeUsersEl.innerHTML = `Active users: ${users.length}`;
        }
    }
    
    static async broadcastChange(changeType, data) {
        try {
            const channel = supabase.channel('admin_changes');
            await channel.send({
                type: 'broadcast',
                event: changeType,
                payload: {
                    user_id: currentUser?.id,
                    data: data,
                    timestamp: new Date().toISOString()
                }
            });
            console.log('Broadcasting change:', changeType, data);
        } catch (error) {
            console.error('Error broadcasting change:', error);
        }
    }
    
    static onRemoteChange(callback) {
        const channel = supabase.channel('admin_changes');
        channel.on('broadcast', { event: '*' }, callback);
        console.log('Remote change handler registered');
    }
}

// Mobile-specific optimizations
function optimizeForMobile() {
    if (window.innerWidth <= 768) {
        // Reduce auto-save frequency on mobile to save battery
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            enableAutoSave(60000); // 1 minute instead of 30 seconds
        }
        
        // Reduce real-time update frequency
        console.log('Mobile optimizations applied');
        
        // Add mobile-specific CSS classes
        document.body.classList.add('mobile-optimized');
    }
}

// Battery API optimization (if supported)
if ('getBattery' in navigator) {
    navigator.getBattery().then(function(battery) {
        function updateBatteryOptimizations() {
            if (battery.level < 0.2) { // Less than 20% battery
                // Reduce background operations
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                    enableAutoSave(120000); // 2 minutes
                }
                showNotification('Battery saver mode activated', 'info');
            }
        }
        
        battery.addEventListener('levelchange', updateBatteryOptimizations);
        updateBatteryOptimizations();
    });
}

// Accessibility enhancements
function enhanceAccessibility() {
    // Add ARIA labels to dynamic content
    document.querySelectorAll('.stat-card h3').forEach(element => {
        element.setAttribute('aria-live', 'polite');
    });
    
    // Add keyboard navigation for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                const focusableElements = activeModal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }
        
        // ESC key to close modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                const modalId = activeModal.id;
                closeModal(modalId.replace('Modal', ''));
            }
        }
    });
    
    console.log('Accessibility enhancements applied');
}

// Theme management with Supabase persistence
class ThemeManager {
    static async setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        try {
            // Save theme preference to Supabase
            if (currentUser) {
                await supabase
                    .from('user_preferences')
                    .upsert({
                        user_id: currentUser.id,
                        theme: theme,
                        updated_at: new Date().toISOString()
                    });
            }
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
        
        // Fallback to localStorage
        localStorage.setItem('freshmart_theme', theme);
    }
    
    static async getTheme() {
        try {
            if (currentUser) {
                const { data: preference, error } = await supabase
                    .from('user_preferences')
                    .select('theme')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (!error && preference) {
                    return preference.theme;
                }
            }
        } catch (error) {
            console.error('Error getting theme preference:', error);
        }
        
        // Fallback to localStorage
        return localStorage.getItem('freshmart_theme') || 'light';
    }
    
    static async toggleTheme() {
        const currentTheme = await this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        await this.setTheme(newTheme);
        return newTheme;
    }
    
    static async init() {
        const savedTheme = await this.getTheme();
        await this.setTheme(savedTheme);
        
        // Add theme toggle button to header
        const themeToggle = document.createElement('button');
        themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeToggle.className = 'theme-toggle';
        themeToggle.onclick = async () => {
            const newTheme = await this.toggleTheme();
            themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            showNotification(`Switched to ${newTheme} theme`, 'info');
        };
        
        const adminControls = document.querySelector('.admin-controls');
        if (adminControls) {
            adminControls.insertBefore(themeToggle, adminControls.firstChild);
        }
    }
}

// Data validation and sanitization
class DataValidator {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim()
            .substring(0, 1000); // Limit length
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }
    
    static validatePrice(price) {
        return !isNaN(price) && price > 0 && price < 10000000; // Max 10M
    }
    
    static validateStock(stock) {
	        return Number.isInteger(stock) && stock >= 0 && stock < 100000; // Max 100k
    }
    
    static async validateUnique(table, field, value, excludeId = null) {
        try {
            let query = supabase
                .from(table)
                .select('id')
                .eq(field, value);
            
            if (excludeId) {
                query = query.neq('id', excludeId);
            }
            
            const { data, error } = await query.limit(1);
            
            if (error) throw error;
            
            return data.length === 0; // Returns true if unique
        } catch (error) {
            console.error('Error validating uniqueness:', error);
            return false;
        }
    }
}

// Rate limiting for API calls
class RateLimiter {
    constructor(maxRequests = 100, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }
    
    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }
    
    getRemainingRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        return this.maxRequests - this.requests.length;
    }
    
    getResetTime() {
        if (this.requests.length === 0) return 0;
        const oldestRequest = Math.min(...this.requests);
        return oldestRequest + this.timeWindow;
    }
}

// Initialize rate limiter
const rateLimiter = new RateLimiter();

// Enhanced system health check
async function performSystemHealthCheck() {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {
                dataIntegrity: await checkDataIntegrity(),
                performance: await checkPerformance(),
                storage: await checkStorageHealth(),
                features: checkFeatureAvailability(),
                database: await checkDatabaseHealth(),
                authentication: await checkAuthenticationHealth()
            },
            recommendations: []
        };
        
        // Determine overall health
        const failedChecks = Object.values(health.checks).filter(check => !check.passed);
        if (failedChecks.length > 0) {
            health.status = failedChecks.some(check => check.severity === 'critical') ? 'critical' : 'warning';
        }
        
        // Generate recommendations
        failedChecks.forEach(check => {
            if (check.recommendation) {
                health.recommendations.push(check.recommendation);
            }
        });
        
        // Store health check result
        await supabase.from('health_logs').insert([{
            status: health.status,
            checks: health.checks,
            recommendations: health.recommendations
        }]);
        
        return health;
    } catch (error) {
        console.error('Error performing system health check:', error);
        return {
            timestamp: new Date().toISOString(),
            status: 'critical',
            error: error.message
        };
    }
}

async function checkDataIntegrity() {
    try {
        // Check if required tables exist and have data
        const [
            { count: productCount },
            { count: locationCount },
            { data: settings }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('locations').select('*', { count: 'exact', head: true }),
            supabase.from('settings').select('*').limit(1)
        ]);
        
        const hasValidData = locationCount > 0 && settings && settings.length > 0;
        
        return {
            passed: hasValidData,
            message: hasValidData ? 'Data structures are valid' : 'Missing required data',
            severity: 'critical',
            details: {
                productCount,
                locationCount,
                hasSettings: settings && settings.length > 0
            }
        };
    } catch (error) {
        return {
            passed: false,
            message: 'Data integrity check failed: ' + error.message,
            severity: 'critical',
            recommendation: 'Check database connection and table structure'
        };
    }
}

async function checkPerformance() {
    try {
        const startTime = performance.now();
        
        // Test query performance
        await Promise.all([
            supabase.from('products').select('*').limit(10),
            supabase.from('orders').select('*').limit(10)
        ]);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        const isPerformant = responseTime < 1000; // 1 second threshold
        
        return {
            passed: isPerformant,
            message: isPerformant ? 'Performance is optimal' : 'Slow database response detected',
            severity: 'warning',
            responseTime: responseTime,
            recommendation: !isPerformant ? 'Consider database optimization or check network connection' : null
        };
    } catch (error) {
        return {
            passed: false,
            message: 'Performance check failed: ' + error.message,
            severity: 'warning'
        };
    }
}

async function checkStorageHealth() {
    try {
        // Test localStorage availability
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        
        // Test Supabase storage
        const { data, error } = await supabase.from('settings').select('id').limit(1);
        
        if (error) throw error;
        
        return {
            passed: true,
            message: 'Storage systems are available',
            severity: 'critical'
        };
    } catch (error) {
        return {
            passed: false,
            message: 'Storage health check failed: ' + error.message,
            severity: 'critical',
            recommendation: 'Check browser storage permissions and database connectivity'
        };
    }
}

function checkFeatureAvailability() {
    const features = {
        localStorage: typeof Storage !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        webRTC: 'RTCPeerConnection' in window,
        webGL: !!window.WebGLRenderingContext
    };
    
    const availableFeatures = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.keys(features).length;
    const featureScore = availableFeatures / totalFeatures;
    
    return {
        passed: featureScore >= 0.75, // 75% of features should be available
        message: `${availableFeatures}/${totalFeatures} features available`,
        severity: 'info',
        features: features,
        score: featureScore
    };
}

async function checkAuthenticationHealth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        return {
            passed: !!user,
            message: user ? 'User authenticated' : 'No authenticated user',
            severity: 'info',
            userId: user?.id
        };
    } catch (error) {
        return {
            passed: false,
            message: 'Authentication check failed: ' + error.message,
            severity: 'warning'
        };
    }
}

// Periodic database health monitoring
async function startDatabaseHealthMonitoring() {
    const checkHealth = async () => {
        try {
            const health = await checkDatabaseHealth();
            
            if (health.status === 'unhealthy') {
                console.error('Database health check failed:', health.error);
                showNotification('Database connection issues detected', 'warning');
            }
            
            // Update health status in UI if element exists
            const healthStatusEl = document.getElementById('databaseHealth');
            if (healthStatusEl) {
                healthStatusEl.textContent = health.status;
                healthStatusEl.className = `health-status ${health.status}`;
            }
            
            // Store health metrics
            await supabase.from('health_logs').insert([{
                status: health.status,
                response_time: health.responseTime,
                error_message: health.error
            }]);
            
        } catch (error) {
            console.error('Health monitoring error:', error);
        }
    };
    
    // Initial check
    await checkHealth();
    
    // Schedule periodic checks every 5 minutes
    setInterval(checkHealth, 5 * 60 * 1000);
}

// Enhanced data synchronization
async function syncDataWithServer() {
    try {
        if (!rateLimiter.canMakeRequest()) {
            throw new Error('Rate limit exceeded. Please wait before syncing again.');
        }
        
        showLoadingOverlay();
        
        // Get latest data from all tables
        const [products, orders, locations, settings] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*, order_items (*)'),
            supabase.from('locations').select('*'),
            supabase.from('settings').select('*')
        ]);
        
        // Check for errors
        if (products.error) throw products.error;
        if (orders.error) throw orders.error;
        if (locations.error) throw locations.error;
        if (settings.error) throw settings.error;
        
        // Update local cache/state if needed
        window.cachedData = {
            products: products.data,
            orders: orders.data,
            locations: locations.data,
            settings: settings.data,
            lastSync: new Date().toISOString()
        };
        
        // Update sync timestamp
        await supabase
            .from('settings')
            .update({ last_sync: new Date().toISOString() })
            .neq('id', 0);
        
        hideLoadingOverlay();
        showNotification('Data synchronized successfully', 'success');
        
        // Update sync status indicator
        await updateSyncStatus();
        
        // Broadcast sync completion
        await Collaboration.broadcastChange('data_sync', {
            timestamp: new Date().toISOString(),
            user: currentUser?.email
        });
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Sync error:', error);
        showNotification('Failed to synchronize data: ' + error.message, 'error');
        
        // Log sync error
        await ErrorLogger.log(error, 'Data synchronization');
    }
}

// Auto-sync functionality
function enableAutoSync(interval = 5 * 60 * 1000) { // Default 5 minutes
    if (window.autoSyncInterval) {
        clearInterval(window.autoSyncInterval);
    }
    
    window.autoSyncInterval = setInterval(async () => {
        try {
            // Only sync if user is active and authenticated
            const { data: { user } } = await supabase.auth.getUser();
            if (user && document.visibilityState === 'visible') {
                await syncDataWithServer();
            }
        } catch (error) {
            console.error('Auto-sync failed:', error);
        }
    }, interval);
}

// Enhanced notification system with database logging
async function showNotificationWithLogging(message, type = 'info', duration = 3000) {
    // Show the notification
    showNotification(message, type, duration);
    
    // Log notification to database for audit trail
    try {
        await supabase.from('notification_logs').insert([{
            message: message,
            type: type,
            user_id: currentUser?.id,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
        }]);
    } catch (error) {
        console.error('Failed to log notification:', error);
    }
}

// Progressive Web App (PWA) functionality
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button/banner
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; background: #3498db; color: white; padding: 1rem; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <p style="margin: 0 0 0.5rem 0;">Install FreshMart Admin as an app?</p>
            <button onclick="installPWA()" style="background: white; color: #3498db; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">Install</button>
            <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Later</button>
        </div>
    `;
    document.body.appendChild(installBanner);
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                showNotification('App installed successfully!', 'success');
            }
            deferredPrompt = null;
        });
    }
}

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Final system status and initialization
async function initializeSystem() {
    try {
        console.log('🚀 Initializing FreshMart Admin System...');
        
        // Initialize core components
        await Promise.all([
            DataSync.initRealTimeSync(),
            Collaboration.init(),
            ThemeManager.init(),
            startDatabaseHealthMonitoring()
        ]);
        
        // Apply optimizations
        optimizeForMobile();
        enhanceAccessibility();
        
        // Enable auto-sync
        enableAutoSync();
        
        // Perform initial health check
        const health = await performSystemHealthCheck();
        console.log('System Health:', health);
        
        // Get system statistics
        const [
            { count: totalProducts },
            { count: totalOrders },
            { count: totalLocations }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('locations').select('*', { count: 'exact', head: true })
        ]);
        
        console.log(`
🎉 FreshMart Admin System Ready!
📊 Products: ${totalProducts}
📦 Orders: ${totalOrders}
🏪 Locations: ${totalLocations}
💾 Database: Connected
⚡ Performance: ${health.status}
🔒 Security: Supabase Auth
🔄 Auto-sync: ${window.autoSyncInterval ? 'Enabled' : 'Disabled'}
🌐 Real-time: Enabled
📱 PWA: ${deferredPrompt ? 'Available' : 'Not Available'}
        `);
        
        // Show system ready notification to user
        if (currentUser) {
            showNotification('Admin system ready!', 'success');
        }
        
    } catch (error) {
        console.error('System initialization error:', error);
        showNotification('System initialization failed', 'error');
        await ErrorLogger.log(error, 'System initialization');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', async function(e) {
    try {
        // Clear intervals
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        if (window.autoSyncInterval) {
            clearInterval(window.autoSyncInterval);
        }
        
        // Save data one final time
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await saveDataImmediately();
        }
        
        // Log session end
        if (currentUser) {
            await supabase.from('user_activities').insert([{
                user_id: currentUser.id,
                activity_type: 'session_end',
                timestamp: new Date().toISOString()
            }]);
        }
        
        console.log('Admin system cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
});

// Enhanced session management
async function resetSessionTimeout() {
    try {
        clearTimeout(window.sessionTimeoutId);
        
        const { data: settings, error } = await supabase
            .from('settings')
            .select('session_timeout, auto_logout')
            .limit(1);

        if (error) throw error;

        const timeoutMinutes = settings && settings.length > 0 ? 
            parseInt(settings[0].session_timeout) || 60 : 60;
        const autoLogoutEnabled = settings && settings.length > 0 ? 
            settings[0].auto_logout !== false : true;
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (autoLogoutEnabled && user) {
            window.sessionTimeoutId = setTimeout(async () => {
                showNotification('Session expired. Please login again.', 'warning');
                setTimeout(async () => {
                    await logout();
                }, 2000);
            }, timeoutMinutes * 60 * 1000);
        }
    } catch (error) {
        console.error('Error setting session timeout:', error);
    }
}

// Security: Show/Hide Quick Actions based on login status
function showQuickActions() {
    const quickActions = document.getElementById('quickActions');
    if (quickActions && currentUser) {
        quickActions.style.display = 'block';
    }
}

function hideQuickActions() {
    const quickActions = document.getElementById('quickActions');
    if (quickActions) {
        quickActions.style.display = 'none';
    }
}

function hideAdminElements() {
    const elementsToHide = [
        'quickActions',
        'adminDashboard'
    ];
    
    elementsToHide.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// Enhanced session management with Supabase Auth
async function handleAuthStateChange() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = {
                id: session.user.id,
                email: session.user.email,
                role: 'administrator',
                loginTime: new Date().toISOString()
            };
            
            sessionStartTime = new Date();
            showAdminDashboard();
            await loadDashboardData();
            enableAutoSave();
            showQuickActions();
            
            // Initialize user-specific features
            await ThemeManager.init();
            await resetSessionTimeout();
            
            showNotification('Session restored', 'info');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            sessionStartTime = null;
            hideQuickActions();
            hideAdminElements();
            
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('adminDashboard').style.display = 'none';
            
            // Clear intervals
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
            if (window.sessionTimeoutId) {
                clearTimeout(window.sessionTimeoutId);
            }
        }
    });
}

// Initialize the complete system
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set up auth state listener
        await handleAuthStateChange();
        
        // Initialize system components
        await initializeSystem();
        
        // Reset timeout on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetSessionTimeout, true);
        });
        
    } catch (error) {
        console.error('Error during system initialization:', error);
        showNotification('System initialization failed', 'error');
    }
});

// Export all functions for global access
window.performAdvancedSearch = performAdvancedSearch;
window.importData = importData;
window.generateAdvancedAnalytics = generateAdvancedAnalytics;
window.analyzeInventoryOptimization = analyzeInventoryOptimization;
window.generateExecutiveSummary = generateExecutiveSummary;
window.createSystemBackup = createSystemBackup;
window.restoreSystemBackup = restoreSystemBackup;
window.monitorSystemPerformance = monitorSystemPerformance;
window.checkSystemAlerts = checkSystemAlerts;
window.displaySystemAlerts = displaySystemAlerts;
window.performSystemHealthCheck = performSystemHealthCheck;
window.syncDataWithServer = syncDataWithServer;
window.installPWA = installPWA;
window.ErrorLogger = ErrorLogger;
window.DataSync = DataSync;
window.Collaboration = Collaboration;
window.ThemeManager = ThemeManager;
window.DataValidator = DataValidator;
window.RateLimiter = RateLimiter;

// Final console message
console.log('🎯 FreshMart Admin System fully loaded and ready for enterprise use!');


// Additional helper functions for the admin system

// Function to show loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Function to hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Function to show notifications
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Function to show confirmation dialog
function showConfirmation(title, message, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="btn btn-danger" onclick="confirmAction()">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store callback for confirmation
    confirmationCallback = () => {
        callback();
        modal.remove();
        confirmationCallback = null;
    };
}

function confirmAction() {
    if (confirmationCallback) {
        confirmationCallback();
    }
}

// Function to close confirmation dialog
function closeConfirmation() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.remove());
    confirmationCallback = null;
}

// Real-time updates simulation
async function simulateRealTimeUpdates() {
    try {
        // Check for new orders periodically
        const { data: latestOrders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Store last known order count
        if (!window.lastOrderCount) {
            window.lastOrderCount = latestOrders.length;
        }

        // Check if there are new orders
        if (latestOrders.length > window.lastOrderCount) {
            const newOrdersCount = latestOrders.length - window.lastOrderCount;
            showNotification(`${newOrdersCount} new order(s) received!`, 'info');
            
            // Update dashboard
            await updateDashboardStats();
            window.lastOrderCount = latestOrders.length;
        }

        // Schedule next check
        setTimeout(simulateRealTimeUpdates, 30000); // Check every 30 seconds
    } catch (error) {
        console.error('Error in real-time updates:', error);
        // Retry after longer interval on error
        setTimeout(simulateRealTimeUpdates, 60000);
    }
}

// Start real-time updates when dashboard is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (currentUser) {
            simulateRealTimeUpdates();
        }
    }, 5000); // Start after 5 seconds
});

console.log('🚀 FreshMart Admin System fully loaded with Supabase integration!');
