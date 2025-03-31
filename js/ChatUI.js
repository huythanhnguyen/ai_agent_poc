// =====================================================================
// Chat UI
// =====================================================================
const ChatUI = {
    chatWindow: null,
    chatInput: null,
    typingIndicator: null,
    isTyping: false,
    
    initialize(selectors) {
        this.chatWindow = document.getElementById(selectors.chatWindow);
        this.chatInput = document.getElementById(selectors.chatInput);
        this.typingIndicator = document.getElementById(selectors.typingIndicator);
        
        if (!this.chatWindow || !this.chatInput || !this.typingIndicator) {
            console.error("Failed to initialize ChatUI: Missing elements");
            return false;
        }
        return true;
    },
    
    setTypingState(typing) {
        this.isTyping = typing;
        if (typing) {
            this.typingIndicator.classList.add("active");
        } else {
            this.typingIndicator.classList.remove("active");
        }
    },
    
    addUserMessageToChat(text) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("user-message");
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">${text}</div>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
        
        this.chatWindow.appendChild(messageElement);
        Utils.scrollToBottom(this.chatWindow);
    },
    
    addBotMessageToChat(text, includeQuickActions = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("bot-message");
        
        let quickActionsHTML = '';
        if (includeQuickActions) {
            quickActionsHTML = `
                <div class="quick-actions">
                    <button class="quick-action-btn" data-action="Tìm rau củ quả">Rau củ quả</button>
                    <button class="quick-action-btn" data-action="Tìm dầu ăn, nước chấm, gia vị">Dầu ăn, gia vị</button>
                    <button class="quick-action-btn" data-action="Tìm đồ hộp, đồ khô">Đồ hộp, đồ khô</button>
                </div>
            `;
        }
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="mega-market-logo.png" alt="Mega Market" class="bot-logo" onerror="this.src='https://via.placeholder.com/36x36?text=MM';">
            </div>
            <div class="message-content">
                <div class="message-text">${text}</div>
                ${quickActionsHTML}
            </div>
        `;
        
        this.chatWindow.appendChild(messageElement);
        Utils.scrollToBottom(this.chatWindow);
        
        return messageElement;
    },
    
    addWelcomeMessage(isLoggedIn = false, userEmail = '') {
        let welcomeText = '';
        
        if (isLoggedIn && userEmail) {
            welcomeText = `Xin chào ${userEmail}! Tôi là trợ lý tìm kiếm của Mega Market. Bạn muốn tìm sản phẩm gì hôm nay?`;
        } else {
            welcomeText = 'Xin chào! Tôi là trợ lý tìm kiếm của Mega Market. Bạn muốn tìm sản phẩm gì hôm nay?';
        }
        
        this.addBotMessageToChat(welcomeText, true);
    },
    
    clearChatHistory() {
        // Clear the chat window completely
        this.chatWindow.innerHTML = '';
        
        // Add welcome message again
        const isLoggedIn = AuthService.isLoggedIn;
        const userEmail = isLoggedIn ? AuthService.getUserEmail() : '';
        this.addWelcomeMessage(isLoggedIn, userEmail);
    }
};
export default ChatUI;
// =====================================================================
// =====================================================================