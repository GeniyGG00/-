// === ДАННЫЕ ТОВАРОВ ПО УМОЛЧАНИЮ ===
const DEFAULT_PRODUCTS = [
    { id: 1, name: "VOOPOO DRAG X Plus", category: "vapes", price: 4500, inStock: true, desc: "Мощный под-система, 100W", image: "💨" },
    { id: 2, name: "OXVA Xlim Pro", category: "vapes", price: 3200, inStock: true, desc: "Компактный под, 30W", image: "💨" },
    { id: 3, name: "Жидкость NUTTY 60ml", category: "liquids", price: 800, inStock: true, desc: "Ореховый карамель, 3мг", image: "🧪" },
    { id: 4, name: "Жидкость HONEST 60ml", category: "liquids", price: 750, inStock: true, desc: "Клубника со льдом, 3мг", image: "🧪" },
    { id: 5, name: "ELFBAR BC5000", category: "disposable", price: 1200, inStock: true, desc: "Одноразка, 5000 затяжек", image: "🔥" },
    { id: 6, name: "HQD CUVIE PLUS", category: "disposable", price: 900, inStock: true, desc: "Одноразка, 1200 затяжек", image: "🔥" },
    { id: 7, name: "Испаритель PnP-X", category: "parts", price: 350, inStock: true, desc: "Сменный испаритель 0.3Ω", image: "⚙️" },
    { id: 8, name: "Картридж VOOPOO PnP", category: "parts", price: 500, inStock: true, desc: "Сменный картридж 4.5ml", image: "⚙️" },
];

const ADMIN_PASSWORD = "parovoz2026";
const USE_SERVER_STORAGE = true; // Переключатель: true = сервер, false = localStorage

// === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
let products = [];
let cart = [];
let orders = [];
let isAdminLoggedIn = false;
let currentProductImage = null;

// === ЗАГРУЗКА ДАННЫХ ===
async function loadData() {
    const savedCart = localStorage.getItem('vapeShopCart');
    const savedOrders = localStorage.getItem('vapeShopOrders');
    
    cart = savedCart ? JSON.parse(savedCart) : [];
    orders = savedOrders ? JSON.parse(savedOrders) : [];
    
    if (USE_SERVER_STORAGE) {
        // Загрузка с сервера
        console.log('Загрузка товаров с сервера...');
        try {
            const response = await fetch('products_db.php');
            const data = await response.json();
            console.log('Получены данные с сервера:', data);
            
            if (data.success && data.products && data.products.length > 0) {
                products = data.products;
                console.log('Загружено товаров:', products.length);
            } else {
                // Если на сервере пусто, загружаем дефолтные
                console.log('На сервере пусто, загружаем дефолтные товары');
                products = [...DEFAULT_PRODUCTS];
                await syncProductsToServer();
            }
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
            products = [...DEFAULT_PRODUCTS];
        }
    } else {
        // Загрузка из localStorage (старый способ)
        const savedProducts = localStorage.getItem('vapeShopProducts');
        products = savedProducts ? JSON.parse(savedProducts) : [...DEFAULT_PRODUCTS];
    }
    
    // Миграция старых данных
    products = products.map(p => {
        if (p.stock !== undefined) {
            p.inStock = p.stock > 0;
            delete p.stock;
        }
        return p;
    });
}

// === СОХРАНЕНИЕ ДАННЫХ ===
async function saveProducts() {
    if (USE_SERVER_STORAGE) {
        console.log('Синхронизация с сервером...', products.length, 'товаров');
        await syncProductsToServer();
    } else {
        localStorage.setItem('vapeShopProducts', JSON.stringify(products));
    }
}

async function syncProductsToServer() {
    try {
        const response = await fetch('products_db.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products })
        });
        const result = await response.json();
        console.log('Результат синхронизации:', result);
        if (!result.success) {
            console.error('Ошибка синхронизации:', result.error);
        }
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
}

function saveCart() {
    localStorage.setItem('vapeShopCart', JSON.stringify(cart));
}

function saveOrders() {
    localStorage.setItem('vapeShopOrders', JSON.stringify(orders));
}

// === УВЕДОМЛЕНИЯ ===
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

function findProductById(productId) {
    const id = Number(productId);
    return products.find(p => Number(p.id) === id);
}

