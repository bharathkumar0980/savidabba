/*
  SAVI DABBA Script File
  Handles: Real Auth, Shopping Cart, and UI
*/

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCz4TyYrpCTB3IYIebPQv2rW04t-pnNMlk",
    authDomain: "savi-dabba.firebaseapp.com",
    databaseURL: "https://savi-dabba-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "savi-dabba",
    storageBucket: "savi-dabba.firebasestorage.app",
    messagingSenderId: "210119671403",
    appId: "1:210119671403:web:35c657450763247b3c3b2e",
};

// Initialize Firebase (Check if already initialized to prevent errors)
if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Variables
const auth = firebase.auth();
const db = firebase.database(); // Initialize Database

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let currentUser = null; // Will be managed by Firebase
let currentItemName = "";
let currentItemBasePrice = 0;

/*
  AUTHENTICATION LOGIC (Real Firebase)
*/

/*
 * Listen for login/logout state changes automatically.
 * This replaces the need to manually save user to localStorage.
 */
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        currentUser = {
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
        };
        console.log("User active:", currentUser.name);
    } else {
        // User is signed out
        currentUser = null;
    }
    refreshUI(); // Update navbar immediately
});

/**
 * Handles both Login and Registration via Firebase.
 * @param {Event} event - Form submission event
 * @param {string} type - 'login' or 'register'
 */
function handleAuth(event, type) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (type === "register") {
        const name = form.querySelector('input[type="text"]').value;

        // 1. Create Account in Firebase
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // 2. Save the user's name to their profile
                userCredential.user.updateProfile({ displayName: name }).then(() => {
                    showToast(`Welcome to the family, ${name}!`, "success");
                    setTimeout(() => window.location.href = "index.html", 1500);
                });
            })
            .catch((error) => {
                showToast("Error: " + error.message, "error");
            });
    } else {
        // Login existing user
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showToast("Login successful!", "success");
                setTimeout(() => {
                    if (email === "admin@savidabba.com") {
                        window.location.href = "dashboard.html"; // Send Admin to Dashboard
                    } else {
                        window.location.href = "index.html"; // Send Customers to Home
                    }
                }, 1000);
            })
            .catch((error) => {
                showToast("Login Failed: " + error.message, "error");
            });
    }
}

/**
 * Logs the user out via Firebase
 */
function logout() {
    auth.signOut().then(() => {
        showToast("Logged out successfully.", "success");
        setTimeout(() => window.location.href = "index.html", 1500);
    });
}

/*
   UI & NAVBAR LOGIC
*/

function updateNavbar() {
    let authNavItem = document.getElementById('auth-nav-item');
    
    // If not found by ID, try finding it by the href and add the ID
    if (!authNavItem) {
        const loginLink = document.querySelector('a[href="login.html"]');
        if (loginLink) {
            authNavItem = loginLink.parentElement;
            authNavItem.id = 'auth-nav-item';
        }
    }

    if (!authNavItem) return;

    if (currentUser) {
        authNavItem.classList.add('dropdown', 'user-dropdown-container');
        authNavItem.innerHTML = `
            <a class="nav-link dropdown-toggle user-profile-link" href="#" data-bs-toggle="dropdown">
                <div class="user-avatar">
                    <i class="fa-solid fa-user"></i>
                    <span class="status-indicator online" title="Online"></span>
                </div>
                <span class="user-name">Hi, ${currentUser.name}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark custom-dropdown dropdown-menu-end">
                <li class="dropdown-header">
                    <small class="text-muted">Signed in as</small><br>
                    <strong class="text-white">${currentUser.email}</strong>
                </li>
                <li><hr class="dropdown-divider border-secondary"></li>
                <li>
                    <a class="dropdown-item" href="cart.html">
                        <i class="fa-solid fa-basket-shopping me-2 text-primary"></i> My Orders
                    </a>
                </li>
                <li><hr class="dropdown-divider border-secondary"></li>
                <li>
                    <a class="dropdown-item text-danger" href="#" onclick="logout()">
                        <i class="fa-solid fa-right-from-bracket me-2"></i> Logout
                    </a>
                </li>
            </ul>`;
    } else {
        authNavItem.classList.remove('dropdown', 'user-dropdown-container');
        authNavItem.innerHTML = `<a class="nav-link" href="login.html">Login</a>`;
    }
}

