// Supabase client setup (add this at the top of your file if not already present)
import { createClient } from '@supabase/supabase-js'

// IMPORTANT: Ensure these are your actual Supabase credentials.
// These were taken from your previously uploaded admin.js.
const supabaseUrl = 'https://aydlkdolxygxhmtdxins.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5ZGxrZG9seXlneGhtdGR4aW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjY5NzMsImV4cCI6MjA2NzU0Mjk3M30.obBDqpr6K40VcQUPkh03ftDXsgIM9X6CDRgZ2hUZrGM';
const supabase = createClient(supabaseUrl, supabaseKey);

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
let lastOrderCount = 0; // Added for real-time updates

// --- Core Initialization and Authentication Logic ---

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded: Initializing admin panel...');
    // Setup event listeners for login/logout forms and buttons
    setupAuthEventListeners();
    
    // Attempt to initialize admin data and check session
    await initializeAdminData();
    
    // Setup general dashboard event listeners (e.g., product filters, order actions)
    setupEventListeners(); 
    
    // Update system info, typically visible to all authenticated users
    await updateSystemInfo(); 
});

async function initializeAdminData() {
    console.log('initializeAdminData: Checking user session...');
    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('initializeAdminData: Error fetching authenticated user:', authError);
            // If there's an auth error, proceed as if no user is logged in
            toggleAdminFeatures(false); // Hide admin features
            showLoginView(); // Show login form
            await initializeSampleData(); // Initialize public/sample data
            return; // Exit function
        }

        if (user) {
            currentUser = {
                id: user.id,
                email: user.email,
                loginTime: new Date().toISOString()
            };
            console.log('User found:', currentUser.email);

            // Fetch user profile to get their role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentUser.id)
                .single(); // Use .single() as there should be only one profile per user ID

            if (profileError) {
                console.warn('initializeAdminData: Profile not found or error fetching profile for user:', currentUser.id, profileError);
                // Default to 'user' role if profile doesn't exist or an error occurs fetching it
                currentUser.role = 'user';
                // You might want to automatically create a profile here if it doesn't exist
                // E.g., await supabase.from('profiles').insert([{ id: currentUser.id, full_name: user.email, role: 'user' }]);
            } else {
                currentUser.role = profile.role;
            }

            console.log('User role:', currentUser.role);

            // Toggle UI features based on role
            toggleAdminFeatures(currentUser.role === 'admin');

            // Show dashboard and load data
            showAdminDashboard(); 
            await loadDashboardData();
            enableAutoSave();
            simulateRealTimeUpdates(); // Start real-time updates only for logged-in users

        } else {
            // No active user session
            console.log('initializeAdminData: No active user session. Showing login/public view.');
            toggleAdminFeatures(false); // Hide admin features
            showLoginView(); // Show login form
            await initializeSampleData(); // Show public/sample data if applicable
        }
    } catch (error) {
        console.error('initializeAdminData: Unhandled error during admin data initialization:', error);
        toggleAdminFeatures(false); // Hide admin features on unhandled errors
        showLoginView(); // Show login form on error
        await initializeSampleData();
    }
}

// --- Authentication UI and Functions ---

function showLoginView() {
    document.getElementById('adminContent').style.display = 'none'; // Hide main admin content
    document.getElementById('authContainer').style.display = 'block'; // Show authentication container
    document.getElementById('dashboardHeader').style.display = 'none'; // Hide header elements not relevant to login
    document.getElementById('loginStatus').textContent = ''; // Clear previous messages
}

function showAdminDashboard() {
    document.getElementById('authContainer').style.display = 'none'; // Hide authentication container
    document.getElementById('adminContent').style.display = 'block'; // Show main admin content
    document.getElementById('dashboardHeader').style.display = 'flex'; // Show header elements
}

function setupAuthEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await signInUser(email, password);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOutUser);
    }
}

