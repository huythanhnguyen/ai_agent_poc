// Cải thiện ApiService để xử lý timeout tốt hơn
// Thêm đoạn code này vào file ApiService.js hoặc cuối file main.js

(function() {
    // Đảm bảo các biến cần thiết tồn tại
    if (typeof window.CONFIG === 'undefined') {
        console.warn('CONFIG không tồn tại, tạo CONFIG mặc định');
        window.CONFIG = {
            API_URL: "http://192.168.10.147:5000",
            API_TIMEOUT: 20000 // 20 seconds
        };
    }
    
    // 1. Tạo hoặc mở rộng API Service
    if (typeof window.ApiService === 'undefined') {
        console.log('ApiService chưa tồn tại, tạo mới ApiService');
        window.ApiService = {
            // Cấu hình timeout và retry
            config: {
                timeoutMs: 20000,    // Tăng timeout lên 20 giây
                maxRetries: 2,       // Số lần thử lại tối đa
                retryDelayMs: 1000   // Thời gian chờ giữa các lần thử lại
            },
            
            // Phương thức API request cơ bản
            async request(endpoint, method = 'GET', data = null, token = null) {
                return await this.requestWithRetry(endpoint, method, data, token);
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
            },
            
            // Phương thức để kiểm tra kết nối server
            async checkServerConnection() {
                try {
                    // Thử ping một endpoint đơn giản
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    
                    await fetch(`${CONFIG.API_URL}/ping`, { 
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    return true;
                } catch (error) {
                    console.warn('Server không phản hồi:', error);
                    return false;
                }
            }
        };
    } else {
        console.log('Mở rộng ApiService hiện có với khả năng retry và timeout nâng cao');
        
        // Cấu hình
        ApiService.config = {
            timeoutMs: 20000,    // 20 seconds
            maxRetries: 2,
            retryDelayMs: 1000
        };
        
        // Lưu phương thức request gốc nếu tồn tại
        if (typeof ApiService.request === 'function') {
            const originalRequest = ApiService.request;
            
            // Ghi đè với phương thức cải tiến
            ApiService.requestWithRetry = async function(endpoint, method = 'GET', data = null, token = null) {
                let lastError;
                
                for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
                    try {
                        // Nếu đây không phải lần thử đầu tiên, đợi trước khi thử lại
                        if (attempt > 0) {
                            console.log(`Thử lại lần ${attempt}/${this.config.maxRetries} cho ${method} ${endpoint}...`);
                            await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                        }
                        
                        // Gọi phương thức gốc
                        return await originalRequest.call(this, endpoint, method, data, token);
                    } catch (error) {
                        lastError = error;
                        
                        // Nếu lỗi không phải do timeout hoặc là lần thử cuối cùng, ném lỗi
                        if (error.name !== 'AbortError' || attempt === this.config.maxRetries) {
                            break;
                        }
                        
                        console.warn(`Request timeout on attempt ${attempt + 1}, will retry...`);
                    }
                }
                
                // Ném lỗi sau khi thử lại
                console.error(`API Request Error (${method} ${endpoint}) after retries:`, lastError);
                throw lastError;
            };
            
            // Ghi đè phương thức request
            ApiService.request = async function(endpoint, method = 'GET', data = null, token = null) {
                return await this.requestWithRetry(endpoint, method, data, token);
            };
        }
        
        // Thêm phương thức kiểm tra kết nối nếu chưa có
        if (typeof ApiService.checkServerConnection !== 'function') {
            ApiService.checkServerConnection = async function() {
                try {
                    // Thử ping một endpoint đơn giản
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    
                    await fetch(`${CONFIG.API_URL}/ping`, { 
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    return true;
                } catch (error) {
                    console.warn('Server không phản hồi:', error);
                    return false;
                }
            };
        }
    }
    
    // 2. Tạo hoặc sử dụng ToastService
    if (typeof window.ToastService === 'undefined') {
        console.warn('ToastService không tồn tại, tạo ToastService đơn giản');
        window.ToastService = {
            info: function(message) { console.log('INFO: ' + message); },
            warning: function(message) { console.warn('WARNING: ' + message); },
            error: function(message) { console.error('ERROR: ' + message); },
            success: function(message) { console.log('SUCCESS: ' + message); }
        };
    }
    
    // 3. Hàm kiểm tra server và hiển thị trạng thái
    async function checkAndNotifyServerStatus() {
        try {
            if (typeof window.ApiService === 'undefined') {
                console.warn('ApiService không tồn tại, không thể kiểm tra server');
                return;
            }
            
            if (typeof window.ApiService.checkServerConnection !== 'function') {
                console.warn('Phương thức checkServerConnection không tồn tại');
                return;
            }
            
            console.log('Đang kiểm tra kết nối đến server...');
            const isServerConnected = await window.ApiService.checkServerConnection();
            
            if (!isServerConnected) {
                console.warn('Kết nối server thất bại');
                
                // Thông báo cho người dùng
                if (typeof window.ToastService !== 'undefined') {
                    window.ToastService.warning(
                        "Máy chủ không phản hồi. Một số chức năng có thể không hoạt động.", 
                        8000
                    );
                }
                
                // Hiển thị trong chat nếu có ChatUI
                if (typeof window.ChatUI !== 'undefined' && 
                    typeof window.ChatUI.addBotMessageToChat === 'function') {
                    window.ChatUI.addBotMessageToChat(
                        "⚠️ Không thể kết nối đến máy chủ. Các chức năng đăng nhập và giỏ hàng có thể không hoạt động. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau."
                    );
                }
            } else {
                console.log('Kết nối server thành công');
            }
        } catch (error) {
            console.error('Lỗi kiểm tra server:', error);
        }
    }
    
    // 4. Thiết lập kiểm tra server sau khi trang tải xong
    // Sử dụng setTimeout để đảm bảo các dịch vụ khác được khởi tạo trước
    window.addEventListener('load', function() {
        console.log('Trang đã tải, chuẩn bị kiểm tra server...');
        setTimeout(checkAndNotifyServerStatus, 2000);
    });
})();