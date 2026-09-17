const firebaseConfig = {
  apiKey: "AIzaSyCztdHa4nbFm-4myP-g_kVDgnF1wqBGTXc",
  authDomain: "pirint-lab.firebaseapp.com",
  databaseURL: "https://pirint-lab-default-rtdb.firebaseio.com",
  projectId: "pirint-lab",
  storageBucket: "pirint-lab.firebasestorage.app",
  messagingSenderId: "758758939476",
  appId: "1:758758939476:web:6524190b95ade05ab186c1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const OWNER_EMAIL = "shafaynext@gmail.com";
const ALLOWED_PASSWORDS = ["159357", "boing737max"];

let isOwner = false;
let currentUserEmail = "";
let products = [];
let cart = JSON.parse(localStorage.getItem('store_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('store_wishlist')) || [];

let selectedProduct = null;
let detailQty = 1;
let checkoutItemData = null;

window.onload = function() {
  const savedUser = localStorage.getItem('logged_user');
  if (savedUser) {
    currentUserEmail = savedUser;
    if (savedUser === OWNER_EMAIL) {
      isOwner = true;
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.style.display = "block";
    }
    const roleInd = document.getElementById('role-indicator');
    if (roleInd) roleInd.innerText = currentUserEmail;
    closeModal('login-modal');
  }

  db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = [];
    if (data) {
      Object.keys(data).forEach(key => {
        products.push({ id: key, ...data[key] });
      });
    }
    renderProducts();
  });

  updateCartUI();
  updateWishlistUI();
};

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function openLoginModal() { openModal('login-modal'); }

function checkLoginEmail() {
  const emailInput = document.getElementById('login-email').value.trim().toLowerCase();
  const passGroup = document.getElementById('pass-group');
  if (passGroup) {
    if (emailInput === OWNER_EMAIL) {
      passGroup.classList.remove('hidden');
    } else {
      passGroup.classList.add('hidden');
    }
  }
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;

  if (email === OWNER_EMAIL) {
    if (ALLOWED_PASSWORDS.includes(pass)) {
      isOwner = true;
      currentUserEmail = email;
      localStorage.setItem('logged_user', email);
      document.getElementById('role-indicator').innerText = "Owner (" + email + ")";
      document.getElementById('admin-panel').style.display = "block";
      closeModal('login-modal');
    } else {
      alert("Incorrect owner password!");
      return;
    }
  } else {
    isOwner = false;
    currentUserEmail = email;
    localStorage.setItem('logged_user', email);
    document.getElementById('role-indicator').innerText = email;
    document.getElementById('admin-panel').style.display = "none";
    closeModal('login-modal');
  }
  renderProducts();
}

function handleAddProduct(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-add-prod');
  btn.innerText = "Processing Image & Uploading...";
  btn.disabled = true;

  const title = document.getElementById('prod-title').value;
  const price = parseFloat(document.getElementById('prod-price').value).toFixed(2);
  const desc = document.getElementById('prod-desc').value;
  const fileInput = document.getElementById('prod-img');

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function(e) {
      img.src = e.target.result;
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450; 
        const scaleFactor = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleFactor;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

        db.ref('products').push({
          title: title,
          price: price,
          desc: desc,
          image: compressedDataUrl
        }).then(() => {
          btn.innerText = "🚀 Publish Product Live";
          btn.disabled = false;
          event.target.reset();
        }).catch(err => {
          btn.innerText = "🚀 Publish Product Live";
          btn.disabled = false;
          alert("Error adding product: " + err.message);
        });
      };
    };
    reader.readAsDataURL(file);
  }
}

function deleteProduct(id, event) {
  if (event) event.stopPropagation();
  if (confirm("Delete this product permanently?")) {
    db.ref('products/' + id).remove();
  }
}

function toggleWishlistById(id, event) {
  if (event) event.stopPropagation();
  const product = products.find(p => p.id === id) || wishlist.find(p => p.id === id);
  if (!product) return;

  const index = wishlist.findIndex(item => item.id === id);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(product);
  }
  localStorage.setItem('store_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  renderProducts();
}

