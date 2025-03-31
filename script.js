/**
 * Mega Market Search Assistant
 * Consolidated JavaScript file with all functionality
 * Simplified version without voice input, offline mode, and zoom
 */

// Configuration
const CONFIG = {
    API_URL: "http://192.168.10.147:5000",
    ECOMMERCE_URL: "https://online.mmvietnam.com/graphql",
    GEMINI_API_KEY: "AIzaSyA9FCEUZCfSUAceuTf-aFIrZA-g7-5nqng",
    AUTH_TOKEN_KEY: 'mm_auth_token',
    USER_EMAIL_KEY: 'mm_user_email',
    API_TIMEOUT: 10000 // 10 seconds timeout for API calls
};

// Utility Functions
const Utils = {
    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN').format(price);
    },
    
    generateSessionId() {
        return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return r.toString(16);
        });
    },
    
    scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    },
    
    setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("LocalStorage error:", error);
            return false;
        }
    },
    
    getLocalStorageItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error("LocalStorage read error:", error);
            return null;
        }
    },
    
    removeLocalStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error("LocalStorage remove error:", error);
            return false;
        }
    }
};

// Toast Notification System
const ToastService = {
    container: null,
    defaultDuration: 3000,
    
    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("Toast container not found");
            return false;
        }
        return true;
    },
    
    show(message, type = 'info', duration = this.defaultDuration) {
        if (!this.container) {
            console.error("Toast container not initialized");
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
        }
        
        // Build toast content
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">${message}</div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to DOM
        this.container.appendChild(toast);
        
        // Add active class after a small delay for animation
        setTimeout(() => {
            toast.classList.add('active');
        }, 10);
        
        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(toast);
            });
        }
        
        // Auto close after duration
        if (duration > 0) {
            setTimeout(() => {
                this.close(toast);
            }, duration);
        }
        
        return toast;
    },
    
    close(toast) {
        if (!toast) return;
        
        toast.classList.remove('active');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }
        }, 300);
    },
    
    success(message, duration = this.defaultDuration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration = this.defaultDuration) {
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration = this.defaultDuration) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration = this.defaultDuration) {
        return this.show(message, 'info', duration);
    }
};

// API Service
const ApiService = {
    async request(endpoint, method = 'GET', data = null, token = null) {
        const headers = { 
            'Content-Type': 'application/json',
            'Store': 'b2c_10010_vi' // Add default store header for GraphQL requests
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const options = {
            method,
            headers
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            console.log(`Making ${method} request to ${CONFIG.API_URL}${endpoint}`);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            options.signal = controller.signal;
            
            const response = await fetch(`${CONFIG.API_URL}${endpoint}`, options);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error details");
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            
            const jsonData = await response.json();
            return jsonData;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`Request timeout for ${method} ${endpoint}`);
                throw new Error(`Request timeout. The server took too long to respond.`);
            }
            
            console.error(`API Request Error (${method} ${endpoint}):`, error);
            
            // Enhanced error with endpoint information
            const enhancedError = new Error(`${error.message} (${method} ${endpoint})`);
            enhancedError.originalError = error;
            enhancedError.endpoint = endpoint;
            enhancedError.method = method;
            throw enhancedError;
        }
    },
    
    // Direct GraphQL API call to ecommerce platform
    async graphqlRequest(query, variables = null, token = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Store': 'b2c_10010_vi'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const payload = {
            query: query,
            variables: variables || {}
        };
        
        try {
            console.log('Making GraphQL request to Ecommerce platform');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(`${CONFIG.ECOMMERCE_URL}/graphql`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error details");
                throw new Error(`GraphQL API error: ${response.status} - ${errorText}`);
            }
            
            const jsonData = await response.json();
            return jsonData;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('GraphQL request timeout');
                throw new Error(`GraphQL request timeout. The server took too long to respond.`);
            }
            
            console.error('GraphQL Request Error:', error);
            throw error;
        }
    },
    
    async analyzeIntent(userMessage) {
        try {
            const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
            const requestBody = {
                contents: [{ parts: [{ text: `Người dùng muốn tìm kiếm sản phẩm. Yêu cầu của người dùng là: "${userMessage}". Hãy trích xuất **tất cả** các từ khóa sản phẩm mà người dùng muốn tìm và trả về một mảng JSON dưới dạng {\"keywords\":[\"từ khóa 1\", \"từ khóa 2\", ...]}. Nếu không tìm thấy từ khóa nào, hãy trả về mảng rỗng.` }] }]
            };

            const response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const jsonResponse = await response.json();
            const textResponse = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

            const cleanedJson = textResponse.replace(/`json|`/g, "").trim();
            try {
                const parsedResponse = JSON.parse(cleanedJson);
                return parsedResponse.keywords || [];
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                return [];
            }
        } catch (error) {
            console.error("Intent analysis error:", error);
            return [];
        }
    }
};

