// ApiService.js
import CONFIG from './config.js';

const ApiService = {
    async request(endpoint, method = 'GET', data = null, token = null) {
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
        
        try {
            console.log(`Making ${method} request to ${CONFIG.API_URL}${endpoint}`);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
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
            if (error.name === 'AbortError') {
                console.error(`Request timeout for ${method} ${endpoint}`);
                throw new Error(`Request timeout. The server took too long to respond.`);
            }
            
            console.error(`API Request Error (${method} ${endpoint}):`, error);
            
            // Enhanced error with endpoint information
            const enhancedError = new Error(`${error.message} (${method} ${endpoint})`);
            enhancedError.originalError = error;
            enhancedError.endpoint = endpoint;
            enhancedError.method = method;
            throw enhancedError;
        }
    },
    
    // Direct GraphQL API call to ecommerce platform
    async graphqlRequest(query, variables = null, token = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Store': 'b2c_10010_vi'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const payload = {
            query: query,
            variables: variables || {}
        };
        
        try {
            console.log('Making GraphQL request to Ecommerce platform');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(`${CONFIG.ECOMMERCE_URL}/graphql`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error details");
                throw new Error(`GraphQL API error: ${response.status} - ${errorText}`);
            }
            
            const jsonData = await response.json();
            return jsonData;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('GraphQL request timeout');
                throw new Error(`GraphQL request timeout. The server took too long to respond.`);
            }
            
            console.error('GraphQL Request Error:', error);
            throw error;
        }
    },
    
    async analyzeIntent(userMessage) {
        try {
            const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
            const requestBody = {
                contents: [{ parts: [{ text: `Người dùng muốn tìm kiếm sản phẩm. Yêu cầu của người dùng là: "${userMessage}". Hãy trích xuất **tất cả** các từ khóa sản phẩm mà người dùng muốn tìm và trả về một mảng JSON dưới dạng {\"keywords\":[\"từ khóa 1\", \"từ khóa 2\", ...]}. Nếu không tìm thấy từ khóa nào, hãy trả về mảng rỗng.` }] }]
            };

            const response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const jsonResponse = await response.json();
            const textResponse = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

            const cleanedJson = textResponse.replace(/`json|`/g, "").trim();
            try {
                const parsedResponse = JSON.parse(cleanedJson);
                return parsedResponse.keywords || [];
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                return [];
            }
        } catch (error) {
            console.error("Intent analysis error:", error);
            return [];
        }
    }
};

export default ApiService;