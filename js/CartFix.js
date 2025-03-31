(function() {
    // Đảm bảo CONFIG tồn tại
    if (typeof window.CONFIG === 'undefined') {
        console.warn('CONFIG không tồn tại, tạo CONFIG mặc định');
        window.CONFIG = {
            API_URL: "http://192.168.10.147:5000",
            API_TIMEOUT: 20000 // 20 seconds
        };
    }

    // Hàm kiểm tra đối tượng có tồn tại không
    function ensureObjectExists(objectName, createIfMissing = true) {
        if (typeof window[objectName] === 'undefined' && createIfMissing) {
            console.warn(`${objectName} không tồn tại, tạo mới ${objectName}`);
            window[objectName] = {};
        }
        return typeof window[objectName] !== 'undefined';
    }
    
    // Đảm bảo các dịch vụ cần thiết tồn tại
    ensureObjectExists('ApiService');
    ensureObjectExists('AuthService');
    ensureObjectExists('ToastService', true);
    
    // Nếu ToastService không có các phương thức thông báo
    if (typeof window.ToastService.error !== 'function') {
        window.ToastService = {
            error: function(message) { console.error('ERROR: ' + message); },
            warning: function(message) { console.warn('WARNING: ' + message); },
            info: function(message) { console.log('INFO: ' + message); },
            success: function(message) { console.log('SUCCESS: ' + message); }
        };
    }
    
    // Tạo hoặc mở rộng CartService
    if (!ensureObjectExists('CartService', true)) {
        console.error('Không thể tạo CartService');
        return;
    }
    
    // Đảm bảo các thuộc tính cơ bản
    window.CartService._cartId = window.CartService._cartId || null;
    window.CartService._guestCartId = window.CartService._guestCartId || null;
    window.CartService._cartItems = window.CartService._cartItems || [];

    // Đảm bảo các phương thức cần thiết
    if (typeof window.CartService.addToCart !== 'function') {
        console.log('Định nghĩa phương thức addToCart cho CartService');
        
        window.CartService.addToCart = async function(sku, quantity = 1) {
            try {
                console.log(`Thêm sản phẩm ${sku} với số lượng ${quantity} vào giỏ hàng`);
                
                // Nếu chưa có cartId, tạo một cart mới
                if (!this._cartId) {
                    console.log('Chưa có cartId, tạo giỏ hàng mới');
                    
                    if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn) {
                        console.log('Người dùng đã đăng nhập, tạo giỏ hàng xác thực');
                        const token = AuthService.getToken();
                        await this.createAuthenticatedCart(token);
                    } else {
                        console.log('Người dùng chưa đăng nhập, tạo giỏ hàng khách');
                        await this.createGuestCart();
                    }
                    
                    if (!this._cartId) {
                        console.error('Không thể tạo giỏ hàng');
                        return { error: "Không thể tạo giỏ hàng" };
                    }
                }
                
                console.log(`Sử dụng cartId: ${this._cartId} để thêm sản phẩm`);
                
                // Token xác thực nếu đã đăng nhập
                const token = (typeof AuthService !== 'undefined' && AuthService.isLoggedIn) 
                    ? AuthService.getToken() 
                    : null;
                
                // Chuẩn bị dữ liệu request
                const requestData = {
                    cart_id: this._cartId,
                    sku: sku,
                    quantity: quantity
                };
                
                console.log('Dữ liệu gửi đi:', requestData);
                
                // Gọi API để thêm sản phẩm
                const result = await ApiService.request('/cart/add', 'POST', requestData, token);
                console.log('Kết quả thêm vào giỏ hàng:', result);
                
                // Cập nhật thông tin giỏ hàng
                await this.getCart();
                
                return result;
            } catch (error) {
                console.error("Lỗi khi thêm vào giỏ hàng:", error);
                return { error: "Lỗi khi thêm vào giỏ hàng: " + error.message };
            }
        };
    }
    
    if (typeof window.CartService.createGuestCart !== 'function') {
        console.log('Định nghĩa phương thức createGuestCart cho CartService');
        
        window.CartService.createGuestCart = async function() {
            try {
                console.log('Đang tạo giỏ hàng cho khách...');
                
                const result = await ApiService.request('/cart/create', 'POST', {});
                if (result && result.cart_id) {
                    this._guestCartId = result.cart_id;
                    this._cartId = result.cart_id;
                    console.log('Đã tạo giỏ hàng cho khách: ' + this._cartId);
                    return result.cart_id;
                }
                
                console.error('Không thể tạo giỏ hàng cho khách, kết quả:', result);
                return null;
            } catch (error) {
                console.error("Lỗi khi tạo giỏ hàng cho khách:", error);
                return null;
            }
        };
    }
    
    if (typeof window.CartService.createAuthenticatedCart !== 'function') {
        console.log('Định nghĩa phương thức createAuthenticatedCart cho CartService');
        
        window.CartService.createAuthenticatedCart = async function(token) {
            try {
                console.log('Đang tạo giỏ hàng cho người dùng đã đăng nhập...');
                
                const result = await ApiService.request('/cart/create', 'POST', { 
                    customer_token: token 
                }, token);
                
                if (result && result.cart_id) {
                    this._cartId = result.cart_id;
                    console.log('Đã tạo giỏ hàng cho người dùng đã đăng nhập: ' + this._cartId);
                    return result.cart_id;
                }
                
                console.error('Không thể tạo giỏ hàng cho người dùng đã đăng nhập, kết quả:', result);
                return null;
            } catch (error) {
                console.error("Lỗi khi tạo giỏ hàng xác thực:", error);
                return null;
            }
        };
    }
    
    if (typeof window.CartService.getCart !== 'function') {
        console.log('Định nghĩa phương thức getCart cho CartService');
        
        window.CartService.getCart = async function(specificCartId = null) {
            const cartId = specificCartId || this._cartId;
            if (!cartId) {
                console.error('Không có cartId để lấy thông tin giỏ hàng');
                return { error: "Không có ID giỏ hàng" };
            }
            
            try {
                console.log(`Đang lấy thông tin giỏ hàng với ID: ${cartId}`);
                
                const token = (typeof AuthService !== 'undefined' && AuthService.isLoggedIn) 
                    ? AuthService.getToken() 
                    : null;
                
                const result = await ApiService.request(`/cart/${cartId}`, 'GET', null, token);
                
                console.log('Kết quả lấy thông tin giỏ hàng:', result);
                
                if (result && result.data && result.data.cart) {
                    this._cartItems = result.data.cart.items || [];
                    console.log(`Giỏ hàng có ${this._cartItems.length} sản phẩm`);
                }
                
                return result;
            } catch (error) {
                console.error("Lỗi khi lấy thông tin giỏ hàng:", error);
                return { error: "Lỗi khi lấy thông tin giỏ hàng: " + error.message };
            }
        };
    }
    
    if (typeof window.CartService.itemCount !== 'function' && 
        !Object.getOwnPropertyDescriptor(window.CartService, 'itemCount')) {
        
        console.log('Định nghĩa thuộc tính itemCount cho CartService');
        
        Object.defineProperty(window.CartService, 'itemCount', {
            get: function() {
                return this._cartItems.reduce((total, item) => total + item.quantity, 0);
            }
        });
    }
    
    // Định nghĩa hoặc sửa lại hàm addProductToCart để sử dụng CartService
    window.addProductToCart = async function(sku, quantity) {
        try {
            console.log(`Thực hiện thêm sản phẩm ${sku} với số lượng ${quantity} vào giỏ hàng`);
            
            // Đảm bảo CartService và phương thức addToCart tồn tại
            if (typeof window.CartService === 'undefined') {
                console.error("CartService không tồn tại");
                ToastService.error("Lỗi hệ thống: CartService không tồn tại");
                return;
            }
            
            if (typeof window.CartService.addToCart !== 'function') {
                console.error("Phương thức addToCart không tồn tại");
                ToastService.error("Lỗi hệ thống: Phương thức addToCart không tồn tại");
                return;
            }
            
            // Thêm sản phẩm vào giỏ hàng
            const result = await window.CartService.addToCart(sku, quantity);
            
            // Kiểm tra kết quả
            if (result && result.error) {
                console.error("Lỗi khi thêm vào giỏ hàng:", result.error);
                ToastService.error(result.error);
                return;
            }
            
            if (result && result.data && result.data.addProductsToCart && 
                result.data.addProductsToCart.user_errors && 
                result.data.addProductsToCart.user_errors.length > 0) {
                
                const errorMsg = result.data.addProductsToCart.user_errors[0].message;
                console.error("Lỗi trả về từ API khi thêm vào giỏ hàng:", errorMsg);
                ToastService.error(errorMsg);
                return;
            }
            
            // Cập nhật hiển thị giỏ hàng
            if (typeof window.updateCartDisplay === 'function') {
                await window.updateCartDisplay();
            } else {
                console.warn("Hàm updateCartDisplay không tồn tại");
                
                // Cập nhật số lượng trên biểu tượng giỏ hàng
                const cartCounter = document.getElementById('cart-counter');
                if (cartCounter && typeof window.CartService.itemCount !== 'undefined') {
                    cartCounter.textContent = window.CartService.itemCount;
                    cartCounter.style.display = window.CartService.itemCount > 0 ? "flex" : "none";
                }
            }
            
            ToastService.success("Sản phẩm đã được thêm vào giỏ hàng");
        } catch (error) {
            console.error("Lỗi không xác định khi thêm vào giỏ hàng:", error);
            ToastService.error("Lỗi khi thêm sản phẩm vào giỏ hàng");
        }
    };
    
    // Thông báo khởi tạo thành công
    console.log('CartService đã được cải thiện và sẵn sàng sử dụng');
})();