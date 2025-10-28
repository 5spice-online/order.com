/* =========================================
   5SPICE MIRA ROAD - admin.js
   ========================================= */

// ===== Global Variables =====
let config = {};
let products = [];
let adminOverrides = JSON.parse(localStorage.getItem("adminOverrides")) || {};
// ===== Hashed PIN Authentication =====
const ADMIN_PIN_HASH = "724a4f9a95a51a0340b33e6ad47f34b9a362a9902b0201bbf1e86e48eb8d7c6b"; 
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function hashPin(pin) {
  const enc = new TextEncoder();
  const data = enc.encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getAttempts() {
  const s = localStorage.getItem("admin_login_attempts");
  return s ? JSON.parse(s) : { count: 0, lockedUntil: null };
}
function setAttempts(obj) {
  localStorage.setItem("admin_login_attempts", JSON.stringify(obj));
}

// ===== Utility Functions =====
const $ = (sel) => document.querySelector(sel);
const showToast = (msg) => {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
  setTimeout(() => (toast.hidden = true), 2800);
};

// ===== Login Screen (hashed version) =====
$("#login-btn").addEventListener("click", async () => {
  const attempts = getAttempts();
  const now = Date.now();

  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const minsLeft = Math.ceil((attempts.lockedUntil - now) / 60000);
    $("#login-error").textContent = `Too many attempts. Try again in ${minsLeft} min`;
    $("#login-error").hidden = false;
    return;
  }

  const input = $("#admin-pin").value.trim();
  if (!input) {
    $("#login-error").textContent = "Enter PIN";
    $("#login-error").hidden = false;
    return;
  }

  const hash = await hashPin(input);
  if (hash === ADMIN_PIN_HASH) {
    setAttempts({ count: 0, lockedUntil: null });
    $("#login-error").hidden = true;
    $("#login-screen").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    initDashboard();
  } else {
    attempts.count = (attempts.count || 0) + 1;
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      $("#login-error").textContent = `Too many attempts — locked for ${LOCKOUT_MINUTES} minutes`;
    } else {
      $("#login-error").textContent = `Invalid Code ❌ — ${MAX_ATTEMPTS - attempts.count} tries left`;
    }
    setAttempts(attempts);
    $("#login-error").hidden = false;
  }
});

// ===== Logout =====
$("#logout-btn").addEventListener("click", () => {
  $("#dashboard").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
  $("#admin-pin").value = "";
  showToast("🚪 Logged out");
});

// ===== Initialize Dashboard =====
async function initDashboard() {
  try {
    console.log("✅ initDashboard() started");
    const [cfgRes, prodRes] = await Promise.all([
      fetch("../config.json"),
      fetch("../products.json"),
    ]);

    config = await cfgRes.json();
    const data = await prodRes.json();
    console.log("✅ products.json loaded:", data);

    products = data.categories || data; // fallback check

    // Apply overrides if exist
    if (adminOverrides.config) Object.assign(config, adminOverrides.config);
    if (adminOverrides.products) products = adminOverrides.products;

    console.log("✅ products array:", products);
    console.log("✅ total categories:", products.length);
    console.log("✅ first category sample:", products[0]);

    renderOutletToggle();
    renderCategoryDiscounts();
    renderItemManagement();
    console.log("✅ renderItemManagement() called");
  } catch (err) {
    console.error("❌ Error loading admin data", err);
  }
}

// ===== Outlet Control =====
function renderOutletToggle() {
  const toggle = $("#outlet-toggle");
  const text = $("#outlet-status-text");

  toggle.checked = config.isOutletOpen;
  text.textContent = config.isOutletOpen ? "🟢 OPEN" : "🔴 CLOSED";

  toggle.addEventListener("change", () => {
    config.isOutletOpen = toggle.checked;
    text.textContent = toggle.checked ? "🟢 OPEN" : "🔴 CLOSED";
    showToast(toggle.checked ? "✅ Outlet opened" : "🚫 Outlet closed");
    saveLocalOverrides();
  });
}

// ===== Category Discounts =====
function renderCategoryDiscounts() {
  const tableBody = $("#category-table tbody");
  tableBody.innerHTML = "";

  products.forEach((cat, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat.name}</td>
      <td><input type="number" min="0" max="100" value="${cat.categoryDiscount}" id="discount-${index}" /></td>
      <td><button id="apply-${index}">Apply</button></td>
    `;
    tableBody.appendChild(row);

    $(`#apply-${index}`).addEventListener("click", () => {
      const newVal = parseFloat($(`#discount-${index}`).value) || 0;
      products[index].categoryDiscount = newVal;
      showToast(`💾 ${cat.name} discount set to ${newVal}%`);
      saveLocalOverrides();
    });
  });
}

// ===== Item Management =====
function renderItemManagement() {
  const container = $("#item-container");
  container.innerHTML = "";

  // 🧭 Debug line — helps us see if products loaded
  console.log("📦 Rendering items for", products.length, "categories");

  products.forEach((cat, catIndex) => {
    const block = document.createElement("div");
    block.className = "category-block";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <span>${cat.name}</span>
      <span>(${cat.items.length} items)</span>
    `;
    header.addEventListener("click", () => {
      itemsDiv.classList.toggle("open");
    });

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "category-items";
    if (catIndex === 0) itemsDiv.classList.add("open"); // auto-open first category

    cat.items.forEach((item, itemIndex) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <span>${item.veg ? "🟢" : "🔴"} ${item.name}</span>
        <input type="number" value="${item.price}" min="0" id="price-${catIndex}-${itemIndex}" />
        <label><input type="checkbox" id="avail-${catIndex}-${itemIndex}" ${item.available ? "checked" : ""}> Available</label>
      `;
      itemsDiv.appendChild(row);

      // Handle changes
      $(`#price-${catIndex}-${itemIndex}`).addEventListener("change", (e) => {
        const newPrice = parseFloat(e.target.value) || item.price;
        products[catIndex].items[itemIndex].price = newPrice;
        saveLocalOverrides();
      });
      $(`#avail-${catIndex}-${itemIndex}`).addEventListener("change", (e) => {
        products[catIndex].items[itemIndex].available = e.target.checked;
        saveLocalOverrides();
      });
    });

    block.appendChild(header);
    block.appendChild(itemsDiv);
    container.appendChild(block);
  });
}

// ===== Save / Reset =====
$("#save-btn").addEventListener("click", () => {
  saveLocalOverrides();
  $("#save-msg").hidden = false;
  showToast("✅ All changes saved");
  setTimeout(() => ($("#save-msg").hidden = true), 2000);
});

$("#reset-btn").addEventListener("click", () => {
  if (confirm("Reset to default menu and config?")) {
    localStorage.removeItem("adminOverrides");
    location.reload();
  }
});

// ===== Save to LocalStorage =====
function saveLocalOverrides() {
  adminOverrides = {
    config,
    products,
  };
  localStorage.setItem("adminOverrides", JSON.stringify(adminOverrides));
}

// ===== Auto-init on reload if previously logged in (optional) =====
// You can uncomment the following line to auto-load dashboard without PIN each refresh.
// initDashboard();
