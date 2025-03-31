// =====================================================================
// Auth UI
// =====================================================================
import ToastService from './ToastService.js';
import AuthService from './AuthService.js';
import CartService from './CartService.js';
import ChatUI from './ChatUI.js';
const AuthUI = {
    authModal: null,
    loginForm: null,
    guestBtn: null,
    
    initialize() {
        this.authModal = document.getElementById('auth-modal');
        this.loginForm = document.getElementById('login-form');
        this.guestBtn = document.getElementById('continue-as-guest');
        
        if (!this.authModal || !this.loginForm || !this.guestBtn) {
            console.error("Failed to initialize AuthUI: Missing elements");
            return false;
        }
        
        // Set up tab switching
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Get tab id and activate corresponding content
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
        
        // Set up login form submission
        this.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            if (!emailInput || !passwordInput) {
                ToastService.error("Missing form fields");
                return;
            }
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!email || !password) {
                ToastService.error("Vui lòng nhập email và mật khẩu");
                return;
            }
            
            try {
                // Show loading
                const submitBtn = this.loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
                
                // Attempt login
                const result = await AuthService.login(email, password);
                
                if (result.success) {
                    // Hide auth modal and show app
                    this.hide();
                    document.getElementById('app-container').classList.remove('hidden');
                    
                    // Update user display in header
                    updateUserDisplay();
                    
                    // Create authenticated cart
                    await CartService.createAuthenticatedCart(result.token);
                    
                    // Initialize chat
                    ChatUI.clearChatHistory();
                    ChatUI.addWelcomeMessage(true, email);
                    
                    // Success message
                    ToastService.success("Đăng nhập thành công");
                } else {
                    ToastService.error(result.error || "Đăng nhập thất bại");
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Đăng nhập';
                }
            } catch (error) {
                console.error("Login error:", error);
                ToastService.error("Lỗi khi đăng nhập");
                
                // Reset button
                const submitBtn = this.loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Đăng nhập';
            }
        });
        
        // Set up guest mode button
        this.guestBtn.addEventListener('click', async () => {
            try {
                // Hide auth modal and show app
                this.hide();
                document.getElementById('app-container').classList.remove('hidden');
                
                // Create guest cart
                await CartService.createGuestCart();
                
                // Initialize chat
                ChatUI.clearChatHistory();
                ChatUI.addWelcomeMessage(false);
                
                // Info message
                ToastService.info("Tiếp tục với tư cách khách. Một số tính năng sẽ bị hạn chế.");
            } catch (error) {
                console.error("Guest mode error:", error);
                ToastService.error("Lỗi khi tiếp tục với tư cách khách");
            }
        });
        
        return true;
    },
    
    show() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');
        }
    },
    
    hide() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
        }
    }
};
export default AuthUI;
// =====================================================================