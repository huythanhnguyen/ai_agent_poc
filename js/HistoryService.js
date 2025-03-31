// js/HistoryService.js
const HistoryService = {
    HISTORY_KEY: 'mm_search_history',
    MAX_HISTORY_ITEMS: 10,
    
    getSearchHistory() {
        try {
            const history = localStorage.getItem(this.HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error("Error reading search history:", error);
            return [];
        }
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
        
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },
    
    clearHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
    },
    
    renderSearchSuggestions(container) {
        if (!container) return;
        
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
    },
    
    setupSearchSuggestions(container, inputElement) {
        if (!container || !inputElement) return;
        
        // Thiết lập event listener cho history items
        container.addEventListener('click', (event) => {
            if (event.target.classList.contains('history-item') || 
                event.target.parentElement.classList.contains('history-item')) {
                
                const item = event.target.classList.contains('history-item') ? 
                    event.target : event.target.parentElement;
                
                const term = item.getAttribute('data-term');
                if (term && inputElement) {
                    inputElement.value = term;
                    container.style.display = 'none';
                }
            }
            
            // Xử lý nút xóa lịch sử
            if (event.target.classList.contains('clear-history')) {
                this.clearHistory();
                container.style.display = 'none';
            }
        });
        
        // Hiển thị lịch sử ban đầu
        this.renderSearchSuggestions(container);
        
        return true;
    }
};

export default HistoryService;