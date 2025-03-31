// Cải thiện AuthService và quy trình đăng nhập
// Thêm vào file AuthService.js hoặc main.js

// 1. Mở rộng AuthService với offline mode và phương thức dự phòng
const AuthServiceEnhancement = {
    // Chuyển sang offline mode khi không thể kết nối server
    enableOfflineMode() {
        console.log('Chuyển sang chế độ offline cho xác thực');
        
        // Lưu trạng thái offline
        localStorage.setItem('auth_offline_mode', 'true');
        
        // Thông báo cho người dùng
        if (typeof ToastService !== 'undefined') {
            ToastService.warning(
                "Đang hoạt động ở chế độ offline. Một số chức năng có thể bị hạn chế.", 
                5000
            );
        }
    },
    
    // Kiểm tra xem có đang ở chế độ offline không
    isOfflineMode() {
        return localStorage.getItem('auth_offline_mode') === 'true';
    },
    
    // Đặt lại chế độ online
    resetOfflineMode() {
        localStorage.removeItem('auth_offline_mode');
    },
    
    // Phương thức đăng nhập nâng cao
    async enhancedLogin(email, password) {
        try {
            // Nếu đang ở chế độ offline
            if (this.isOfflineMode()) {
                // Cho phép đăng nhập offline với thông tin đã lưu
                const savedEmail = localStorage.getItem('last_email');
                if (email === savedEmail) {
                    // Đây chỉ là để demo, trong thực tế bạn cần một cơ chế bảo mật hơn
                    const fakeToken = "offline_" + Math.random().toString(36).substring(2);
                    AuthService.saveAuth(fakeToken, email);
                    return {
                        success: true,
                        offline: true,
                        token: fakeToken
                    };
                } else {
                    return {
                        success: false,
                        offline: true,
                        error: "Không thể xác thực trong chế độ offline"
                    };
                }
            }
            
            // Lưu email để sử dụng offline nếu cần
            localStorage.setItem('last_email', email);
            
            // Thử đăng nhập thông qua API
            return await AuthService.login(email, password);
        } catch (error) {
            console.error("Enhanced login error:", error);
            
            // Nếu lỗi do không kết nối được server
            if (error.message.includes("timeout") || 
                error.message.includes("network") || 
                error.message.includes("failed to fetch")) {
                
                // Chuyển sang chế độ offline
                this.enableOfflineMode();
                
                // Thử đăng nhập offline
                return this.enhancedLogin(email, password);
            }
            
            return { success: false, error: "Đăng nhập thất bại: " + error.message };
        }
    }
};

// 2. Cải thiện AuthService nếu nó tồn tại
if (typeof AuthService !== 'undefined') {
    console.log('Mở rộng AuthService với chế độ offline');
    
    // Thêm các phương thức mới
    AuthService.enableOfflineMode = AuthServiceEnhancement.enableOfflineMode;
    AuthService.isOfflineMode = AuthServiceEnhancement.isOfflineMode;
    AuthService.resetOfflineMode = AuthServiceEnhancement.resetOfflineMode;
    AuthService.enhancedLogin = AuthServiceEnhancement.enhancedLogin;
    
    // Sao lưu phương thức login gốc
    const originalLogin = AuthService.login;
    
    // Ghi đè phương thức login để thêm khả năng phục hồi lỗi
    AuthService.login = async function(email, password) {
        try {
            // Đầu tiên thử đăng nhập với API server
            const result = await originalLogin.call(this, email, password);
            
            // Nếu thành công, đảm bảo tắt chế độ offline
            if (result.success) {
                this.resetOfflineMode();
            }
            
            return result;
        } catch (error) {
            console.error("Login error with original method:", error);
            
            // Nếu lỗi liên quan đến kết nối
            if (error.message.includes("timeout") || 
                error.message.includes("network") || 
                error.message.includes("failed to fetch")) {
                
                console.log("Switching to offline authentication mode");
                
                // Chuyển sang offline và thử offline login
                return await this.enhancedLogin(email, password);
            }
            
            // Trả về lỗi nếu không xử lý được
            return { success: false, error: "Đăng nhập thất bại: " + error.message };
        }
    };
}

