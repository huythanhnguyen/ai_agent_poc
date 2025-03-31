// Tạo file js/history-service.js
const HistoryService = {
    HISTORY_KEY: 'mm_search_history',
    MAX_HISTORY_ITEMS: 10,
    
    getSearchHistory() {
        return Utils.getLocalStorageItem(this.HISTORY_KEY) || [];
    },
    
    addSearchTerm(term) {
        if (!term) return;
        
        const history = this.getSearchHistory();
        
        // Xóa nếu đã tồn tại
        const index = history.indexOf(term);
        if (index !== -1) {
            history.splice(index, 1);
        }
        
        // Thêm vào đầu
        history.unshift(term);
        
        // Giới hạn số lượng
        if (history.length > this.MAX_HISTORY_ITEMS) {
            history.pop();
        }
        
        Utils.setLocalStorageItem(this.HISTORY_KEY, history);
    },
    
    clearHistory() {
        Utils.removeLocalStorageItem(this.HISTORY_KEY);
    },
    
    renderSearchSuggestions(container) {
        const history = this.getSearchHistory();
        
        if (!history.length) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        
        let html = `
            <div class="history-header">
                <h4>Lịch sử tìm kiếm</h4>
                <button class="clear-history">Xóa</button>
            </div>
            <div class="history-items">
        `;
        
        history.forEach(term => {
            html += `<div class="history-item" data-term="${term}">
                <i class="fas fa-history"></i>
                <span>${term}</span>
            </div>`;
        });
        
        html += '</div>';
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
};

export default HistoryService;