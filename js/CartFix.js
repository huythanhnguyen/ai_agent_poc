// Kiểm tra và đảm bảo CartService được khởi tạo đúng cách
// Thêm đoạn code này vào đầu file main.js hoặc trước khi gọi CartService

// 1. Đảm bảo CartService đã được định nghĩa
if (typeof CartService === 'undefined') {
    // Nếu CartService chưa tồn tại, tạo một đối tượng tạm thời
    console.warn('CartService chưa được định nghĩa, tạo CartService tạm thời');
    window.CartService = {
        _cartId: null,
        _cartItems: [],
        
        // Định nghĩa phương thức addToCart
        async addToCart(sku, quantity = 1) {
            try {
                console.log(`Thêm sản phẩm ${sku} với số lượng ${quantity} vào giỏ hàng`);
                
                // Nếu chưa có cartId, tạo một cart mới
                if (!this._cartId) {
                    if (AuthService && AuthService.isLoggedIn) {
                        const token = AuthService.getToken();
                        await this.createAuthenticatedCart(token);
                    } else {
                        await this.createGuestCart();
                    }
                    
                    if (!this._cartId) {
                        return { error: "Không thể tạo giỏ hàng" };
                    }
                }
                
                // Gọi API để thêm sản phẩm vào giỏ hàng
                const token = AuthService && AuthService.isLoggedIn ? AuthService.getToken() : null;
                
                const result = await ApiService.request('/cart/add', 'POST', {
                    cart_id: this._cartId,
                    sku: sku,
                    quantity: quantity
                }, token);
                
                // Cập nhật thông tin giỏ hàng
                await this.getCart();
                return result;
            } catch (error) {
                console.error("Error adding to cart:", error);
                return { error: "Lỗi khi thêm vào giỏ hàng: " + error.message };
            }
        },
        
        // Thêm các phương thức cần thiết khác
        async createGuestCart() {
            try {
                const result = await ApiService.request('/cart/create', 'POST', {});
                if (result && result.cart_id) {
                    this._cartId = result.cart_id;
                    console.log('Đã tạo giỏ hàng cho khách: ' + this._cartId);
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
                const result = await ApiService.request('/cart/create', 'POST', { 
                    customer_token: token 
                }, token);
                
                if (result && result.cart_id) {
                    this._cartId = result.cart_id;
                    console.log('Đã tạo giỏ hàng cho người dùng đã đăng nhập: ' + this._cartId);
                    return result.cart_id;
                }
                return null;
            } catch (error) {
                console.error("Error creating authenticated cart:", error);
                return null;
            }
        },
        
        async getCart(specificCartId = null) {
            const cartId = specificCartId || this._cartId;
            if (!cartId) return { error: "Không có ID giỏ hàng" };
            
            try {
                const token = AuthService && AuthService.isLoggedIn ? AuthService.getToken() : null;
                const result = await ApiService.request(`/cart/${cartId}`, 'GET', null, token);
                
                if (result && result.data && result.data.cart) {
                    this._cartItems = result.data.cart.items || [];
                }
                
                return result;
            } catch (error) {
                console.error("Error getting cart:", error);
                return { error: "Lỗi khi lấy thông tin giỏ hàng: " + error.message };
            }
        },
        
        get itemCount() {
            return this._cartItems ? this._cartItems.reduce((total, item) => total + item.quantity, 0) : 0;
        }
    };
} else if (typeof CartService.addToCart !== 'function') {
    // Nếu CartService đã tồn tại nhưng không có phương thức addToCart
    console.warn('CartService tồn tại nhưng không có phương thức addToCart, thêm phương thức');
    
    CartService.addToCart = async function(sku, quantity = 1) {
        try {
            console.log(`Thêm sản phẩm ${sku} với số lượng ${quantity} vào giỏ hàng`);
            
            // Nếu chưa có cartId, tạo một cart mới
            if (!this._cartId) {
                if (AuthService && AuthService.isLoggedIn) {
                    const token = AuthService.getToken();
                    await this.createAuthenticatedCart(token);
                } else {
                    await this.createGuestCart();
                }
                
                if (!this._cartId) {
                    return { error: "Không thể tạo giỏ hàng" };
                }
            }
            
            // Gọi API để thêm sản phẩm vào giỏ hàng
            const token = AuthService && AuthService.isLoggedIn ? AuthService.getToken() : null;
            
            const result = await ApiService.request('/cart/add', 'POST', {
                cart_id: this._cartId,
                sku: sku,
                quantity: quantity
            }, token);
            
            // Cập nhật thông tin giỏ hàng
            await this.getCart();
            return result;
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { error: "Lỗi khi thêm vào giỏ hàng: " + error.message };
        }
    };
}

// 2. Sửa đổi hàm addProductToCart để kiểm tra và xử lý lỗi
async function addProductToCart(sku, quantity) {
    try {
        // Đảm bảo CartService và phương thức addToCart tồn tại
        if (!CartService || typeof CartService.addToCart !== 'function') {
            console.error("CartService hoặc phương thức addToCart không tồn tại");
            ToastService.error("Lỗi hệ thống: Không thể thêm sản phẩm vào giỏ hàng");
            return;
        }
        
        const result = await CartService.addToCart(sku, quantity);
        
        if (result && result.error) {
            ToastService.error(result.error);
            return;
        }
        
        if (result && result.data && result.data.addProductsToCart && 
            result.data.addProductsToCart.user_errors && 
            result.data.addProductsToCart.user_errors.length > 0) {
            const errorMsg = result.data.addProductsToCart.user_errors[0].message;
            ToastService.error(errorMsg);
            return;
        }
        
        // Cập nhật hiển thị giỏ hàng
        await updateCartDisplay();
        ToastService.success("Sản phẩm đã được thêm vào giỏ hàng");
    } catch (error) {
        console.error("Error adding to cart:", error);
        ToastService.error("Lỗi khi thêm sản phẩm vào giỏ hàng");
    }
}