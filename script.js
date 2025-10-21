/* =========================================
   5SPICE MIRA ROAD - script.js
   ========================================= */

// ===== Global Variables =====
let config = {};
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let tableNo = null;

// ===== Utility Functions =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => `₹${n.toFixed(0)}`;
const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));
const showToast = (msg) => {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
  setTimeout(() => (toast.hidden = true), 2400);
};

// ===== Splash Screen =====
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const [cfgRes, prodRes] = await Promise.all([
      fetch("./config.json"),
      fetch("./products.json"),
    ]);
    config = await cfgRes.json();
    const prodData = await prodRes.json();
    products = prodData.categories || [];
  } catch (e) {
    console.error("JSON load error", e);
  }

  $("#splash-tagline").textContent =
    config?.tagline || "Where Every Toss Sparks a Taste.";

  if (config.splashEnabled) {
    setTimeout(() => {
      $("#splash").style.display = "none";
    }, config.splashDurationMs || 7000);
  } else {
    $("#splash").style.display = "none";
  }

  initHeader();
  renderCategoryTabs();
  renderMenu();
  handleQRTable();
  renderCart();
  updateCartBar();
  updateMenuQtyUI(); // ✅ Add this line to refresh live +/– counters after menu loads
});

// ===== Header =====
function initHeader() {
  const status = $("#outlet-status");
  const statusText = $("#outlet-status-text");
  const isOpen = config.isOutletOpen;

  if (isOpen) {
    status.style.background = "var(--green)";
    statusText.textContent = "OPEN";
  } else {
    status.style.background = "var(--red)";
    statusText.textContent = "CLOSED";
  }
}

// ===== Sticky Category Bar =====
function renderCategoryTabs() {
  const scroll = $(".category-scroll");
  products.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "cat-tab";
    btn.textContent = cat.name;
    btn.dataset.cat = cat.name.toLowerCase().replace(/\s+/g, "-");
    btn.addEventListener("click", () => {
      // keep existing highlight logic
      $$(".cat-tab").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      scrollToCategory(btn.dataset.cat);

      // ✅ new code: handle sticky bar top behavior
      const catBar = document.querySelector(".category-bar");
      if (btn.dataset.cat === "all") {
        catBar.classList.remove("is-top"); // goes below hero again
      } else {
        catBar.classList.add("is-top"); // moves to top when category selected
      }
    });
    scroll.appendChild(btn);
  });
}

function scrollToCategory(cat) {
  if (cat === "all") {
    window.scrollTo({ top: $("#hero").offsetHeight, behavior: "smooth" });
    return;
  }

  const target = document.getElementById(`cat-${cat}`);
  if (!target) return;

  // height of header + sticky category bar together
  const headerOffset = 170; // adjust to 75–85 if needed for perfect alignment
  const elementPosition = target.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

// ===== Smart Search =====
$("#search-input").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const clearBtn = $("#search-clear");
  clearBtn.hidden = q.length === 0;
  filterMenu(q);
});

$("#search-clear").addEventListener("click", () => {
  $("#search-input").value = "";
  $("#search-clear").hidden = true;
  filterMenu("");
});

function filterMenu(q) {
  $$(".item-card").forEach((card) => {
    const name = card.dataset.name;
    card.style.display = name.includes(q) ? "flex" : "none";
  });
}

// ===== Table QR Link =====
function handleQRTable() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("table")) {
    tableNo = params.get("table");
    localStorage.setItem("tableNo", tableNo);
  } else {
    tableNo = localStorage.getItem("tableNo");
  }

  if (tableNo) {
    const chip = $("#table-chip");
    $("#table-chip-text").textContent = `Serving: Table ${tableNo}`;
    chip.hidden = false;
    $("#input-address")?.setAttribute("value", `Table ${tableNo}`);
  }
}

