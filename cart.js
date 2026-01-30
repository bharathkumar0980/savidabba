/* =========================================
   SAVI DABBA - FIREBASE INTEGRATED
   Handles: Real Auth, Shopping Cart, and UI
   ========================================= */

// --- 1. FIREBASE CONFIGURATION ---
// REPLACE THESE VALUES WITH YOUR OWN FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCz4TyYrpCTB3IYIebPQv2rW04t-pnNMlk",
  authDomain: "savi-dabba.firebaseapp.com",
  // ADD THIS LINE (Specific for Singapore Region):
  databaseURL:
    "https://savi-dabba-default-rtdb.asia-southeast1.firebasedatabase.app",
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

// Customizer Variables (Preserved from your original code)
let currentItemName = "";
let currentItemBasePrice = 0;

/* =========================================
   AUTHENTICATION LOGIC (Real Firebase)
   ========================================= */

/**
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
    auth
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // 2. Save the user's name to their profile
        userCredential.user.updateProfile({ displayName: name }).then(() => {
          alert(`Welcome to the family, ${name}!`);
          window.location.href = "home.html";
        });
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });

    // FIND THIS SECTION IN cart.js
  } else {
    // Login existing user
    auth
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // --- NEW CODE START ---
        if (email === "admin@savidabba.com") {
          window.location.href = "dashboard.html"; // Send Admin to Dashboard
        } else {
          window.location.href = "home.html"; // Send Customers to Home
        }
        // --- NEW CODE END ---
      })
      .catch((error) => {
        alert("Login Failed: " + error.message);
      });
  }
}

/**
 * Logs the user out via Firebase
 */
function logout() {
  auth.signOut().then(() => {
    alert("Logged out successfully.");
    window.location.href = "home.html";
  });
}

/* =========================================
   UI & NAVBAR LOGIC
   ========================================= */

function updateNavbar() {
  // FIXED: Changed from auth.html to login.html to match your file structure
  const authNavItem = document.querySelector(
    'a[href="login.html"]',
  )?.parentElement;

  // Only update if the element exists AND we have a logged-in user
  if (authNavItem && currentUser) {
    authNavItem.innerHTML = `
            <div class="nav-item dropdown">
                <a class="nav-link dropdown-toggle text-primary fw-bold" href="#" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-circle-user me-1"></i> Hi, ${currentUser.name}
                </a>
                <ul class="dropdown-menu dropdown-menu-dark">
                    <li><a class="dropdown-item" href="cart.html">My Orders</a></li>
                    <li><hr class="dropdown-divider border-secondary"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()">Logout</a></li>
                </ul>
            </div>`;
  }
}

function refreshUI() {
  updateCartCount();
  updateNavbar();
  if (typeof renderCart === "function") renderCart(); // Update table only if on cart page
}

/* =========================================
   CORE CART FUNCTIONS (Preserved)
   ========================================= */

function addToCart(name, price) {
  const existingItem = cart.find((item) => item.name === name);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ name: name, price: price, qty: 1 });
  }
  saveCart();
  refreshUI();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
  const badge = document.getElementById("cartCount");
  const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  if (badge) badge.innerText = totalQty;
}

/* =========================================
   CUSTOMIZER LOGIC (Preserved)
   ========================================= */

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
    typeof addonsData !== "undefined" && addonsData[searchKey]
      ? addonsData[searchKey]
      : [];

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
    currentItemName +
    (selectedAddons.length > 0 ? ` (${selectedAddons.join(", ")})` : "");
  addToCart(finalName, finalPrice);
  closeCustomizer();
}

/* =========================================
   CART PAGE DISPLAY LOGIC (Preserved)
   ========================================= */

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
  cart.splice(index, 1);
  saveCart();
  refreshUI();
}

function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  if (!currentUser) {
    alert("Please login to place your order.");
    window.location.href = "login.html";
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
      alert(`Order Received! We are preparing it, ${currentUser.name}.`);
      cart = [];
      saveCart();
      refreshUI();
    })
    .catch((error) => {
      alert("Order failed: " + error.message);
    });
}

/* =========================================
   VARIANT LOGIC (Preserved)
   ========================================= */

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

/* =========================================
   INITIALIZE
   ========================================= */
document.addEventListener("DOMContentLoaded", refreshUI);
