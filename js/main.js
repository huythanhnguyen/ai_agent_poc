/**
 * Mega Market Search Assistant
 * Cải tiến với đăng nhập đầu tiên và giao diện theo Open Web UI
 */

import AuthService from './AuthService.js';
import CartService from './CartService.js';
import ChatUI from './ChatUI.js';
import ProductUI from './ProductUI.js';
import ApiService from './ApiService.js';
import SearchService from './SearchService.js';
import Utils from './Utils.js';
import ToastService from './ToastService.js';
import CONFIG from './Config.js';
import AuthUI from './AuthUI.js';
import HistoryService from './HistoryService.js';


// =====================================================================
// Main Application 
// =====================================================================
// Bắt lỗi import không tìm thấy
window.addEventListener('error', function(event) {
    console.error('Lỗi loading module:', event.filename, event.message);
});
document.addEventListener("DOMContentLoaded", function() {
    // DOM Elements
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const clearInput = document.getElementById("clear-input");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    const cartIcon = document.getElementById("cart-icon");
    const userInfoDisplay = document.getElementById("user-info");
    const logoutBtn = document.getElementById("logout-btn");
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app-container");
    
    // State variables
    let conversationHistory = [];
    let sessionId = Utils.getLocalStorageItem(CONFIG.SESSION_ID_KEY) || Utils.generateSessionId();
    Utils.setLocalStorageItem(CONFIG.SESSION_ID_KEY, sessionId);
    
    // Initialize app
    initializeApp().then(async () => {
        // Try auto login
        const isLoggedIn = AuthService.autoLogin();
        
        if (isLoggedIn) {
            // Already logged in, show app directly
            appContainer.classList.remove('hidden');
            updateUserDisplay();
            
            // Initialize cart
            await initializeCart();
            
            // Add welcome message
            ChatUI.addWelcomeMessage(true, AuthService.getUserEmail());
        } else {
            // Show auth modal
            AuthUI.show();
        }
        
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
        
        if (!AuthUI.initialize()) {
            throw new Error("Failed to initialize AuthUI");
        }
        
        if (!ChatUI.initialize({
            chatWindow: "chat-window",
            chatInput: "chat-input",
            typingIndicator: "typing-indicator"
        })) {
            throw new Error("Failed to initialize ChatUI");
        }
        
        if (!ProductUI.initialize({
            productContainer: "product-container",
            cartContainer: "cart-container"
        })) {
            throw new Error("Failed to initialize ProductUI");
        }
        
        // Initial search history setup
        const searchSuggestions = document.getElementById('search-suggestions');
        if (searchSuggestions) {
            HistoryService.setupSearchSuggestions(searchSuggestions, chatInput);
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
            
            // Show history when focused
            chatInput.addEventListener("focus", function() {
                const searchSuggestions = document.getElementById('search-suggestions');
                if (searchSuggestions) {
                    HistoryService.renderSearchSuggestions(searchSuggestions);
                    if (chatInput.value.length > 0) {
                        searchSuggestions.style.display = 'block';
                    }
                }
            });
        }
        
        // Hide suggestions when clicking outside
        document.addEventListener("click", function(event) {
            const searchSuggestions = document.getElementById('search-suggestions');
            if (searchSuggestions && !searchSuggestions.contains(event.target) && 
                event.target.id !== 'chat-input') {
                searchSuggestions.style.display = 'none';
            }
        });
        
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
                    
                    // Show/hide suggestions based on input
                    const searchSuggestions = document.getElementById('search-suggestions');
                    if (searchSuggestions) {
                        searchSuggestions.style.display = chatInput.value.length > 0 ? 'block' : 'none';
                    }
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
        
        // Show cart
        if (cartIcon) {
            cartIcon.addEventListener("click", async function() {
                await showCart();
            });
        }
        
        // Logout
        if (logoutBtn) {
            logoutBtn.addEventListener("click", handleLogout);
        }
        
        // Global event listener for product-related clicks
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
            
            // History item click
            if (event.target.classList.contains("history-item") || 
                event.target.parentElement.classList.contains("history-item")) {
                
                const item = event.target.classList.contains("history-item") ? 
                    event.target : event.target.parentElement;
                
                const term = item.getAttribute("data-term");
                if (term) {
                    chatInput.value = term;
                    
                    // Hide suggestions
                    const searchSuggestions = document.getElementById('search-suggestions');
                    if (searchSuggestions) {
                        searchSuggestions.style.display = 'none';
                    }
                }
            }
            
            // Clear history button
            if (event.target.classList.contains("clear-history") || 
                event.target.parentElement.classList.contains("clear-history")) {
                HistoryService.clearHistory();
                
                // Hide suggestions
                const searchSuggestions = document.getElementById('search-suggestions');
                if (searchSuggestions) {
                    searchSuggestions.style.display = 'none';
                }
                
                ToastService.info("Lịch sử tìm kiếm đã được xóa");
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
        
        // Add to search history
        HistoryService.addSearchTerm(userMessage);
        
        // Clear input and hide clear button
        chatInput.value = "";
        if (clearInput) {
            clearInput.style.display = "none";
        }
        
        // Hide suggestions
        const searchSuggestions = document.getElementById('search-suggestions');
        if (searchSuggestions) {
            searchSuggestions.style.display = 'none';
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
                // Show searching state
                const searchingDiv = document.createElement('div');
                searchingDiv.className = 'loading-container';
                searchingDiv.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Đang tìm kiếm "${keyword}"...</div>
                `;
                
                // Add to product container
                ProductUI.productContainer.appendChild(searchingDiv);
                ProductUI.showProductContainer();
                
                // Perform search
                const result = await SearchService.searchProduct(keyword);
                searchResults[keyword] = SearchService.processSearchResults(result);
                
                // Remove searching state
                if (searchingDiv.parentNode) {
                    searchingDiv.parentNode.removeChild(searchingDiv);
                }
            }
            
            // Show search results
            ProductUI.renderProductResponse({ results: searchResults });
            
            // Add friendly message based on results
            let hasProducts = false;
            for (const keyword in searchResults) {
                if (searchResults[keyword].total_count > 0) {
                    hasProducts = true;
                    break;
                }
            }
            
            if (hasProducts) {
                ChatUI.addBotMessageToChat("Đây là kết quả tìm kiếm sản phẩm của bạn. Bạn có thể xem chi tiết hoặc thêm vào giỏ hàng.");
            } else {
                ChatUI.addBotMessageToChat("Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp. Vui lòng thử lại với từ khóa khác.", true);
            }
            
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
            
            // Show loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-container';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Đang tải thông tin sản phẩm...</div>
            `;
            
            // Add to product container
            ProductUI.productContainer.innerHTML = '';
            ProductUI.productContainer.appendChild(loadingDiv);
            ProductUI.showProductContainer();
            
            // Get product details
            const result = await SearchService.getProductDetails(sku);
            
            // Remove loading state
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
            
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
            // Add loading state to button
            const addToCartBtn = document.querySelector(`.add-to-cart-btn[data-sku="${sku}"]`);
            if (addToCartBtn) {
                const originalContent = addToCartBtn.innerHTML;
                addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                addToCartBtn.disabled = true;
                
                // Reset after 5 seconds even if error occurs
                setTimeout(() => {
                    addToCartBtn.innerHTML = originalContent;
                    addToCartBtn.disabled = false;
                }, 5000);
            }
            
            const result = await CartService.addToCart(sku, quantity);
            
            // Reset button state
            if (addToCartBtn) {
                addToCartBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    const originalText = addToCartBtn.classList.contains('full-width') ? 
                        '<i class="fas fa-shopping-cart"></i> Thêm vào giỏ hàng' : 
                        '<i class="fas fa-shopping-cart"></i>';
                    addToCartBtn.innerHTML = originalText;
                    addToCartBtn.disabled = false;
                }, 1000);
            }
            
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
            
            // Add animation to cart icon
            const cartIconEl = document.getElementById('cart-icon');
            if (cartIconEl) {
                cartIconEl.classList.add('cart-animation');
                setTimeout(() => {
                    cartIconEl.classList.remove('cart-animation');
                }, 1000);
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            ToastService.error("Lỗi khi thêm sản phẩm vào giỏ hàng");
        }
    }
    
    async function showCart() {
        try {
            ChatUI.setTypingState(true);
            
            if (!CartService.cartId) {
                await initializeCart();
            }
            
            // Show loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-container';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Đang tải giỏ hàng...</div>
            `;
            
            // Add to cart container
            ProductUI.cartContainer.innerHTML = '<h4>Giỏ hàng của bạn</h4>';
            ProductUI.cartContainer.appendChild(loadingDiv);
            ProductUI.showCartContainer();
            
            const cartData = await CartService.getCart();
            
            // Remove loading state
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
            
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
    
    function updateUserDisplay() {
        const userEmail = document.getElementById('user-email');
        const userInfo = document.getElementById('user-info');
        
        if (userEmail && userInfo) {
            if (AuthService.isLoggedIn) {
                const email = AuthService.getUserEmail();
                userEmail.textContent = email;
                userInfo.style.display = 'flex';
            } else {
                userEmail.textContent = '';
                userInfo.style.display = 'none';
            }
        }
    }
    
    async function handleCheckout() {
        if (!CartService.cartId) {
            ToastService.error("Không có giỏ hàng để thanh toán");
            return;
        }
        
        try {
            if (!AuthService.isLoggedIn) {
                // Show login form
                ToastService.info("Vui lòng đăng nhập để thanh toán");
                
                // Hide app and show auth modal with login tab active
                appContainer.classList.add('hidden');
                AuthUI.show();
                
                // Switch to login tab
                document.querySelector('.auth-tab[data-tab="login"]').click();
                
                return;
            }
            
            // User is logged in, proceed to checkout
            // Show loading button
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) {
                const originalText = checkoutBtn.innerHTML;
                checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                checkoutBtn.disabled = true;
                
                // Reset after 10 seconds even if error occurs
                setTimeout(() => {
                    checkoutBtn.innerHTML = originalText;
                    checkoutBtn.disabled = false;
                }, 10000);
            }
            
            const checkoutUrl = await CartService.getCheckoutUrl();
            
            if (checkoutUrl) {
                // Reset button
                if (checkoutBtn) {
                    checkoutBtn.innerHTML = '<i class="fas fa-check"></i> Đang chuyển hướng...';
                }
                
                // Open checkout in new tab
                window.open(checkoutUrl, '_blank');
                
                // Add message to chat
                ChatUI.addBotMessageToChat("Đang chuyển hướng đến trang thanh toán. Vui lòng hoàn tất thanh toán trên trang web Mega Market.");
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    if (checkoutBtn) {
                        checkoutBtn.innerHTML = 'Thanh toán';
                        checkoutBtn.disabled = false;
                    }
                }, 2000);
            } else {
                ToastService.error("Không thể bắt đầu thanh toán");
                
                // Reset button
                if (checkoutBtn) {
                    checkoutBtn.innerHTML = 'Thanh toán';
                    checkoutBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error("Checkout error:", error);
            ToastService.error("Lỗi khi bắt đầu thanh toán");
            
            // Reset button
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.innerHTML = 'Thanh toán';
                checkoutBtn.disabled = false;
            }
        }
    }
    
    function handleLogout() {
        try {
            // Logout from auth service
            AuthService.logout();
            
            // Reset cart
            CartService.cartId = null;
            CartService.cartItems = [];
            ProductUI.updateCartCount(0);
            
            // Show auth modal
            appContainer.classList.add('hidden');
            AuthUI.show();
            
            // Reset form
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            // Success message
            ToastService.info("Bạn đã đăng xuất thành công");
        } catch (error) {
            console.error("Logout error:", error);
            ToastService.error("Lỗi khi đăng xuất");
        }
    }
});