// ===== Category Boxes & Menu Card =====
function renderMenu() {
  const container = $("#menu-sections");
  container.innerHTML = "";

  products.forEach((cat) => {
    const box = document.createElement("div");
    const catId = cat.name.toLowerCase().replace(/\s+/g, "-");
    box.className = "category-box";
    box.id = `cat-${catId}`;

    const head = document.createElement("div");
    head.className = "category-head";

    const title = document.createElement("h2");
    title.className = "category-title";
    title.textContent = cat.name;
    head.appendChild(title);

    if (cat.categoryDiscount > 0) {
      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = `🔶 ${cat.categoryDiscount}% OFF`;
      head.appendChild(badge);
    }

    box.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "items-grid";

    cat.items.forEach((item) => {
      if (!item.available) return;
      const card = document.createElement("div");
      card.className = "item-card";
      card.dataset.name = item.name.toLowerCase();
      card.dataset.id = item.id;   // give each card its product id

      const info = document.createElement("div");
      info.className = "item-info";

      const top = document.createElement("div");
      top.className = "item-top";
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = `${item.veg ? "🟢" : "🔴"} ${item.name}`;
      const price = document.createElement("span");
      price.className = "item-price";
      price.textContent = fmt(item.price);
      top.append(name, price);

      const desc = document.createElement("p");
      desc.className = "item-desc";
      desc.textContent = item.desc || "";

      info.append(top, desc);

     const img = document.createElement("img");
img.className = "item-img";

// 🔸 Fallback if image missing
img.src = `./images/menu/${item.image}`;
img.alt = item.name;
img.onerror = function () {
  this.src = "./images/menu/image-coming-soon.png";
};
img.addEventListener("click", () => openModal(item, cat.name));

const add = document.createElement("div");
add.className = "item-add";

// decrease button
const dec = document.createElement("button");
dec.className = "qty-btn btn-dec";
dec.textContent = "–";
dec.addEventListener("click", () => updateCart(item, -1));

// quantity
const count = document.createElement("span");
count.className = "qty-val";
const initialQty = getQty(item.id);             // ✅ read current qty
count.textContent = initialQty;

// increase button
const inc = document.createElement("button");
inc.className = "qty-btn btn-add";
inc.textContent = "+";
inc.addEventListener("click", () => updateCart(item, 1));

/* initial visibility */
dec.style.display = initialQty > 0 ? "inline-flex" : "none";
inc.style.display = "inline-flex";

add.append(dec, count, inc);


      const imgWrap = document.createElement("div");
      imgWrap.style.position = "relative";
      imgWrap.append(img, add);

      card.append(info, imgWrap);
      grid.appendChild(card);
    });

    box.appendChild(grid);
    container.appendChild(box);
  });
}

// ===== Modal =====
function openModal(item, categoryName) {
  const modal = $("#item-modal");

  // 🔸 Set image + browser-level fallback (same as China Bite)
  $("#modal-img").src = `./images/menu/${item.image}`;
  $("#modal-img").onerror = function () {
    this.src = "./images/menu/image-coming-soon.png";
  };

  $("#modal-title").textContent = item.name;
  $("#modal-price").textContent = fmt(item.price);
  $("#modal-desc").textContent = item.desc || "";
  $("#modal-qty").value = 1;
  modal.hidden = false;

  $("#modal-add").onclick = () => {
    const qty = parseInt($("#modal-qty").value) || 1;
    for (let i = 0; i < qty; i++) updateCart(item, 1);
    modal.hidden = true;
  };
}

// ===== Modal Controls =====
$$("[data-close-modal]").forEach((btn) =>
  btn.addEventListener("click", () => ($("#item-modal").hidden = true))
);

$("#modal-inc").onclick = () =>
  ($("#modal-qty").value = parseInt($("#modal-qty").value) + 1);

$("#modal-dec").onclick = () => {
  const val = parseInt($("#modal-qty").value);
  if (val > 1) $("#modal-qty").value = val - 1;
};

// ===== Slide Cart =====
$("#cart-button").addEventListener("click", () => toggleCart(true));
$("#cart-close").addEventListener("click", () => toggleCart(false));
$("#cart-bar-view").addEventListener("click", () => toggleCart(true));

function toggleCart(show) {
  const drawer = $("#cart-drawer");
  if (show) drawer.classList.add("show");
  else drawer.classList.remove("show");
}

// ===== Cart Operations =====
function updateCart(item, delta) {
  const line = cart.find((c) => c.id === item.id);

  if (line) {
    line.qty += delta;
    if (line.qty <= 0) {
      cart = cart.filter((c) => c.id !== item.id);
    }
  } else if (delta > 0) {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      veg: item.veg,
      category: item.category || "",
      qty: 1,
    });
  }

  saveCart();
  renderCart();
  updateCartBar();
  refreshMenuQtyDirect(); // ✅ live update main menu counters
}

function getQty(id) {
  const line = cart.find((c) => c.id === id);
  return line ? line.qty : 0;
}