async function signInUser(email, password) {
    document.getElementById('loginStatus').textContent = 'Logging in...';
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            console.log('User logged in successfully:', data.user.email);
            document.getElementById('loginStatus').textContent = 'Login successful!';
            // Re-initialize to fetch profile role and update UI
            await initializeAdminData(); 
        } else {
            // This case should ideally be caught by error, but as a fallback
            document.getElementById('loginStatus').textContent = 'Login failed: No user data.';
        }
    } catch (error) {
        console.error('Login error:', error.message);
        document.getElementById('loginStatus').textContent = `Login failed: ${error.message}`;
    }
}

async function signOutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        console.log('User logged out successfully.');
        currentUser = null; // Clear current user
        toggleAdminFeatures(false); // Hide admin features
        showLoginView(); // Show login form
        showNotification('Logged out successfully.', 'info');
    } catch (error) {
        console.error('Logout error:', error.message);
        showNotification(`Logout failed: ${error.message}`, 'error');
    }
}

// --- Role-Based Access Control (RBAC) UI Helper ---

function toggleAdminFeatures(isAdmin) {
    console.log('toggleAdminFeatures: isAdmin =', isAdmin);
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const nonAdminElements = document.querySelectorAll('.non-admin-only'); // For elements specific to non-admin views

    if (isAdmin) {
        adminOnlyElements.forEach(el => el.style.display = ''); // Show admin elements
        nonAdminElements.forEach(el => el.style.display = 'none'); // Hide elements meant only for non-admins
        document.getElementById('logoutBtn').style.display = 'block'; // Ensure logout button is visible for logged-in users
        // Potentially hide login form components
        document.getElementById('email').value = ''; // Clear form
        document.getElementById('password').value = ''; // Clear form
    } else {
        adminOnlyElements.forEach(el => el.style.display = 'none'); // Hide admin elements
        nonAdminElements.forEach(el => el.style.display = ''); // Show non-admin elements
        document.getElementById('logoutBtn').style.display = 'none'; // Hide logout button if not logged in
        // Show login form components explicitly if not already shown by showLoginView
    }
}

// --- Dashboard Function Stubs (You will fill these in based on your HTML structure) ---

// This function needs to be correctly defined based on your dashboard's HTML.
// It should make visible the main content area of the admin dashboard.
function showAdminDashboard() {
    // Example: Assumes you have elements with IDs 'adminContent' and 'authContainer'
    const adminContent = document.getElementById('adminContent');
    const authContainer = document.getElementById('authContainer');
    const dashboardHeader = document.getElementById('dashboardHeader'); // Assuming a header for dashboard

    if (adminContent) adminContent.style.display = 'block';
    if (authContainer) authContainer.style.display = 'none';
    if (dashboardHeader) dashboardHeader.style.display = 'flex'; // Or 'block'
}

// Loads the main data for the dashboard (e.g., summary stats, recent activities)
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    // Example: Fetch data for charts, recent orders, etc.
    await updateDashboardStats();
    // await loadRecentActivities(); // Placeholder
    // await loadCharts(); // Placeholder
}

// Updates various statistics on the dashboard
async function updateDashboardStats() {
    console.log('Updating dashboard statistics...');
    try {
        // Example: Fetch total orders, total products, etc.
        const { data: orderStats, error: orderError } = await supabase
            .from('orders')
            .select('count', { count: 'exact' });

        if (orderError) throw orderError;
        document.getElementById('totalOrders').textContent = orderStats.count;

        // More stats here (e.g., total products, total customers)
        const { data: productStats, error: productError } = await supabase
            .from('products')
            .select('count', { count: 'exact' });
        if (productError) throw productError;
        document.getElementById('totalProducts').textContent = productStats.count;

    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        showNotification(`Failed to load stats: ${error.message}`, 'error');
    }
}

