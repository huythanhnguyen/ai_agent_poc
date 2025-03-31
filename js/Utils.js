// utils.js
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

export default Utils;