function switchToTab(tabId) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.click();
}

// === РЕНДЕР КАТАЛОГА ===
function renderCatalog(category = 'all') {
    const grid = document.getElementById('productsGrid');
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    
    grid.innerHTML = filtered.map(product => `
        <div class="product-card">
            <div class="product-image">${getImageHTML(product)}</div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-desc">${product.desc || ''}</p>
                <div class="product-price">${product.price} ₽</div>
                <div class="product-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
                    ${product.inStock ? '✓ В наличии' : '✗ Нет в наличии'}
                </div>
                <button type="button" class="btn-add-cart" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                    ${product.inStock ? 'В КОРЗИНУ' : 'НЕТ В НАЛИЧИИ'}
                </button>
            </div>
        </div>
    `).join('');
}

function setupCatalogActions() {
    const grid = document.getElementById('productsGrid');
    
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-add-cart');
        if (!btn || btn.disabled) return;
        
        e.preventDefault();
        e.stopPropagation();
        addProductToCart(btn.dataset.productId);
    });
}

function getImageHTML(product) {
    if (product.image && product.image.startsWith('data:')) {
        return `<img src="${product.image}" alt="${product.name}">`;
    }
    return product.image || '💨';
}

// === ФИЛЬТРЫ КАТЕГОРИЙ ===
function setupCategoryFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCatalog(btn.dataset.category);
        });
    });
}

// === ПЕРЕКЛЮЧЕНИЕ ТАБОВ ===
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const categoryBar = document.getElementById('categoryBar');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');

            if (categoryBar) {
                categoryBar.classList.toggle('visible', tabId === 'catalog');
            }

            if (tabId === 'cart') renderCart();
            if (tabId === 'admin' && isAdminLoggedIn) {
                renderAdminProducts();
            }

            updateLayout();
            scrollToTop();
        });
    });
}

// === КОРЗИНА ===
function addProductToCart(productId) {
    const product = findProductById(productId);
    if (!product || !product.inStock) return;
    
    const id = Number(product.id);
    const existingItem = cart.find(item => Number(item.id) === id);
    
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, id, qty: 1 });
    }
    
    saveCart();
    updateCartBadge();
    showNotification(`${product.name} добавлен в корзину`, 'success');
}

function removeProductFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
}

function changeCartQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    item.qty += delta;
    
    if (item.qty <= 0) {
        removeProductFromCart(productId);
        return;
    }
    
    saveCart();
    updateCartBadge();
    renderCart();
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelector('.cart-count').textContent = totalItems;
    
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('totalPrice').textContent = `${totalPrice} ₽`;
    
    document.getElementById('orderForm').style.display = cart.length > 0 ? 'block' : 'none';
}