// Authentication Service
const AuthService = {
    get isLoggedIn() {
        return !!this.getToken();
    },
    
    getToken() {
        return Utils.getLocalStorageItem(CONFIG.AUTH_TOKEN_KEY);
    },
    
    getUserEmail() {
        return Utils.getLocalStorageItem(CONFIG.USER_EMAIL_KEY);
    },
    
    saveAuth(token, email) {
        Utils.setLocalStorageItem(CONFIG.AUTH_TOKEN_KEY, token);
        Utils.setLocalStorageItem(CONFIG.USER_EMAIL_KEY, email);
    },
    
    clearAuth() {
        Utils.removeLocalStorageItem(CONFIG.AUTH_TOKEN_KEY);
        Utils.removeLocalStorageItem(CONFIG.USER_EMAIL_KEY);
    },
    
    async login(email, password) {
        try {
            // Changed from '/auth/login' to '/login' to match backend endpoint
            const result = await ApiService.request('/login', 'POST', { email, password });
            
            if (result.data && result.data.generateCustomerToken && result.data.generateCustomerToken.token) {
                const token = result.data.generateCustomerToken.token;
                this.saveAuth(token, email);
                return { success: true, token };
            } else {
                const errorMsg = result.errors && result.errors[0] ? result.errors[0].message : "Login failed";
                return { success: false, error: errorMsg };
            }
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: "An error occurred during login" };
        }
    },
    
    logout() {
        this.clearAuth();
        return true;
    }
};

