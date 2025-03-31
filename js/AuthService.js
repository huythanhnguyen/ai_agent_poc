// AuthService.js
import CONFIG from './Config.js';
import Utils from './Utils.js';
import ApiService from './ApiService.js';

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
    },
    
    autoLogin() {
        // Check if user is already logged in from a previous session
        return this.isLoggedIn;
    }
};

export default AuthService;