function renderCart() {
    const container = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty">🛒 Корзина пуста</div>';
        document.getElementById('orderForm').style.display = 'none';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${getImageHTML(item)}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} ₽ × ${item.qty} = ${item.price * item.qty} ₽</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" data-action="decrease" data-product-id="${item.id}">−</button>
                <span class="cart-item-qty">${item.qty}</span>
                <button class="qty-btn" data-action="increase" data-product-id="${item.id}">+</button>
                <button class="btn-remove" data-action="remove" data-product-id="${item.id}">✕</button>
            </div>
        </div>
    `).join('');
    
    // Привязываем события
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = parseInt(btn.dataset.productId);
            const action = btn.dataset.action;
            
            if (action === 'increase') changeCartQuantity(productId, 1);
            else if (action === 'decrease') changeCartQuantity(productId, -1);
            else if (action === 'remove') removeProductFromCart(productId);
        });
    });
    
    updateCartBadge();
}

// === ОФОРМЛЕНИЕ ЗАКАЗА ===
function setupOrderForm() {
    const orderBtn = document.getElementById('btnOrder');
    
    orderBtn.addEventListener('click', () => {
        const telegram = document.getElementById('customerTelegram').value.trim();
        const comment = document.getElementById('customerComment').value.trim();
        
        if (cart.length === 0) {
            showNotification('Корзина пуста', 'error');
            return;
        }
        
        const order = {
            id: Date.now(),
            date: new Date().toLocaleString('ru-RU'),
            customer: { telegram, comment },
            items: [...cart],
            total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
            status: 'new'
        };
        
        orders.push(order);
        saveOrders();
        
        // Отправляем заказ в Telegram через сервер
        sendOrderToTelegram(order);
        
        // Очищаем корзину
        cart = [];
        saveCart();
        updateCartBadge();
        renderCart();
        
        // Очищаем форму
        document.getElementById('customerTelegram').value = '';
        document.getElementById('customerComment').value = '';
        
        showNotification('✅ Заказ оформлен! Мы свяжемся с вами', 'success');
    });
}

// === ОТПРАВКА В TELEGRAM ===
function sendOrderToTelegram(order) {
    fetch('send_order.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Ошибка отправки в Telegram:', data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка сети:', error);
    });
}

// === АДМИН ПАНЕЛЬ ===
function setupAdminPanel() {
    const loginBtn = document.getElementById('btnAdminLogin');
    const addProductBtn = document.getElementById('btnAddProduct');
    const imageInput = document.getElementById('productImage');
    
    // Вход админа
    loginBtn.addEventListener('click', () => {
        const password = document.getElementById('adminPassword').value;
        
        if (password === ADMIN_PASSWORD) {
            isAdminLoggedIn = true;
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            renderAdminProducts();
            showNotification('Добро пожаловать, Админ!', 'success');
        } else {
            showNotification('Неверный пароль', 'error');
        }
        
        document.getElementById('adminPassword').value = '';
    });
    
    // Загрузка изображения
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            currentProductImage = event.target.result;
            document.getElementById('imagePreview').innerHTML = `<img src="${currentProductImage}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    });
    
    // Добавление товара
    addProductBtn.addEventListener('click', async () => {
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = parseInt(document.getElementById('productPrice').value);
        const inStock = document.getElementById('productInStock').checked;
        const desc = document.getElementById('productDesc').value.trim();
        
        if (!name || !price) {
            showNotification('Заполните название и цену', 'error');
            return;
        }
        
        const newProduct = {
            id: Date.now(),
            name,
            category,
            price,
            inStock,
            desc,
            image: currentProductImage || '💨'
        };
        
        products.push(newProduct);
        await saveProducts();
        
        // Очистка формы
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productDesc').value = '';
        document.getElementById('productInStock').checked = true;
        document.getElementById('productImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        currentProductImage = null;
        
        renderCatalog();
        renderAdminProducts();
        showNotification(`Товар "${name}" добавлен`, 'success');
    });
    
    // Табы админки
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.adminTab;
            
            document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.admin-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabMap = {
                'add': 'adminAdd',
                'manage': 'adminManage'
            };
            document.getElementById(tabMap[tabId]).classList.add('active');
        });
    });
}

function renderAdminProducts() {
    const container = document.getElementById('productsList');
    
    container.innerHTML = products.map(product => `
        <div class="admin-product-item">
            <div class="cart-item-image">${getImageHTML(product)}</div>
            <div class="admin-product-info">
                <strong>${product.name}</strong>
                <div>${product.price} ₽ | <span class="${product.inStock ? 'in-stock' : 'out-of-stock'}">${product.inStock ? '✓ В наличии' : '✗ Нет в наличии'}</span></div>
            </div>
            <div class="admin-product-actions">
                <button class="btn-edit" data-action="toggle-stock" data-product-id="${product.id}">
                    ${product.inStock ? '❌ Нет в наличии' : '✅ В наличии'}
                </button>
                <button class="btn-delete" data-action="delete" data-product-id="${product.id}">🗑️</button>
            </div>
        </div>
    `).join('');
    
    // Привязываем события
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = parseInt(btn.dataset.productId);
            const action = btn.dataset.action;
            
            if (action === 'toggle-stock') await toggleProductStock(productId);
            else if (action === 'delete') await deleteProduct(productId);
        });
    });
}

async function deleteProduct(productId) {
    if (!confirm('Удалить этот товар?')) return;
    
    products = products.filter(p => p.id !== productId);
    await saveProducts();
    renderCatalog();
    renderAdminProducts();
    showNotification('Товар удален', 'success');
}

async function toggleProductStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    product.inStock = !product.inStock;
    await saveProducts();
    renderCatalog();
    renderAdminProducts();
    showNotification(product.inStock ? 'Товар в наличии' : 'Товар отсутствует', 'success');
}