// Cart Service
const CartService = {
    _cartId: null,
    _guestCartId: null,
    _cartItems: [],
    
    get cartId() {
        return this._cartId;
    },
    
    set cartId(id) {
        this._cartId = id;
    },
    
    get guestCartId() {
        return this._guestCartId;
    },
    
    set guestCartId(id) {
        this._guestCartId = id;
    },
    
    get cartItems() {
        return this._cartItems;
    },
    
    set cartItems(items) {
        this._cartItems = items;
    },
    
    get itemCount() {
        return this._cartItems.reduce((total, item) => total + item.quantity, 0);
    },
    
    async createGuestCart() {
        try {
            const result = await ApiService.request('/cart/create', 'POST', {});
            if (result.cart_id) {
                this._guestCartId = result.cart_id;
                this._cartId = this._guestCartId;
                return result.cart_id;
            }
            return null;
        } catch (error) {
            console.error("Error creating guest cart:", error);
            return null;
        }
    },
    
    async createAuthenticatedCart(token) {
        try {
            // First try to use the backend API
            try {
                const result = await ApiService.request('/cart/create', 'POST', { customer_token: token }, token);
                if (result.cart_id) {
                    this._cartId = result.cart_id;
                    return result.cart_id;
                }
            } catch (error) {
                console.warn("Backend API cart creation failed, trying direct GraphQL:", error);
            }
            
            // If backend fails, try direct GraphQL communication
            const query = `
            mutation CreateCartAfterSignIn {
                cartId: createEmptyCart
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(query, null, token);
            
            if (graphqlResult.data && graphqlResult.data.cartId) {
                this._cartId = graphqlResult.data.cartId;
                console.log("Cart created via direct GraphQL:", this._cartId);
                return this._cartId;
            }
            
            return null;
        } catch (error) {
            console.error("Error creating authenticated cart:", error);
            return null;
        }
    },
    
    async getCart(specificCartId = null) {
        const cartId = specificCartId || this._cartId;
        if (!cartId) return { error: "No cart ID available" };
        
        try {
            const token = AuthService.getToken();
            
            // First try backend API
            try {
                const result = await ApiService.request(`/cart/${cartId}`, 'GET', null, token);
                
                if (result.data && result.data.cart) {
                    this._cartItems = result.data.cart.items || [];
                }
                
                return result;
            } catch (backendError) {
                console.warn("Backend get cart failed, trying direct GraphQL:", backendError);
            }
            
            // If backend fails, try direct GraphQL
            const graphqlQuery = `
            query GetCart($cartId: String!) {
                cart(cart_id: $cartId) {
                    items {
                        id
                        product {
                            name
                            sku
                            small_image {
                                url
                            }
                        }
                        quantity
                        prices {
                            price {
                                value
                                currency
                            }
                        }
                    }
                    prices {
                        grand_total {
                            value
                            currency
                        }
                    }
                }
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(
                graphqlQuery, 
                { cartId: cartId }, 
                token
            );
            
            if (graphqlResult.data && graphqlResult.data.cart) {
                this._cartItems = graphqlResult.data.cart.items || [];
                return { data: graphqlResult.data };
            }
            
            return { error: "Failed to get cart via GraphQL" };
        } catch (error) {
            console.error("Error getting cart:", error);
            return { error: "Failed to get cart: " + error.message };
        }
    },
    
    async addToCart(sku, quantity = 1) {
        if (!this._cartId) {
            // Create a cart if we don't have one
            if (AuthService.isLoggedIn) {
                const token = AuthService.getToken();
                await this.createAuthenticatedCart(token);
            } else {
                await this.createGuestCart();
            }
            
            if (!this._cartId) {
                return { error: "Failed to create cart" };
            }
        }
        
        try {
            const token = AuthService.isLoggedIn ? AuthService.getToken() : null;
            
            // First try backend API
            try {
                const result = await ApiService.request('/cart/add', 'POST', {
                    cart_id: this._cartId,
                    sku: sku,
                    quantity: quantity
                }, token);
                
                await this.getCart();
                return result;
            } catch (backendError) {
                console.warn("Backend add to cart failed, trying direct GraphQL:", backendError);
            }
            
            // If backend fails, try direct GraphQL communication
            const graphqlQuery = `
            mutation {
                addProductsToCart(
                    cartId: "${this._cartId}",
                    cartItems: [
                        {
                            quantity: ${quantity},
                            sku: "${sku}"
                        }
                    ]
                ) {
                    cart {
                        itemsV2 {
                            items {
                                product {
                                    name
                                    sku
                                }
                                quantity
                            }
                        }
                    }
                    user_errors {
                        code
                        message
                    }
                }
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(graphqlQuery, null, token);
            console.log("GraphQL add to cart result:", graphqlResult);
            
            if (graphqlResult.errors && graphqlResult.errors.length > 0) {
                return { error: graphqlResult.errors[0].message };
            }
            
            if (graphqlResult.data && graphqlResult.data.addProductsToCart) {
                if (graphqlResult.data.addProductsToCart.user_errors && 
                    graphqlResult.data.addProductsToCart.user_errors.length > 0) {
                    return { error: graphqlResult.data.addProductsToCart.user_errors[0].message };
                }
                
                await this.getCart();
                return graphqlResult;
            }
            
            return { error: "Failed to add item to cart" };
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { error: "Failed to add item to cart: " + error.message };
        }
    },
    
    async transferCartItems(sourceCartId, targetCartId) {
        try {
            // Get items from source cart
            const sourceCart = await this.getCart(sourceCartId);
            
            if (sourceCart.error || !sourceCart.data || !sourceCart.data.cart || !sourceCart.data.cart.items) {
                return false;
            }
            
            const items = sourceCart.data.cart.items;
            const token = AuthService.getToken();
            
            // Add each item to target cart
            for (const item of items) {
                await ApiService.request('/cart/add', 'POST', {
                    cart_id: targetCartId,
                    sku: item.product.sku,
                    quantity: item.quantity
                }, token);
            }
            
            return true;
        } catch (error) {
            console.error("Error transferring cart items:", error);
            return false;
        }
    },
    
    async getCheckoutUrl() {
        if (!this._cartId) return null;
        const checkoutUrl = `${ECOMMERCE_URL}/cart/?cart_id=${cartId}`;
            window.open(checkoutUrl, '_blank');
            
            addBotMessageToChat("Đang chuyển hướng đến trang thanh toán. Vui lòng hoàn tất thanh toán trên trang web Mega Market.");

    }
};

// Search Service
const SearchService = {
    async searchProduct(keyword) {
        try {
            const result = await ApiService.request('/search', 'POST', { keyword });
            return result;
        } catch (error) {
            console.error(`Search error for "${keyword}":`, error);
            return { error: "Search failed", details: error.toString() };
        }
    },
    
    async getProductDetails(sku) {
        try {
            const result = await ApiService.request(`/product/${sku}`, 'GET');
            return result;
        } catch (error) {
            console.error(`Error getting product details for "${sku}":`, error);
            return { error: "Failed to get product details", details: error.toString() };
        }
    },
    
    processSearchResults(result) {
        if (result.error) {
            return {
                error: result.error,
                details: result.details
            };
        }
        
        if (result.data && result.data.products) {
            return {
                total_count: result.data.products.total_count,
                products: result.data.products.items.map(item => ({
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    small_image: item.small_image || { url: "placeholder-image.png" },
                    price_range: item.price_range || {
                        maximum_price: {
                            final_price: {
                                value: Math.floor(Math.random() * 1000000) + 100000, // Fallback random price
                                currency: "VND"
                            },
                            discount: {
                                amount_off: 0,
                                percent_off: 0
                            }
                        }
                    }
                }))
            };
        }
        
        return {
            error: "Invalid search results",
            details: "Data not in expected format"
        };
    }
};

// Chat UI
const ChatUI = {
    chatWindow: null,
    chatInput: null,
    typingIndicator: null,
    isTyping: false,
    
    initialize(selectors) {
        this.chatWindow = document.getElementById(selectors.chatWindow);
        this.chatInput = document.getElementById(selectors.chatInput);
        this.typingIndicator = document.getElementById(selectors.typingIndicator);
        
        if (!this.chatWindow || !this.chatInput || !this.typingIndicator) {
            console.error("Failed to initialize ChatUI: Missing elements");
            return false;
        }
        return true;
    },
    
    setTypingState(typing) {
        this.isTyping = typing;
        if (typing) {
            this.typingIndicator.classList.add("active");
        } else {
            this.typingIndicator.classList.remove("active");
        }
    },
    
    addUserMessageToChat(text) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("user-message");
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">${text}</div>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
        
        this.chatWindow.appendChild(messageElement);
        Utils.scrollToBottom(this.chatWindow);
    },
    
    addBotMessageToChat(text, includeQuickActions = false, includeLoginAction = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("bot-message");
        
        let quickActionsHTML = '';
        if (includeQuickActions) {
            quickActionsHTML = `
                <div class="quick-actions">
                    <button class="quick-action-btn" data-action="Tìm điện thoại">Tìm điện thoại</button>
                    <button class="quick-action-btn" data-action="Tìm laptop">Tìm laptop</button>
                    <button class="quick-action-btn" data-action="Tìm phụ kiện">Tìm phụ kiện</button>
                </div>
            `;
        }
        
        let loginActionHTML = '';
        if (includeLoginAction) {
            loginActionHTML = `
                <div class="login-action" id="login-chat-btn">
                    Đăng nhập
                </div>
            `;
        }
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="assets/mega-market-logo.png" alt="Mega Market" class="bot-logo" onerror="this.onerror=null; this.src='https://via.placeholder.com/36x36?text=MM';">
            </div>
            <div class="message-content">
                <div class="message-text">${text}</div>
                ${quickActionsHTML}
                ${loginActionHTML}
            </div>
        `;
        
        this.chatWindow.appendChild(messageElement);
        Utils.scrollToBottom(this.chatWindow);
        
        return messageElement;
    },
    
    clearChatHistory() {
        // Clear the chat window except for the welcome message
        while (this.chatWindow.childNodes.length > 1) {
            this.chatWindow.removeChild(this.chatWindow.lastChild);
        }
    }
};

// Product UI
const ProductUI = {
    productContainer: null,
    cartContainer: null,
    loginContainer: null,
    
    initialize(selectors) {
        this.productContainer = document.getElementById(selectors.productContainer);
        this.cartContainer = document.getElementById(selectors.cartContainer);
        this.loginContainer = document.getElementById(selectors.loginContainer);
        
        if (!this.productContainer || !this.cartContainer || !this.loginContainer) {
            console.error("Failed to initialize ProductUI: Missing elements");
            return false;
        }
        
        return true;
    },
    
    showProductContainer() {
        this.productContainer.classList.add("active");
        this.cartContainer.classList.remove("active");
        this.loginContainer.classList.remove("active");
    },
    
    hideProductContainer() {
        this.productContainer.classList.remove("active");
    },
    
    showCartContainer() {
        this.cartContainer.classList.add("active");
        this.productContainer.classList.remove("active");
        this.loginContainer.classList.remove("active");
    },
    
    hideCartContainer() {
        this.cartContainer.classList.remove("active");
    },
    
    showLoginContainer() {
        this.loginContainer.classList.add("active");
        this.productContainer.classList.remove("active");
        this.cartContainer.classList.remove("active");
    },
    
    hideLoginContainer() {
        this.loginContainer.classList.remove("active");
    },
    
    renderProductResponse(data) {
        this.showProductContainer();
        
        let html = '<h4>Kết quả tìm kiếm sản phẩm:</h4>';
        
        // For each keyword
        for (const keyword in data.results) {
            const result = data.results[keyword];
            
            if (result.error) {
                html += `<div class="error-message">Lỗi khi tìm kiếm "${keyword}": ${result.error}</div>`;
                continue;
            }
            
            if (result.total_count === 0) {
                html += `<div class="no-results">Không tìm thấy sản phẩm nào cho "${keyword}"</div>`;
                continue;
            }
            
            html += `
                <div class="product-section">
                    <h5 class="product-section-title">Kết quả cho "${keyword}" (${result.total_count} sản phẩm)</h5>
                    <div class="product-carousel">
            `;
            
            result.products.forEach(product => {
                const priceInfo = product.price_range.maximum_price;
                const finalPrice = priceInfo.final_price;
                const discount = priceInfo.discount;
                
                const formattedFinalPrice = `${Utils.formatPrice(finalPrice.value)} ${finalPrice.currency}`;
                let discountText = '';
                
                if (discount && discount.percent_off > 0) {
                    discountText = `<span class="discount-badge">-${discount.percent_off.toFixed(0)}%</span>`;
                }
                
                html += `
                    <div class="product-card">
                        ${discountText}
                        <div class="product-image-container">
                            <img class="product-thumbnail" src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                        </div>
                        <div class="product-info">
                            <h5 class="product-name">${product.name}</h5>
                            <p class="product-sku">SKU: ${product.sku}</p>
                            <p class="product-price">${formattedFinalPrice}</p>
                            <div class="product-actions">
                                <button class="view-details-btn" data-sku="${product.sku}">Xem chi tiết</button>
                                <button class="add-to-cart-btn" data-sku="${product.sku}">
                                    <i class="fas fa-shopping-cart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        this.productContainer.innerHTML = html;
    },
    
    renderProductDetailView(product) {
        this.showProductContainer();
        
        const priceInfo = product.price_range.maximum_price;
        const finalPrice = priceInfo.final_price;
        const regularPrice = product.price?.regularPrice?.amount;
        const discount = priceInfo.discount;
        
        let discountHTML = '';
        if (discount && discount.percent_off > 0) {
            discountHTML = `
                <div class="product-discount">
                    <span class="original-price">${Utils.formatPrice(regularPrice.value)} ${regularPrice.currency}</span>
                    <span class="discount-percent">-${discount.percent_off.toFixed(0)}%</span>
                </div>
            `;
        }
        
        let galleryHTML = '';
        if (product.media_gallery_entries && product.media_gallery_entries.length > 0) {
            galleryHTML = '<div class="product-gallery">';
            
            product.media_gallery_entries.forEach(media => {
                galleryHTML += `
                    <div class="gallery-image">
                        <img src="${media.file}" alt="${media.label || product.name}" 
                            onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                    </div>
                `;
            });
            
            galleryHTML += '</div>';
        }
        
        const html = `
            <div class="product-detail">
                <button class="back-btn" id="back-to-search">
                    <i class="fas fa-arrow-left"></i> Quay lại kết quả tìm kiếm
                </button>
                
                <div class="product-detail-content">
                    <div class="product-detail-image">
                        <img src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" 
                            onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                    </div>
                    
                    <div class="product-detail-info">
                        <h3 class="product-detail-name">${product.name}</h3>
                        <p class="product-detail-sku">SKU: ${product.sku}</p>
                        
                        <div class="product-detail-price">
                            <span class="final-price">${Utils.formatPrice(finalPrice.value)} ${finalPrice.currency}</span>
                            ${discountHTML}
                        </div>
                        
                        <div class="product-detail-unit">
                            <span>Đơn vị: ${product.unit_ecom || 'Cái'}</span>
                        </div>
                        
                        <div class="product-detail-actions">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" id="decrease-quantity">-</button>
                                <input type="number" id="product-quantity" value="1" min="1" max="99">
                                <button class="quantity-btn plus" id="increase-quantity">+</button>
                            </div>
                            
                            <button class="add-to-cart-btn full-width" id="add-detail-to-cart" data-sku="${product.sku}">
                                <i class="fas fa-shopping-cart"></i> Thêm vào giỏ hàng
                            </button>
                        </div>
                    </div>
                </div>
                
                ${galleryHTML}
                
                <div class="product-description">
                    <h4>Mô tả sản phẩm</h4>
                    <div class="description-content">
                        ${product.description?.html || 'Chưa có mô tả cho sản phẩm này.'}
                    </div>
                </div>
            </div>
        `;
        
        this.productContainer.innerHTML = html;
    },
    
    renderCartView(cartData) {
        let cartHtml = '<h4>Giỏ hàng của bạn</h4>';
        
        if (!cartData.data || !cartData.data.cart || !cartData.data.cart.items || cartData.data.cart.items.length === 0) {
            cartHtml += '<div class="no-results">Giỏ hàng trống</div>';
            this.cartContainer.innerHTML = cartHtml;
            return;
        }
        
        const items = cartData.data.cart.items;
        const grandTotal = cartData.data.cart.prices?.grand_total || { value: 0, currency: "VND" };
        
        cartHtml += '<div class="cart-items">';
        
        items.forEach(item => {
            const product = item.product;
            const price = item.prices?.price || { value: 0, currency: "VND" };
            const totalPrice = price.value * item.quantity;
            
            cartHtml += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                    </div>
                    <div class="cart-item-details">
                        <h5 class="cart-item-name">${product.name}</h5>
                        <p class="cart-item-sku">SKU: ${product.sku}</p>
                        <p class="cart-item-price">${Utils.formatPrice(price.value)} ${price.currency}</p>
                        <div class="cart-item-quantity">
                            Số lượng: ${item.quantity}
                        </div>
                    </div>
                    <div class="cart-item-total">
                        ${Utils.formatPrice(totalPrice)} ${price.currency}
                    </div>
                </div>
            `;
        });
        
        cartHtml += '</div>';
        
        cartHtml += `
            <div class="cart-summary">
                <div class="cart-total">
                    <span>Tổng cộng:</span>
                    <span>${Utils.formatPrice(grandTotal.value)} ${grandTotal.currency}</span>
                </div>
                <button class="checkout-btn" id="checkout-btn">
                    ${AuthService.isLoggedIn ? 'Thanh toán' : 'Đăng nhập & Thanh toán'}
                </button>
            </div>
        `;
        
        this.cartContainer.innerHTML = cartHtml;
    },
    
    updateCartCount(count) {
        const cartCounter = document.getElementById('cart-counter');
        if (cartCounter) {
            cartCounter.textContent = count;
            cartCounter.style.display = count > 0 ? "flex" : "none";
        }
    }
};

// Debug Utility Functions
const DebugUtils = {
    async checkBackendRoutes() {
        const routesToCheck = [
            { method: 'OPTIONS', path: '/' },
            { method: 'OPTIONS', path: '/login' },
            { method: 'OPTIONS', path: '/search' },
            { method: 'OPTIONS', path: '/cart/create' },
            { method: 'OPTIONS', path: '/cart/add' }
        ];
        
        console.log("Checking backend routes availability:");
        
        for (const route of routesToCheck) {
            try {
                const response = await fetch(`${CONFIG.API_URL}${route.path}`, {
                    method: route.method,
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`[Route Check] ${route.method} ${route.path}: ${response.status} ${response.ok ? 'OK' : 'Failed'}`);
            } catch (error) {
                console.error(`[Route Check] ${route.method} ${route.path}: Error - ${error.message}`);
            }
        }
    }
};

// Main Application 
document.addEventListener("DOMContentLoaded", function() {
    // DOM Elements
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const clearInput = document.getElementById("clear-input");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    const cartIcon = document.getElementById("cart-icon");
    const userInfoDisplay = document.getElementById("user-info");
    const loginForm = document.getElementById("login-form");
    const loginCloseBtn = document.getElementById("login-close");
    const loadingScreen = document.getElementById("loading-screen");
    
    // State variables
    let conversationHistory = [];
    let checkoutAfterLogin = false;
    
    // Initialize app
    initializeApp().then(() => {
        // Hide loading screen when done
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }).catch(error => {
        console.error('Application initialization error:', error);
        
        // Show error message
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Application Error</h3>
                    <p>Failed to initialize the application. Please refresh the page or try again later.</p>
                    <button id="reload-btn" class="reload-btn">Refresh</button>
                </div>
            `;
            
            document.getElementById('reload-btn')?.addEventListener('click', () => {
                window.location.reload();
            });
        }
    });
    
    async function initializeApp() {
        // Initialize services
        ToastService.initialize('toast-container');
        if (!ChatUI.initialize({
            chatWindow: "chat-window",
            chatInput: "chat-input",
            typingIndicator: "typing-indicator"
        })) {
            throw new Error("Failed to initialize ChatUI");
        }
        
        if (!ProductUI.initialize({
            productContainer: "product-container",
            cartContainer: "cart-container",
            loginContainer: "login-container"
        })) {
            throw new Error("Failed to initialize ProductUI");
        }
        
        // Initialize cart
        await initializeCart();
        
        // Check if user is already logged in
        updateUserDisplay();
        
        // Add welcome message with login option if not logged in
        if (!AuthService.isLoggedIn) {
            addLoginButton();
        }
        
        // Setup event listeners
        setupEventListeners();
        
        return true;
    }
    
    async function initializeCart() {
        try {
            if (AuthService.isLoggedIn) {
                // For logged-in users
                const token = AuthService.getToken();
                await CartService.createAuthenticatedCart(token);
            } else {
                // For guest users
                await CartService.createGuestCart();
            }
            
            if (CartService.cartId) {
                await updateCartDisplay();
            }
            
            return true;
        } catch (error) {
            console.error("Cart initialization error:", error);
            ToastService.error("Failed to initialize shopping cart");
            return false;
        }
    }
    
    function setupEventListeners() {
        // Send message on button click
        if (sendButton) {
            sendButton.addEventListener("click", handleSendMessage);
        }
        
        // Send message on Enter key
        if (chatInput) {
            chatInput.addEventListener("keypress", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendMessage();
                }
            });
        }
        
        // Clear input on button click
        if (clearInput) {
            clearInput.addEventListener("click", function() {
                if (chatInput) {
                    chatInput.value = "";
                    clearInput.style.display = "none";
                }
            });
            
            // Show/hide clear button based on input
            if (chatInput) {
                chatInput.addEventListener("input", function() {
                    clearInput.style.display = chatInput.value.length > 0 ? "block" : "none";
                });
            }
        }
        
        // Clear chat history
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener("click", function() {
                ChatUI.clearChatHistory();
                conversationHistory = [];
                ToastService.info("Lịch sử trò chuyện đã được xóa");
            });
        }
        
        // Show cart - require login first
        if (cartIcon) {
            cartIcon.addEventListener("click", async function() {
                // Check if user is logged in
                if (!AuthService.isLoggedIn) {
                    // Remember that user wanted to see cart
                    checkoutAfterLogin = true;
                    
                    // Set hidden field value to true
                    const checkoutToggle = document.getElementById("checkout-after-login");
                    if (checkoutToggle) {
                        checkoutToggle.value = "true";
                    }
                    
                    // Show login form
                    ProductUI.showLoginContainer();
                    ToastService.info("Vui lòng đăng nhập trước khi xem giỏ hàng");
                } else {
                    // User is logged in, show cart
                    await showCart();
                }
            });
        }
        
        // Login form submission
        if (loginForm) {
            loginForm.addEventListener("submit", async function(event) {
                event.preventDefault();
                await handleLogin();
            });
        }
        
        // Close login form
        if (loginCloseBtn) {
            loginCloseBtn.addEventListener("click", function() {
                ProductUI.hideLoginContainer();
            });
        }
        
        // Global event listener for quick action buttons
        document.addEventListener("click", async function(event) {
            // Quick action buttons
            if (event.target.classList.contains("quick-action-btn") || 
                event.target.parentElement.classList.contains("quick-action-btn")) {
                
                const button = event.target.classList.contains("quick-action-btn") ? 
                    event.target : event.target.parentElement;
                
                const action = button.getAttribute("data-action");
                if (action) {
                    chatInput.value = action;
                    handleSendMessage();
                }
            }
            
            // Login action in chat
            if (event.target.id === "login-chat-btn" || 
                (event.target.parentElement && event.target.parentElement.id === "login-chat-btn")) {
                ProductUI.showLoginContainer();
            }
            
            // View product details
            if (event.target.classList.contains("view-details-btn")) {
                const sku = event.target.getAttribute("data-sku");
                if (sku) {
                    await viewProductDetails(sku);
                }
            }
            
            // Add to cart from product list
            if (event.target.classList.contains("add-to-cart-btn") || 
                (event.target.parentElement && event.target.parentElement.classList.contains("add-to-cart-btn"))) {
                
                const button = event.target.classList.contains("add-to-cart-btn") ? 
                    event.target : event.target.parentElement;
                
                const sku = button.getAttribute("data-sku");
                if (sku) {
                    await addProductToCart(sku, 1);
                }
            }
            
            // Back to search results
            if (event.target.id === "back-to-search" || 
                (event.target.parentElement && event.target.parentElement.id === "back-to-search")) {
                // If we have previous search results, show them
                if (document.querySelector(".product-section")) {
                    ProductUI.showProductContainer();
                } else {
                    ProductUI.hideProductContainer();
                }
            }
            
            // Add to cart from product detail
            if (event.target.id === "add-detail-to-cart" || 
                (event.target.parentElement && event.target.parentElement.id === "add-detail-to-cart")) {
                
                const button = event.target.id === "add-detail-to-cart" ? 
                    event.target : event.target.parentElement;
                
                const sku = button.getAttribute("data-sku");
                const quantityInput = document.getElementById("product-quantity");
                const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;
                
                if (sku && quantity > 0) {
                    await addProductToCart(sku, quantity);
                }
            }
            
            // Quantity selector
            if (event.target.id === "decrease-quantity") {
                const quantityInput = document.getElementById("product-quantity");
                if (quantityInput) {
                    const currentValue = parseInt(quantityInput.value, 10);
                    if (currentValue > 1) {
                        quantityInput.value = currentValue - 1;
                    }
                }
            }
            
            if (event.target.id === "increase-quantity") {
                const quantityInput = document.getElementById("product-quantity");
                if (quantityInput) {
                    const currentValue = parseInt(quantityInput.value, 10);
                    if (currentValue < 99) {
                        quantityInput.value = currentValue + 1;
                    }
                }
            }
            
            // Checkout button
            if (event.target.id === "checkout-btn") {
                await handleCheckout();
            }
        });
    }
    
    async function handleSendMessage() {
        const userMessage = chatInput.value.trim();
        
        if (!userMessage) {
            return;
        }
        
        // Clear input and hide clear button
        chatInput.value = "";
        if (clearInput) {
            clearInput.style.display = "none";
        }
        
        // Add user message to chat
        ChatUI.addUserMessageToChat(userMessage);
        
        // Hide product and cart containers
        ProductUI.hideProductContainer();
        ProductUI.hideCartContainer();
        
        // Show typing indicator
        ChatUI.setTypingState(true);
        
        // Process user message
        await processUserMessage(userMessage);
        
        // Hide typing indicator
        ChatUI.setTypingState(false);
    }
    
    async function processUserMessage(userMessage) {
        try {
            // Analyze message intent using Gemini API
            const keywords = await ApiService.analyzeIntent(userMessage);
            
            // If no keywords found
            if (!keywords || keywords.length === 0) {
                ChatUI.addBotMessageToChat(
                    "Xin lỗi, tôi không hiểu bạn đang tìm kiếm sản phẩm gì. Vui lòng thử lại với cụm từ khác hoặc chọn một trong các danh mục dưới đây:",
                    true
                );
                return;
            }
            
            // Add bot response
            ChatUI.addBotMessageToChat(`Đang tìm kiếm sản phẩm cho: "${keywords.join(', ')}"`);
            
            // Search products
            const searchResults = {};
            for (const keyword of keywords) {
                const result = await SearchService.searchProduct(keyword);
                searchResults[keyword] = SearchService.processSearchResults(result);
            }
            
            // Show search results
            ProductUI.renderProductResponse({ results: searchResults });
            
            ChatUI.addBotMessageToChat("Đây là kết quả tìm kiếm sản phẩm của bạn. Bạn có thể xem chi tiết hoặc thêm vào giỏ hàng.");
            
        } catch (error) {
            console.error("Error processing message:", error);
            ChatUI.addBotMessageToChat("Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.");
            ToastService.error("Lỗi xử lý yêu cầu");
        }
    }
    
    async function viewProductDetails(sku) {
        try {
            // Show typing indicator
            ChatUI.setTypingState(true);
            
            // Get product details
            const result = await SearchService.getProductDetails(sku);
            
            if (result.error) {
                ToastService.error("Không thể tải thông tin sản phẩm");
                return;
            }
            
            if (result.data && result.data.products && result.data.products.items && result.data.products.items.length > 0) {
                const product = result.data.products.items[0];
                ProductUI.renderProductDetailView(product);
            } else {
                ToastService.error("Không tìm thấy thông tin sản phẩm");
            }
        } catch (error) {
            console.error("Error getting product details:", error);
            ToastService.error("Lỗi khi tải thông tin sản phẩm");
        } finally {
            // Hide typing indicator
            ChatUI.setTypingState(false);
        }
    }
    
    async function addProductToCart(sku, quantity) {
        try {
            const result = await CartService.addToCart(sku, quantity);
            
            if (result.error) {
                ToastService.error(result.error);
                return;
            }
            
            if (result.data && result.data.addProductsToCart && result.data.addProductsToCart.user_errors && result.data.addProductsToCart.user_errors.length > 0) {
                const errorMsg = result.data.addProductsToCart.user_errors[0].message;
                ToastService.error(errorMsg);
                return;
            }
            
            await updateCartDisplay();
            ToastService.success("Sản phẩm đã được thêm vào giỏ hàng");
        } catch (error) {
            console.error("Error adding to cart:", error);
            ToastService.error("Lỗi khi thêm sản phẩm vào giỏ hàng");
        }
    }
    
    async function showCart() {
        try {
            ChatUI.setTypingState(true);
            
            const cartData = await CartService.getCart();
            ProductUI.renderCartView(cartData);
            ProductUI.showCartContainer();
            
            ChatUI.setTypingState(false);
        } catch (error) {
            console.error("Error showing cart:", error);
            ToastService.error("Lỗi khi hiển thị giỏ hàng");
            ChatUI.setTypingState(false);
        }
    }
    
    async function updateCartDisplay() {
        try {
            if (CartService.cartId) {
                await CartService.getCart();
                ProductUI.updateCartCount(CartService.itemCount);
            }
        } catch (error) {
            console.error("Error updating cart display:", error);
        }
    }
    
    async function handleLogin() {
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const checkoutToggle = document.getElementById("checkout-after-login");
        
        if (!emailInput || !passwordInput) {
            ToastService.error("Missing form fields");
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        checkoutAfterLogin = checkoutToggle && checkoutToggle.value === "true";
        
        if (!email || !password) {
            ToastService.error("Vui lòng nhập email và mật khẩu");
            return;
        }
        
        try {
            const result = await AuthService.login(email, password);
            
            if (result.success) {
                // Update user display
                updateUserDisplay();
                
                // Hide login container
                ProductUI.hideLoginContainer();
                
                // Create authenticated cart
                await CartService.createAuthenticatedCart(result.token);
                
                // If there was a guest cart, transfer items
                if (CartService.guestCartId && CartService.guestCartId !== CartService.cartId) {
                    await CartService.transferCartItems(CartService.guestCartId, CartService.cartId);
                }
                
                // Update cart display
                await updateCartDisplay();
                
                // Success message
                ToastService.success("Đăng nhập thành công");
                
                // Proceed to checkout if requested
                if (checkoutAfterLogin) {
                    await handleCheckout();
                    checkoutAfterLogin = false;
                }
            } else {
                ToastService.error(result.error || "Đăng nhập thất bại");
            }
        } catch (error) {
            console.error("Login error:", error);
            ToastService.error("Lỗi khi đăng nhập");
        }
    }
    
    async function handleCheckout() {
        if (!CartService.cartId) {
            ToastService.error("Không có giỏ hàng để thanh toán");
            return;
        }
        
        if (!AuthService.isLoggedIn) {
            // Set flag to redirect to checkout after login
            const checkoutToggle = document.getElementById("checkout-after-login");
            if (checkoutToggle) {
                checkoutToggle.value = "true";
            }
            checkoutAfterLogin = true;
            
            // Show login form
            ProductUI.showLoginContainer();
            ToastService.info("Vui lòng đăng nhập để thanh toán");
            return;
        }
        
        try {
            const checkoutUrl = await CartService.getCheckoutUrl();
            
            if (checkoutUrl) {
                // Redirect to checkout
                window.location.href = checkoutUrl;
            } else {
                ToastService.error("Không thể bắt đầu thanh toán");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            ToastService.error("Lỗi khi bắt đầu thanh toán");
        }
    }
    
    function updateUserDisplay() {
        if (!userInfoDisplay) return;
        
        if (AuthService.isLoggedIn) {
            const userEmail = AuthService.getUserEmail();
            userInfoDisplay.innerHTML = `
                <div class="user-email">${userEmail}</div>
                <button id="logout-btn" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            userInfoDisplay.classList.remove("hidden");
            
            // Add logout event listener
            const logoutBtn = document.getElementById("logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", function() {
                    AuthService.logout();
                    updateUserDisplay();
                    ToastService.info("Bạn đã đăng xuất");
                    
                    // Reset guest cart
                    initializeCart();
                });
            }
        } else {
            userInfoDisplay.innerHTML = "";
            userInfoDisplay.classList.add("hidden");
        }
    }
    
    function addLoginButton() {
        // Add login button to first bot message if user is not logged in
        const firstBotMessage = document.querySelector(".bot-message .message-content");
        
        if (firstBotMessage && !AuthService.isLoggedIn) {
            // Check if login button already exists
            if (!firstBotMessage.querySelector(".login-action")) {
                const loginButton = document.createElement("div");
                loginButton.className = "login-action";
                loginButton.id = "login-chat-btn";
                loginButton.textContent = "Đăng nhập";
                
                firstBotMessage.appendChild(loginButton);
            }
        }
    }
});
