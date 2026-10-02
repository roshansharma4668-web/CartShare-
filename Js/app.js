let currentUser = "";
let currentRoom = "";
const DELIVERY_THRESHOLD = 500;
const DELIVERY_CHARGE = 50;

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const roomBadgeContainer = document.getElementById("room-badge-container");
const userDisplay = document.getElementById("user-display");
const roomDisplay = document.getElementById("room-display");

const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const roomIdInput = document.getElementById("room-id");
const randomRoomBtn = document.getElementById("random-room-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");

const addItemForm = document.getElementById("add-item-form");
const itemNameInput = document.getElementById("item-name");
const itemPriceInput = document.getElementById("item-price");
const itemQtyInput = document.getElementById("item-qty");

const cartItemsBody = document.getElementById("cart-items-body");
const emptyCartMsg = document.getElementById("empty-cart-msg");
const activityLogList = document.getElementById("activity-log-list");

const totalQtyEl = document.getElementById("total-qty");
const subtotalEl = document.getElementById("subtotal-amount");
const deliveryFeeEl = document.getElementById("delivery-fee-display");
const grandTotalEl = document.getElementById("grand-total-amount");
const progressBar = document.getElementById("progress-bar");
const thresholdStatus = document.getElementById("threshold-status");
const thresholdMsg = document.getElementById("threshold-msg");
const printBtn = document.getElementById("print-receipt-btn");

// 1. Random Room Generator
randomRoomBtn.addEventListener("click", () => {
  const code = "ROOM-" + Math.floor(1000 + Math.random() * 9000);
  roomIdInput.value = code;
});

// 2. Join Room Form Submit
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  currentUser = usernameInput.value.trim();
  currentRoom = roomIdInput.value.trim().toUpperCase();

  if (!currentUser || !currentRoom) return;

  sessionStorage.setItem("cartshare_user", currentUser);
  sessionStorage.setItem("cartshare_room", currentRoom);

  enterRoomUI();
  renderAll();
  logActivity(`${currentUser} joined the room.`);
});

function enterRoomUI() {
  authSection.classList.add("d-none");
  dashboardSection.classList.remove("d-none");
  roomBadgeContainer.classList.remove("d-none");

  userDisplay.textContent = `User: ${currentUser}`;
  roomDisplay.textContent = `Room: ${currentRoom}`;
}

leaveRoomBtn.addEventListener("click", () => {
  sessionStorage.removeItem("cartshare_user");
  sessionStorage.removeItem("cartshare_room");
  location.reload();
});

function getCartData() {
  const data = localStorage.getItem(`cart_${currentRoom}`);
  return data ? JSON.parse(data) : [];
}

function saveCartData(items) {
  localStorage.setItem(`cart_${currentRoom}`, JSON.stringify(items));
}

function getActivityLogs() {
  const logs = localStorage.getItem(`logs_${currentRoom}`);
  return logs ? JSON.parse(logs) : [];
}

function logActivity(message) {
  const logs = getActivityLogs();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  logs.unshift({ time, message });

  if (logs.length > 20) logs.pop();
  localStorage.setItem(`logs_${currentRoom}`, JSON.stringify(logs));
  renderLogs();
}

// 3. Add Item
addItemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = itemNameInput.value.trim();
  const price = parseFloat(itemPriceInput.value);
  const qty = parseInt(itemQtyInput.value);

  if (!name || isNaN(price) || isNaN(qty)) return;

  const items = getCartData();
  const newItem = {
    id: Date.now().toString(),
    name: name,
    price: price,
    qty: qty,
    addedBy: currentUser
  };

  items.push(newItem);
  saveCartData(items);

  logActivity(`${currentUser} added "${name}" (Qty: ${qty}) to the cart.`);

  itemNameInput.value = "";
  itemPriceInput.value = "";
  itemQtyInput.value = "1";

  renderAll();
});

// 4. Remove Item
window.removeItem = function (itemId) {
  let items = getCartData();
  const itemToDelete = items.find((i) => i.id === itemId);
  if (!itemToDelete) return;

  items = items.filter((i) => i.id !== itemId);
  saveCartData(items);

  logActivity(`${currentUser} removed "${itemToDelete.name}" from the cart.`);
  renderAll();
};