// Simulates real-time updates for notifications (e.g., new orders)
async function simulateRealTimeUpdates() {
    console.log('Checking for real-time updates...');
    try {
        // Check for new orders periodically
        const { data: latestOrders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5); // Adjust limit as needed

        if (error) throw error;

        // Store last known order count if not set
        if (lastOrderCount === 0 && latestOrders.length > 0) {
            lastOrderCount = latestOrders.length;
        }

        // Check if there are new orders since last check
        if (latestOrders.length > lastOrderCount) {
            const newOrdersCount = latestOrders.length - lastOrderCount;
            showNotification(`${newOrdersCount} new order(s) received!`, 'info');
            
            // Update dashboard to reflect new orders
            await updateDashboardStats();
            lastOrderCount = latestOrders.length; // Update last known count
        } else if (latestOrders.length < lastOrderCount) {
             // Handle case where orders might have been deleted, reset count
             lastOrderCount = latestOrders.length;
        }

        // Schedule next check if user is still logged in
        if (currentUser) {
            setTimeout(simulateRealTimeUpdates, 30000); // Check every 30 seconds
        } else {
            console.log('User logged out, stopping real-time updates.');
        }
    } catch (error) {
        console.error('Error in real-time updates:', error);
        // Retry after longer interval on error
        if (currentUser) {
            setTimeout(simulateRealTimeUpdates, 60000);
        }
    }
}

// Function to update system info (e.g., uptime, resource usage)
async function updateSystemInfo() {
    console.log('Updating system information...');
    // This would typically involve fetching data from a 'system_alerts' or 'performance_logs' table
    // Example:
    try {
        const { data: alerts, error } = await supabase
            .from('system_alerts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) throw error;
        if (alerts.length > 0) {
            document.getElementById('systemAlerts').textContent = `Latest Alert: ${alerts[0].message}`;
        } else {
            document.getElementById('systemAlerts').textContent = 'No active system alerts.';
        }
    } catch (error) {
        console.error('Error fetching system info:', error);
        document.getElementById('systemAlerts').textContent = 'Failed to load system info.';
    }
}

// Sets up various event listeners for dashboard interactions
function setupEventListeners() {
    // Example: product management buttons, order actions, etc.
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                console.log('Admin user clicked Add Product');
                // Open product add modal/form
            } else {
                showNotification('Permission denied. Only administrators can add products.', 'error');
            }
        });
    }

    // Add more event listeners for other dashboard functionalities here
}

// Enables auto-saving for forms or configurations
function enableAutoSave() {
    console.log('Auto-save enabled.');
    // Example: Save settings form data every X seconds
    // if (autoSaveInterval) clearInterval(autoSaveInterval);
    // autoSaveInterval = setInterval(() => {
    //     console.log('Auto-saving data...');
    //     // Save form data to database
    // }, 60000); // Every 60 seconds
}

// Initializes sample data if no user is logged in or for a fresh start
async function initializeSampleData() {
    console.log('Initializing sample data/public view...');
    // This function runs when no user is logged in.
    // You might display public product lists, a login prompt, or sample reports.
    document.getElementById('adminContent').innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h2>Welcome to FreshMart Admin Panel!</h2>
            <p>Please log in to access the full dashboard.</p>
            <p>You can view sample data or use the login form above.</p>
            </div>
    `;
    // Hide dashboard header elements that require login
    const dashboardHeader = document.getElementById('dashboardHeader');
    if (dashboardHeader) dashboardHeader.style.display = 'none';
}

// --- Notification System ---
function showNotification(message, type = 'info', duration = 5000) {
    const notificationBar = document.getElementById('notificationBar');
    if (!notificationBar) {
        console.warn('Notification bar element not found.');
        return;
    }
    notificationBar.textContent = message;
    notificationBar.className = `notification-bar ${type}`; // Apply CSS class for styling
    notificationBar.style.display = 'block';

    setTimeout(() => {
        notificationBar.style.display = 'none';
    }, duration);
}

// --- Confirmation Dialog (if needed) ---
function showConfirmation(message, callback) {
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (!confirmationDialog || !confirmationMessage || !confirmBtn || !cancelBtn) {
        console.error('Confirmation dialog elements not found.');
        return;
    }

    confirmationMessage.textContent = message;
    confirmationCallback = callback;
    confirmationDialog.style.display = 'block';

    confirmBtn.onclick = () => {
        if (confirmationCallback) confirmationCallback(true);
        confirmationDialog.style.display = 'none';
    };

    cancelBtn.onclick = () => {
        if (confirmationCallback) confirmationCallback(false);
        confirmationDialog.style.display = 'none';
    };
}