function renderCart() {
  const list = $("#cart-items");
  list.innerHTML = "";
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <span class="cart-dot">${item.veg ? "🟢" : "🔴"}</span>
      <span class="cart-name">${item.name}</span>
      <div class="cart-qty">
        <button class="qty-btn" data-action="dec" data-id="${item.id}">–</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
      </div>
      <span class="cart-price">${fmt(item.price * item.qty)}</span>
    `;
    list.appendChild(row);
  });

  $$("[data-action]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const act = btn.dataset.action;
      const item = products.flatMap((c) => c.items).find((i) => i.id === id);
      updateCart(item, act === "inc" ? 1 : -1);
    })
  );

  calcTotals();
}

// ===== Totals Calculation =====
function calcTotals() {
  let subtotal = 0;
  let totalItems = 0;
  const discountLines = [];

  // ===== Subtotal & Item Count =====
  cart.forEach((item) => {
    subtotal += item.price * item.qty;
    totalItems += item.qty;
  });

  // ===== Category Discounts (from admin panel / products.json) =====
  let discount = 0;
  products.forEach((cat) => {
    const catItems = cart.filter((i) => cat.items.some((ci) => ci.id === i.id));
    if (cat.categoryDiscount > 0 && catItems.length > 0) {
      const sum = catItems.reduce((s, i) => s + i.price * i.qty, 0);
      const discVal = (sum * cat.categoryDiscount) / 100;
      discount += discVal;
      discountLines.push(
        `<div class="sum-line small"><span>${cat.name} (${cat.categoryDiscount}%)</span><span>– ${fmt(discVal)}</span></div>`
      );
    }
  });

  // ===== Trial Global Discount (for testing only) =====
  const TEMP_DISCOUNT_RATE = 0.20; // 20% trial discount
  discount += subtotal * TEMP_DISCOUNT_RATE;

  // ===== Update visible discount line =====
  $("#sum-discount-value").textContent =
    discount > 0 ? `– ${fmt(discount)}` : "– ₹0";

  // ===== Taxable, GST & Grand Total =====
  const taxable = subtotal - discount;
  const gst = (taxable * config.gstRate) / 100;
  const grand = taxable + gst;

  // ===== Update DOM =====
  $("#sum-subtotal").textContent = fmt(subtotal);
  $("#sum-discounts").innerHTML = discountLines.join(""); // category discount breakdowns
  $("#gst-rate").textContent = config.gstRate;
  $("#sum-gst").textContent = fmt(gst);
  $("#sum-grand").textContent = fmt(grand);
  $("#sum-items").textContent = totalItems;

  // ===== Update cart badge visibility =====
  const cartCount = $("#cart-count");
  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.style.display = "inline-flex";
  } else {
    cartCount.textContent = "";
    cartCount.style.display = "none";
  }
}

// ===== Update Cart Bar =====
function updateCartBar() {
  const bar = $("#cart-bar");
  const totalItems = cart.reduce((a, b) => a + b.qty, 0);
  const totalAmt = cart.reduce((a, b) => a + b.price * b.qty, 0);

  if (totalItems > 0) {
    $("#cart-bar-text").textContent = `${totalItems} items added (${fmt(totalAmt)})`;
    bar.hidden = false;
    bar.style.display = "flex";
  } else {
    bar.hidden = true;
    bar.style.display = "none";
  }
}

// ===== Update Menu Item Counters =====
function updateMenuQtyUI() {
  document.querySelectorAll(".item-card").forEach((card) => {
    const id = card.dataset.id;
    const qtyEl = card.querySelector(".qty-val");
    const decBtn = card.querySelector(".btn-dec");
    const addBtn = card.querySelector(".btn-add");

    const item = cart.find((i) => i.id === id);

    if (item && item.qty > 0) {
      qtyEl.textContent = item.qty;
      card.classList.add("in-cart");
      if (addBtn) addBtn.style.display = "none";
      if (decBtn) decBtn.style.display = "inline-flex";
    } else {
      qtyEl.textContent = 0;
      card.classList.remove("in-cart");
      if (addBtn) addBtn.style.display = "inline-flex";
      if (decBtn) decBtn.style.display = "none";
    }
  });
}

function refreshMenuQtyDirect() {
  document.querySelectorAll(".item-card").forEach((card) => {
    const id = parseInt(card.dataset.id, 10);
    const count = card.querySelector(".qty-val");
    const dec = card.querySelector(".btn-dec");
    const inc = card.querySelector(".btn-add");

    const item = cart.find((c) => c.id === id);

    if (item && item.qty > 0) {
      count.textContent = item.qty;
      dec.style.display = "inline-flex";
    } else {
      count.textContent = 0;
      dec.style.display = "none";
    }
  });
}

// ===== Clear Cart =====
$("#btn-clear-cart").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  updateCartBar();
  refreshMenuQtyDirect(); // ✅ resets main menu counters
  showToast("🗑️ Cart cleared");
});

// ===== WhatsApp Order =====
document.addEventListener("DOMContentLoaded", () => {
  const checkoutForm = document.querySelector("#checkout-form");
  if (!checkoutForm) return; // safety guard

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.querySelector("#input-name").value.trim();
    const phone = document.querySelector("#input-phone").value.trim();
    const address = document.querySelector("#input-address").value.trim();
    const notes = document.querySelector("#input-notes").value.trim();

    if (!name || !phone || !address) {
      alert("Please fill Name, Phone, and Address/Table.");
      return;
    }

    const outlet = config.outletName || "5Spice Mira Road";
    const gstLine = `GST Included (${config.gstRate || 5}%)`;

    const orderLines = cart
      .map((i) => `${i.qty}× ${i.name} – ₹${i.price * i.qty}`)
      .join("\n");

    const discountText = Array.from(
      document.querySelectorAll("#sum-discounts .sum-line")
    )
      .map((l) => l.textContent)
      .join("\n");

    const total = document.querySelector("#sum-grand").textContent;

    const message = `🧾 *Order from ${outlet}*\n\n${orderLines}\n\n${discountText}\n${gstLine}\n*Total Payable:* ${total}\n\n👤 *Customer:* ${name}\n📞 *Phone:* ${phone}\n📍 *Address/Table:* ${address}\n🗒 *Notes:* ${notes || "-"}\n\nThank you! 🙏`;

    const phoneNum = "919867378209";
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;

    console.log("Opening WhatsApp URL:", url);
    window.open(url, "_blank");

    // ✅ After redirect, clear cart completely and refresh menu
    localStorage.removeItem("cart");
    cart = [];
    renderCart();
    updateCartBar();
    refreshMenuQtyDirect(); // ✅ fix menu counters
    showToast("✅ Order sent. Cart cleared.");
  });
});

/// ===== Slide Cart Toggle (China Bite style) =====
const cartButton = document.querySelector("#cart-button");      // header cart icon
const viewCartBtn = document.querySelector("#cart-bar-view");   // bottom View Cart button
const cartDrawer = document.querySelector("#cart-drawer");      // slide cart drawer
const cartClose = document.querySelector("#cart-close");        // close X button
const cartBar = document.querySelector("#cart-bar");            // bottom bar

function openCart() {
  cartDrawer.removeAttribute("hidden");
  cartDrawer.classList.add("open");

  // ✅ Push a fake cart state so back button knows cart is open
  history.pushState({ view: "cart" }, "");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  setTimeout(() => cartDrawer.setAttribute("hidden", ""), 300);

  // ✅ When closing cart, remove the fake state (go back)
  if (history.state && history.state.view === "cart") {
    history.back();
  }
}

if (cartButton && cartDrawer && cartClose) {
  cartButton.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
}

if (viewCartBtn) {
  viewCartBtn.addEventListener("click", openCart);
}

// ===== Admin Override Loader =====
window.addEventListener("load", () => {
  const overrides = JSON.parse(localStorage.getItem("adminOverrides")) || {};
  if (overrides.config) Object.assign(config, overrides.config);
  if (overrides.products) products = overrides.products;
});

// ===== Scroll to top of category bar when a category is clicked =====
const categoryTabs = document.querySelectorAll(".cat-tab");
const categoryBar = document.querySelector(".category-bar");

categoryTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const barTop = categoryBar.getBoundingClientRect().top + window.scrollY - 70; 
    // adjust 70px = header height
    window.scrollTo({
      top: barTop,
      behavior: "smooth"
    });
  });
});

// ===== Hide cart count on first load if cart is empty =====
window.addEventListener("DOMContentLoaded", () => {
  const cartCount = document.querySelector("#cart-count");
  if (cartCount && cart.length === 0) {
    cartCount.textContent = "";
    cartCount.style.display = "none";
  }
});

// ✅ Handle mobile back button to close cart (instead of exiting)
window.addEventListener("popstate", () => {
  if (cartDrawer.classList.contains("open")) {
    closeCart();
  }
}); // 👈 close this function here

// ===== Floating Menu Button (Mobile-Ready Version) =====
const menuBtn = document.getElementById("menu-btn");
const popup = document.getElementById("menu-popup");
const popupList = document.getElementById("popup-list");
const closePopup = document.getElementById("close-popup");

function buildCategoryButtons() {
  popupList.innerHTML = "";
  if (!Array.isArray(products) || products.length === 0) {
    const msg = document.createElement("div");
    msg.textContent = "Loading categories...";
    msg.style.padding = "10px";
    popupList.appendChild(msg);
    return false;
  }
  products.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    btn.className = "popup-cat-btn";
    btn.addEventListener("click", () => {
      scrollToCategory(cat.name.toLowerCase().replace(/\s+/g, "-"));
      popup.classList.remove("show");
    });
    popupList.appendChild(btn);
  });
  return true;
}

if (menuBtn && popup && popupList && closePopup) {
  menuBtn.addEventListener("click", async () => {
    // Ensure products are loaded before showing categories
    if (!Array.isArray(products) || products.length === 0) {
      try {
        const prodRes = await fetch("./products.json");
        products = await prodRes.json();
      } catch (err) {
        console.error("Failed to reload products:", err);
      }
    }

    buildCategoryButtons();
    popup.classList.toggle("show");
  });

  closePopup.addEventListener("click", () => popup.classList.remove("show"));
}

console.log("🍴 Floating Menu Button (mobile-ready) active ✅");