function addToCartById(id, quantity = 1, event = null) {
  if (event) event.stopPropagation();
  const product = products.find(p => p.id === id) || wishlist.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty = (existing.qty || 1) + quantity;
  } else {
    cart.push({ ...product, qty: quantity });
  }
  localStorage.setItem('store_cart', JSON.stringify(cart));
  updateCartUI();
}

function updateWishlistUI() {
  const countEl = document.getElementById('wishlist-count');
  if (countEl) countEl.innerText = wishlist.length;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No products available right now.</p>';
    return;
  }

  products.forEach(p => {
    const isWishlisted = wishlist.some(item => item.id === p.id);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openDetailModal(p);

    card.innerHTML = `
      <div class="product-img-wrapper">
        <button class="btn-wishlist-toggle ${isWishlisted ? 'active' : ''}" onclick="toggleWishlistById('${p.id}', event)">
          ${isWishlisted ? '❤️' : '🤍'}
        </button>
        <img src="${p.image}" class="product-img" alt="${p.title}">
      </div>
      <div class="product-info">
        <div class="product-title">${p.title}</div>
        <div class="product-price">${p.price} AED</div>
        <div class="card-actions-row">
          <button class="btn-card-cart" onclick="addToCartById('${p.id}', 1, event)">🛒 Add</button>
          ${isOwner ? `<button class="btn-delete" onclick="deleteProduct('${p.id}', event)">Delete</button>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function addSelectedToCart() {
  if (selectedProduct) {
    addToCartById(selectedProduct.id, detailQty);
    closeModal('detail-modal');
  }
}

function changeCartQty(index, delta) {
  if (!cart[index].qty) cart[index].qty = 1;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  localStorage.setItem('store_cart', JSON.stringify(cart));
  updateCartUI();
  openCartModal();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem('store_cart', JSON.stringify(cart));
  updateCartUI();
  openCartModal();
}

function clearCart() {
  cart = [];
  localStorage.removeItem('store_cart');
  updateCartUI();
  openCartModal();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.innerText = totalCount;
}

function openCartModal() {
  const list = document.getElementById('cart-items-list');
  const summaryBlock = document.getElementById('cart-summary-block');
  const checkoutBtn = document.getElementById('btn-cart-checkout');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 1rem 0;">Your cart is empty.</p>';
    if (summaryBlock) summaryBlock.classList.add('hidden');
    if (checkoutBtn) checkoutBtn.style.display = 'none';
  } else {
    let grandTotal = 0;
    list.innerHTML = cart.map((item, i) => {
      const qty = item.qty || 1;
      const itemTotal = parseFloat(item.price) * qty;
      grandTotal += itemTotal;
      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <img src="${item.image}" class="cart-item-img">
            <div>
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-price">${itemTotal.toFixed(2)} AED (${item.price} ea)</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <div class="qty-picker">
              <button class="qty-btn" onclick="changeCartQty(${i}, -1)">-</button>
              <span style="font-size:0.9rem;">${qty}</span>
              <button class="qty-btn" onclick="changeCartQty(${i}, 1)">+</button>
            </div>
            <button class="btn-remove-single" onclick="removeFromCart(${i})">✕</button>
          </div>
        </div>
      `;
    }).join('');

    const totalEl = document.getElementById('cart-total-price');
    if (totalEl) totalEl.innerText = grandTotal.toFixed(2) + " AED";
    if (summaryBlock) summaryBlock.classList.remove('hidden');
    if (checkoutBtn) checkoutBtn.style.display = 'inline-block';
  }
  openModal('cart-modal');
}

function openWishlistModal() {
  const list = document.getElementById('wishlist-items-list');
  if (!list) return;

  if (wishlist.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 1rem 0;">No items saved in wishlist.</p>';
  } else {
    list.innerHTML = wishlist.map((item) => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <img src="${item.image}" class="cart-item-img">
          <div>
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">${item.price} AED</div>
          </div>
        </div>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn-card-cart" onclick="addToCartById('${item.id}', 1)">🛒 Add</button>
          <button class="btn-remove-single" onclick="toggleWishlistById('${item.id}'); openWishlistModal();">✕</button>
        </div>
      </div>
    `).join('');
  }
  openModal('wishlist-modal');
}

function openDetailModal(product) {
  selectedProduct = product;
  detailQty = 1;
  document.getElementById('detail-img').src = product.image;
  document.getElementById('detail-title').innerText = product.title;
  document.getElementById('detail-price').innerText = product.price + " AED";
  document.getElementById('detail-desc').innerText = product.desc;
  document.getElementById('detail-qty-val').innerText = detailQty;
  updateDetailPricePreview();
  openModal('detail-modal');
}

function adjustDetailQty(delta) {
  detailQty += delta;
  if (detailQty < 1) detailQty = 1;
  document.getElementById('detail-qty-val').innerText = detailQty;
  updateDetailPricePreview();
}

function updateDetailPricePreview() {
  if (selectedProduct) {
    const total = (parseFloat(selectedProduct.price) * detailQty).toFixed(2);
    document.getElementById('detail-total-preview').innerText = `Total: ${total} AED`;
  }
}

function startSingleCheckout() {
  checkoutItemData = { type: 'single', item: selectedProduct, qty: detailQty };
  closeModal('detail-modal');
  openModal('checkout-step1-modal');
}

function startCartCheckout() {
  if (cart.length === 0) return;
  checkoutItemData = { type: 'cart', items: [...cart] };
  closeModal('cart-modal');
  openModal('checkout-step1-modal');
}

function goToCheckoutStep2() {
  closeModal('checkout-step1-modal');
  
  let summaryText = "";
  let totalPrice = 0;

  if (checkoutItemData.type === 'single') {
    const qty = checkoutItemData.qty || 1;
    summaryText = `${checkoutItemData.item.title} (${qty}x)`;
    totalPrice = parseFloat(checkoutItemData.item.price) * qty;
  } else {
    summaryText = checkoutItemData.items.map(i => `${i.title} (${i.qty || 1}x)`).join(', ');
    totalPrice = checkoutItemData.items.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
  }

  if (currentUserEmail) {
    document.getElementById('cust-email').value = currentUserEmail;
  }

  document.getElementById('cust-items-summary').value = summaryText;
  document.getElementById('cust-pay').value = totalPrice.toFixed(2) + " AED";
  openModal('checkout-step2-modal');
}

function handleFinalOrder(event) {
  event.preventDefault();
  const email = document.getElementById('cust-email').value;
  const name = document.getElementById('cust-name').value;
  const whatsapp = document.getElementById('cust-whatsapp').value;
  const itemsSummary = document.getElementById('cust-items-summary').value;
  const payConfirm = document.getElementById('cust-pay').value;
  const submitBtn = document.getElementById('btn-order-submit');

  submitBtn.innerText = "Submitting...";
  submitBtn.disabled = true;

  const formData = new FormData();
  formData.append('Customer Email', email);
  formData.append('Customer Full Name', name);
  if (whatsapp.trim() !== "") {
    formData.append('Customer WhatsApp (Optional)', whatsapp);
  }
  formData.append('Ordered Items', itemsSummary);
  formData.append('Total Payment Required', payConfirm);
  formData.append('_subject', `New 3D Print Order from ${name}`);
  formData.append('_captcha', 'false');

  fetch("https://formsubmit.co/ajax/shafaynext@gmail.com", {
    method: "POST",
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    submitBtn.innerText = "Submit Order 🚀";
    submitBtn.disabled = false;
    closeModal('checkout-step2-modal');
    if (checkoutItemData.type === 'cart') {
      clearCart();
    }
    openModal('final-modal');
  })
  .catch(error => {
    submitBtn.innerText = "Submit Order 🚀";
    submitBtn.disabled = false;
    alert("Submission failed. Please check your connection.");
  });
}
