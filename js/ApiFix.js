// Cải thiện ApiService để xử lý timeout tốt hơn
// Thêm đoạn code này vào file ApiService.js

// 1. Tăng thời gian timeout và thêm retry logic
const ApiServiceExtension = {
    // Cấu hình timeout và retry
    config: {
        timeoutMs: 20000,    // Tăng timeout lên 20 giây
        maxRetries: 2,       // Số lần thử lại tối đa
        retryDelayMs: 1000   // Thời gian chờ giữa các lần thử lại
    },
    
    // Phương thức request với retry logic
    async requestWithRetry(endpoint, method = 'GET', data = null, token = null) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Nếu đây không phải lần thử đầu tiên, đợi trước khi thử lại
                if (attempt > 0) {
                    console.log(`Thử lại lần ${attempt}/${this.config.maxRetries} cho ${method} ${endpoint}...`);
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                }
                
                const headers = { 
                    'Content-Type': 'application/json',
                    'Store': 'b2c_10010_vi'
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
                
                console.log(`Making ${method} request to ${CONFIG.API_URL}${endpoint} (attempt ${attempt + 1}/${this.config.maxRetries + 1})`);
                
                // Thêm timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
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
                lastError = error;
                
                // Nếu lỗi không phải do timeout hoặc là lần thử cuối cùng, ném lỗi
                if (error.name !== 'AbortError' || attempt === this.config.maxRetries) {
                    break;
                }
                
                console.warn(`Request timeout on attempt ${attempt + 1}, will retry...`);
            }
        }
        
        // Nếu tất cả các lần thử đều thất bại, ném lỗi cuối cùng
        if (lastError.name === 'AbortError') {
            console.error(`Request timeout for ${method} ${endpoint} after ${this.config.maxRetries + 1} attempts`);
            throw new Error(`Request timeout. Máy chủ không phản hồi sau ${this.config.maxRetries + 1} lần thử.`);
        }
        
        console.error(`API Request Error (${method} ${endpoint}):`, lastError);
        
        // Enhanced error với thông tin endpoint
        const enhancedError = new Error(`${lastError.message} (${method} ${endpoint})`);
        enhancedError.originalError = lastError;
        enhancedError.endpoint = endpoint;
        enhancedError.method = method;
        throw enhancedError;
    }
};

// 2. Kiểm tra và mở rộng ApiService nếu nó tồn tại
if (typeof ApiService !== 'undefined') {
    console.log('Mở rộng ApiService với khả năng retry và tăng timeout');
    
    // Lưu phương thức request gốc
    const originalRequest = ApiService.request;
    
    // Thay thế bằng phương thức request mới có retry
    ApiService.request = async function(endpoint, method = 'GET', data = null, token = null) {
        try {
            return await ApiServiceExtension.requestWithRetry(endpoint, method, data, token);
        } catch (error) {
            console.error('Lỗi sau khi thử lại:', error);
            throw error;
        }
    };
    
    // Thêm cấu hình vào ApiService
    ApiService.config = ApiServiceExtension.config;
    
    // Thêm phương thức để kiểm tra kết nối server
    ApiService.checkServerConnection = async function() {
        try {
            // Thử ping một endpoint đơn giản
            await fetch(`${CONFIG.API_URL}/ping`, { 
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5s timeout cho việc kiểm tra
            });
            return true;
        } catch (error) {
            console.warn('Server không phản hồi:', error);
            return false;
        }
    };
} else {
    console.warn('ApiService không tồn tại, không thể mở rộng');
}

// 3. Thêm hàm để kiểm tra và thông báo về vấn đề kết nối server
async function checkAndNotifyServerStatus() {
    if (typeof ApiService === 'undefined' || typeof ApiService.checkServerConnection !== 'function') {
        console.warn('Không thể kiểm tra trạng thái server');
        return;
    }
    
    const isServerConnected = await ApiService.checkServerConnection();
    
    if (!isServerConnected) {
        // Thông báo cho người dùng về vấn đề kết nối
        if (typeof ToastService !== 'undefined' && typeof ToastService.warning === 'function') {
            ToastService.warning(
                "Máy chủ không phản hồi. Một số chức năng có thể không hoạt động đúng.", 
                8000 // hiển thị lâu hơn
            );
        }
        
        // Hiển thị thông báo trong chat nếu có ChatUI
        if (typeof ChatUI !== 'undefined' && typeof ChatUI.addBotMessageToChat === 'function') {
            ChatUI.addBotMessageToChat(
                "⚠️ Không thể kết nối đến máy chủ. Các chức năng đăng nhập và giỏ hàng có thể không hoạt động. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau."
            );
        }
    }
}

// Gọi hàm kiểm tra server khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Đợi một chút để trang tải xong trước khi kiểm tra
    setTimeout(checkAndNotifyServerStatus, 2000);
});