function renderAdminOrders() {
    const container = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--gray); padding: 50px;">Нет заказов</div>';
        return;
    }
    
    container.innerHTML = orders.slice().reverse().map(order => `
        <div class="order-item">
            <div class="order-header">
                <span class="order-id">Заказ #${order.id}</span>
                <span class="order-date">${order.date}</span>
                <span class="order-status ${order.status}">${order.status === 'new' ? 'НОВЫЙ' : 'ВЫПОЛНЕН'}</span>
            </div>
            <div class="order-customer">
                ${order.customer.telegram ? `<p><strong>Telegram:</strong> ${order.customer.telegram}</p>` : ''}
                ${order.customer.comment ? `<p><strong>Комментарий:</strong> ${order.customer.comment}</p>` : ''}
            </div>
            <div class="order-products">
                ${order.items.map(item => `<div>• ${item.name} × ${item.qty} = ${item.price * item.qty} ₽</div>`).join('')}
            </div>
            <div class="order-total">Итого: ${order.total} ₽</div>
            ${order.status === 'new' ? `<button class="btn-add-cart" style="margin-top: 15px; background: var(--success);" data-action="complete" data-order-id="${order.id}">✓ ВЫПОЛНИТЬ ЗАКАЗ</button>` : ''}
        </div>
    `).join('');
    
    // Привязываем события
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const orderId = parseInt(btn.dataset.orderId);
            completeOrder(orderId);
        });
    });
}

function completeOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.status = 'completed';
    saveOrders();
    renderAdminOrders();
    showNotification('Заказ выполнен', 'success');
}

// === АДАПТИВНАЯ ВЁРСТКА ===
let layoutObserver = null;

function scrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

function updateLayout() {
    const navbar = document.getElementById('navbar');
    const categoryBar = document.getElementById('categoryBar');
    if (!navbar) return;

    const navHeight = navbar.offsetHeight;
    const categoryHeight = categoryBar && categoryBar.classList.contains('visible')
        ? categoryBar.offsetHeight
        : 0;

    document.documentElement.style.setProperty('--navbar-height', `${navHeight}px`);
    document.documentElement.style.setProperty('--category-bar-height', `${categoryHeight}px`);
    document.documentElement.style.setProperty(
        '--content-offset',
        `${navHeight + categoryHeight}px`
    );
}

function setupLayoutObserver() {
    const navbar = document.getElementById('navbar');
    const categoryBar = document.getElementById('categoryBar');
    if (!navbar || !window.ResizeObserver) return;

    if (layoutObserver) layoutObserver.disconnect();

    layoutObserver = new ResizeObserver(() => updateLayout());
    layoutObserver.observe(navbar);
    if (categoryBar) layoutObserver.observe(categoryBar);
}

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        updateLayout();
        scrollToTop();
    }
});

window.addEventListener('orientationchange', () => {
    requestAnimationFrame(() => {
        updateLayout();
        scrollToTop();
    });
});

// === ПЛАВНОЕ СМЕЩЕНИЕ ПАНЕЛИ КАТЕГОРИЙ ПРИ СКРОЛЛЕ ===
let lastScroll = 0;
let isScrolling = false;

function handleCategoryBarScroll() {
    const categoryBar = document.getElementById('categoryBar');
    if (!categoryBar || !categoryBar.classList.contains('visible')) return;

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > 50 && !isScrolling) {
        isScrolling = true;
        categoryBar.classList.add('scrolled');
    } else if (currentScroll <= 50 && isScrolling) {
        isScrolling = false;
        categoryBar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
}

// === ИНИЦИАЛИЗАЦИЯ ===
async function init() {
    await loadData();
    renderCatalog();
    updateCartBadge();
    setupTabs();
    setupCategoryFilters();
    setupCatalogActions();
    setupOrderForm();
    setupAdminPanel();
    setupLayoutObserver();
    updateLayout();
    scrollToTop();

    requestAnimationFrame(() => {
        updateLayout();
        scrollToTop();
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            updateLayout();
            scrollToTop();
        });
    }

    window.addEventListener('resize', updateLayout, { passive: true });
    window.addEventListener('scroll', handleCategoryBarScroll, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
window.PPHUB_READY = true;