// 5. Render All
function renderAll() {
  const items = getCartData();

  cartItemsBody.innerHTML = "";
  if (items.length === 0) {
    emptyCartMsg.classList.remove("d-none");
  } else {
    emptyCartMsg.classList.add("d-none");
    items.forEach((item) => {
      const row = document.createElement("tr");
      const itemTotal = (item.price * item.qty).toFixed(2);
      row.innerHTML = `
        <td class="fw-semibold">${item.name}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>${item.qty}</td>
        <td>₹${itemTotal}</td>
        <td><span class="badge bg-secondary">${item.addedBy}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger" onclick="removeItem('${item.id}')">✕</button>
        </td>
      `;
      cartItemsBody.appendChild(row);
    });
  }

  let totalItemsCount = 0;
  let subtotal = 0;

  items.forEach((item) => {
    totalItemsCount += item.qty;
    subtotal += item.price * item.qty;
  });

  const isFreeDelivery = subtotal >= DELIVERY_THRESHOLD;
  const deliveryFee = items.length === 0 ? 0 : (isFreeDelivery ? 0 : DELIVERY_CHARGE);
  const grandTotal = subtotal + deliveryFee;

  totalQtyEl.textContent = totalItemsCount;
  subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  deliveryFeeEl.textContent = isFreeDelivery ? "FREE" : `₹${deliveryFee.toFixed(2)}`;
  deliveryFeeEl.className = isFreeDelivery ? "text-success fw-bold" : "text-danger fw-semibold";
  grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;

  const percentage = Math.min((subtotal / DELIVERY_THRESHOLD) * 100, 100);
  progressBar.style.width = `${percentage}%`;
  thresholdStatus.textContent = `₹${subtotal.toFixed(2)} / ₹${DELIVERY_THRESHOLD}`;

  if (isFreeDelivery) {
    thresholdMsg.textContent = "🎉 Congratulations! You have unlocked Free Delivery!";
    thresholdMsg.className = "text-success fw-bold mt-1 d-block";
  } else {
    const remaining = DELIVERY_THRESHOLD - subtotal;
    thresholdMsg.textContent = `Add items worth ₹${remaining.toFixed(2)} more to unlock free shipping.`;
    thresholdMsg.className = "text-muted mt-1 d-block";
  }

  renderLogs();
}

// 6. Render Logs
function renderLogs() {
  const logs = getActivityLogs();
  activityLogList.innerHTML = "";
  if (logs.length === 0) {
    activityLogList.innerHTML = '<li class="list-group-item text-muted text-center">No activity yet</li>';
    return;
  }
  logs.forEach((log) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center py-2";
    li.innerHTML = `<span>${log.message}</span> <span class="badge bg-light text-muted">${log.time}</span>`;
    activityLogList.appendChild(li);
  });
}

// 7. Multi-Tab Sync
window.addEventListener("storage", (e) => {
  if (e.key === `cart_${currentRoom}` || e.key === `logs_${currentRoom}`) {
    renderAll();
  }
});

// 8. Printable Receipt Handling (Clean & Synchronized)
printBtn.addEventListener("click", () => {
  const items = getCartData();
  if (items.length === 0) {
    alert("Cart is empty! Add items before printing a receipt.");
    return;
  }

  document.getElementById("receipt-date").textContent = "Date: " + new Date().toLocaleString();
  document.getElementById("receipt-room").textContent = currentRoom;
  document.getElementById("receipt-user").textContent = currentUser;

  const receiptBody = document.getElementById("receipt-items-body");
  receiptBody.innerHTML = "";

  let subtotal = 0;
  items.forEach((item) => {
    const lineTotal = item.price * item.qty;
    subtotal += lineTotal;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price.toFixed(2)}</td>
      <td>₹${lineTotal.toFixed(2)}</td>
      <td>${item.addedBy}</td>
    `;
    receiptBody.appendChild(tr);
  });

  const deliveryFee = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const grandTotal = subtotal + deliveryFee;

  document.getElementById("receipt-subtotal").textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById("receipt-delivery").textContent = deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`;
  document.getElementById("receipt-grand-total").textContent = `₹${grandTotal.toFixed(2)}`;

  // CSS @media print will automatically handle visibility
  window.print();
});

// 9. Auto Login Check on Refresh
window.addEventListener("DOMContentLoaded", () => {
  const savedUser = sessionStorage.getItem("cartshare_user");
  const savedRoom = sessionStorage.getItem("cartshare_room");
  if (savedUser && savedRoom) {
    currentUser = savedUser;
    currentRoom = savedRoom;
    enterRoomUI();
    renderAll();
  }
});