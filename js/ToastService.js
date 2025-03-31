// =====================================================================
// Toast Notification System
// =====================================================================
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
export default ToastService;
// toast.js
// =====================================================================