function refreshUI() {
    updateCartCount();
    updateNavbar();
    if (typeof renderCart === "function") renderCart(); // Update table only if on cart page
}

/* 
  TOAST NOTIFICATIONS
*/
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // match CSS transition duration
    }, 3000);
}

/* 
  CORE CART FUNCTIONS
*/

function addToCart(name, price) {
    const existingItem = cart.find((item) => item.name === name);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ name: name, price: price, qty: 1 });
    }
    saveCart();
    refreshUI();
    showToast(`${name} added to cart!`, "success");
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
    const badge = document.getElementById("cartCount");
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    if (badge) badge.innerText = totalQty;
}

/* 
  CUSTOMIZER LOGIC
*/

function openCustomizer(name, price, originalLookupName = null) {
    const modal = document.getElementById("customizer");
    const title = document.getElementById("itemName");
    const list = document.getElementById("addonList");
    if (!modal) return;

    currentItemName = name;
    currentItemBasePrice = price;
    title.innerText = name;
    list.innerHTML = "";

    const searchKey = originalLookupName || name;
    // Check if addonsData is defined (it's inside the HTML files)
    const addons =
        typeof addonsData !== "undefined" && addonsData[searchKey] ? addonsData[searchKey] : [];

    if (addons.length === 0) {
        list.innerHTML = "<p class='text-muted small'>No add-ons available.</p>";
    } else {
        addons.forEach((addon) => {
            const div = document.createElement("div");
            div.className = "d-flex justify-content-between align-items-center mb-2";
            div.innerHTML = `
                <label class="form-check-label text-white">
                    <input type="checkbox" class="form-check-input me-2 addon-checkbox" value="${addon.price}" data-name="${addon.name}">
                    ${addon.name}
                </label>
                <span class="text-primary">+₹${addon.price}</span>`;
            list.appendChild(div);
        });
    }

    const btnDiv = document.createElement("div");
    btnDiv.className = "mt-4 pt-3 border-top border-secondary";
    btnDiv.innerHTML = `<button class="btn-primary-custom w-100" onclick="addCustomizedItem()">Add - ₹<span id="modalTotal">${price}</span></button>`;
    list.appendChild(btnDiv);

    // Add listener for calculating total dynamically
    list.querySelectorAll(".addon-checkbox").forEach((box) => {
        box.addEventListener("change", () => {
            let total = currentItemBasePrice;
            document
                .querySelectorAll(".addon-checkbox:checked")
                .forEach((b) => (total += parseInt(b.value)));
            document.getElementById("modalTotal").innerText = total;
        });
    });

    modal.style.display = "block";
}

function closeCustomizer() {
    const modal = document.getElementById("customizer");
    if (modal) modal.style.display = "none";
}

function addCustomizedItem() {
    let finalPrice = currentItemBasePrice;
    let selectedAddons = [];
    document.querySelectorAll(".addon-checkbox:checked").forEach((box) => {
        finalPrice += parseInt(box.value);
        selectedAddons.push(box.getAttribute("data-name"));
    });
    // Append addons to name so they appear in cart
    let finalName =
        currentItemName + (selectedAddons.length > 0 ? ` (${selectedAddons.join(", ")})` : "");
    addToCart(finalName, finalPrice);
    closeCustomizer();
}

/*
   CART PAGE DISPLAY LOGIC (Preserved)
*/