// 3. Cải thiện quy trình xử lý đăng nhập
async function improvedHandleLogin() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const checkoutToggle = document.getElementById("checkout-after-login");
    
    if (!emailInput || !passwordInput) {
        if (typeof ToastService !== 'undefined') {
            ToastService.error("Thiếu trường thông tin đăng nhập");
        }
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const shouldCheckout = checkoutToggle && checkoutToggle.value === "true";
    
    if (!email || !password) {
        if (typeof ToastService !== 'undefined') {
            ToastService.error("Vui lòng nhập email và mật khẩu");
        }
        return;
    }
    
    // Hiển thị thông báo đang xử lý
    if (typeof ToastService !== 'undefined') {
        ToastService.info("Đang đăng nhập...");
    }
    
    try {
        // Sử dụng phương thức đăng nhập nâng cao nếu có
        const loginMethod = (typeof AuthService.enhancedLogin === 'function') 
            ? AuthService.enhancedLogin 
            : AuthService.login;
        
        const result = await loginMethod.call(AuthService, email, password);
        
        if (result.success) {
            // Thông báo thành công
            if (typeof ToastService !== 'undefined') {
                ToastService.success(result.offline 
                    ? "Đăng nhập thành công (chế độ offline)" 
                    : "Đăng nhập thành công");
            }
            
            // Cập nhật hiển thị người dùng
            if (typeof updateUserDisplay === 'function') {
                updateUserDisplay();
            }
            
            // Ẩn form đăng nhập
            const loginContainer = document.getElementById("login-container");
            if (loginContainer && loginContainer.classList.contains("active")) {
                loginContainer.classList.remove("active");
            }
            
            // Tạo giỏ hàng xác thực
            if (!result.offline && typeof CartService !== 'undefined') {
                try {
                    await CartService.createAuthenticatedCart(result.token);
                    
                    // Nếu có giỏ hàng khách, chuyển các mục
                    if (CartService.guestCartId && CartService.guestCartId !== CartService.cartId) {
                        await CartService.transferCartItems(CartService.guestCartId, CartService.cartId);
                    }
                    
                    // Cập nhật hiển thị giỏ hàng
                    if (typeof updateCartDisplay === 'function') {
                        await updateCartDisplay();
                    }
                } catch (cartError) {
                    console.error("Lỗi khi tạo giỏ hàng sau đăng nhập:", cartError);
                    
                    if (typeof ToastService !== 'undefined') {
                        ToastService.warning("Đăng nhập thành công nhưng không thể khởi tạo giỏ hàng");
                    }
                }
            }
            
            // Tiếp tục thanh toán nếu được yêu cầu
            if (shouldCheckout && typeof handleCheckout === 'function') {
                await handleCheckout();
            }
        } else {
            // Thông báo lỗi
            if (typeof ToastService !== 'undefined') {
                ToastService.error(result.error || "Đăng nhập thất bại");
            }
        }
    } catch (error) {
        console.error("Lỗi xử lý đăng nhập:", error);
        
        if (typeof ToastService !== 'undefined') {
            ToastService.error("Lỗi hệ thống: " + error.message);
        }
    }
}

// Thay thế hàm handleLogin hiện tại hoặc gắn vào form đăng nhập
if (typeof handleLogin !== 'undefined') {
    console.log('Thay thế handleLogin với phiên bản cải tiến');
    window.handleLogin = improvedHandleLogin;
}

// Gắn hàm cải tiến vào form đăng nhập
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Gắn hàm đăng nhập cải tiến vào form');
        loginForm.removeEventListener('submit', handleLogin);
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            improvedHandleLogin();
        });
    }
});