function renderCart() {
    const tableBody = document.getElementById("cartTableBody");
    if (!tableBody) return;

    const subtotalEl = document.getElementById("subtotal");
    const taxEl = document.getElementById("tax");
    const grandTotalEl = document.getElementById("grandTotal");
    const emptyMsg = document.getElementById("emptyCartMessage");

    tableBody.innerHTML = "";
    let subtotal = 0;

    // Toggle Empty Message / Table Visibility
    if (cart.length === 0) {
        emptyMsg.style.display = "block";
        if (tableBody.closest(".glass-card"))
            tableBody.closest(".table-responsive").style.display = "none";
    } else {
        emptyMsg.style.display = "none";
        if (tableBody.closest(".glass-card"))
            tableBody.closest(".table-responsive").style.display = "block";

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="fw-bold text-white">${item.name}</div></td>
                <td>₹${item.price}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                        <span class="mx-2">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td class="text-primary">₹${itemTotal}</td>
                <td><button class="btn-trash" onclick="removeItem(${index})"><i class="fa-solid fa-trash"></i></button></td>`;
            tableBody.appendChild(row);
        });
    }

    const tax = Math.round(subtotal * 0.05);
    if (subtotalEl) subtotalEl.innerText = subtotal;
    if (taxEl) taxEl.innerText = tax;
    if (grandTotalEl) grandTotalEl.innerText = subtotal + tax;
}

function changeQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    refreshUI();
}

function removeItem(index) {
    const removedItemName = cart[index].name;
    cart.splice(index, 1);
    saveCart();
    refreshUI();
    showToast(`${removedItemName} removed from cart.`, "info");
}

function checkout() {
    if (cart.length === 0) {
        showToast("Your cart is empty!", "error");
        return;
    }

    if (!currentUser) {
        showToast("Please login to place your order.", "error");
        setTimeout(() => window.location.href = "login.html", 1500);
        return;
    }

    // SAVE ORDER TO FIREBASE
    const orderData = {
        customerName: currentUser.name,
        customerEmail: currentUser.email,
        items: cart,
        total: document.getElementById("grandTotal")?.innerText || 0,
        status: "Pending", // Default status
        timestamp: new Date().toLocaleString(),
    };

    // Push to 'orders' node
    db.ref("orders")
        .push(orderData)
        .then(() => {
            showToast(`Order Received! We are preparing it, ${currentUser.name}.`, "success");
            cart = [];
            saveCart();
            refreshUI();
        })
        .catch((error) => {
            showToast("Order failed: " + error.message, "error");
        });
}

/*
   VARIANT LOGIC (Preserved)
*/

function getVariantDetails(selectId, baseName) {
    const select = document.getElementById(selectId);
    if (!select) return null;
    const price = parseInt(select.value);
    const variantName = select.options[select.selectedIndex].text.split(" -")[0];
    return { fullName: `${baseName} (${variantName})`, price: price };
}

function addVariantToCart(baseName, selectId) {
    const details = getVariantDetails(selectId, baseName);
    if (details) addToCart(details.fullName, details.price);
}

function openCustomizerWithVariant(baseName, selectId) {
    const details = getVariantDetails(selectId, baseName);
    if (details) openCustomizer(details.fullName, details.price, baseName);
}
/*
  FEEDBACK FORM HANDLING
*/
document.addEventListener("DOMContentLoaded", () => {
    const feedbackForm = document.getElementById("feedbackForm");

    if (feedbackForm) {
        feedbackForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Stop page from reloading

            // 1. Gather Data
            const formData = {
                name: document.getElementById("name").value,
                email: document.getElementById("email").value,
                category: document.getElementById("category").value,
                message: document.getElementById("message").value,
                timestamp: new Date().toLocaleString(), // Readable time
            };

            // 2. Send to Firebase (New 'feedbacks' collection)
            db.ref("feedbacks")
                .push(formData)
                .then(() => {
                    showToast("Thanks for your feedback, " + formData.name + "!", "success");
                    feedbackForm.reset(); // Clear the form
                })
                .catch((error) => {
                    console.error("Feedback Error:", error);
                    showToast("Error sending feedback: " + error.message, "error");
                });
        });
    }
});

/*
   INITIALIZE
*/
document.addEventListener("DOMContentLoaded", refreshUI);
