// =====================================================================
// Product UI
// =====================================================================
const ProductUI = {
    productContainer: null,
    cartContainer: null,
    
    initialize(selectors) {
        this.productContainer = document.getElementById(selectors.productContainer);
        this.cartContainer = document.getElementById(selectors.cartContainer);
        
        if (!this.productContainer || !this.cartContainer) {
            console.error("Failed to initialize ProductUI: Missing elements");
            return false;
        }
        
        return true;
    },
    
    showProductContainer() {
        this.productContainer.classList.add("active");
        this.cartContainer.classList.remove("active");
    },
    
    hideProductContainer() {
        this.productContainer.classList.remove("active");
    },
    
    showCartContainer() {
        this.cartContainer.classList.add("active");
        this.productContainer.classList.remove("active");
    },
    
    hideCartContainer() {
        this.cartContainer.classList.remove("active");
    },
    
    renderProductResponse(data) {
        this.showProductContainer();
        
        let html = '<h4>Kết quả tìm kiếm sản phẩm:</h4>';
        
        // For each keyword
        for (const keyword in data.results) {
            const result = data.results[keyword];
            
            if (result.error) {
                html += `<div class="error-message">Lỗi khi tìm kiếm "${keyword}": ${result.error}</div>`;
                continue;
            }
            
            if (result.total_count === 0) {
                html += `<div class="no-results">Không tìm thấy sản phẩm nào cho "${keyword}"</div>`;
                continue;
            }
            
            html += `
                <div class="product-section">
                    <h5 class="product-section-title">Kết quả cho "${keyword}" (${result.total_count} sản phẩm)</h5>
                    <div class="product-carousel">
            `;
            
            result.products.forEach(product => {
                const priceInfo = product.price_range.maximum_price;
                const finalPrice = priceInfo.final_price;
                const discount = priceInfo.discount;
                
                const formattedFinalPrice = `${Utils.formatPrice(finalPrice.value)} ${finalPrice.currency}`;
                let discountText = '';
                
                if (discount && discount.percent_off > 0) {
                    discountText = `<span class="discount-badge">-${discount.percent_off.toFixed(0)}%</span>`;
                }
                
                html += `
                    <div class="product-card">
                        ${discountText}
                        <div class="product-image-container">
                            <img class="product-thumbnail" src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                        </div>
                        <div class="product-info">
                            <h5 class="product-name">${product.name}</h5>
                            <p class="product-sku">SKU: ${product.sku}</p>
                            <p class="product-price">${formattedFinalPrice}</p>
                            <div class="product-actions">
                                <button class="view-details-btn" data-sku="${product.sku}">Xem chi tiết</button>
                                <button class="add-to-cart-btn" data-sku="${product.sku}">
                                    <i class="fas fa-shopping-cart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        this.productContainer.innerHTML = html;
    },
    
    renderProductDetailView(product) {
        this.showProductContainer();
        
        const priceInfo = product.price_range.maximum_price;
        const finalPrice = priceInfo.final_price;
        const regularPrice = product.price?.regularPrice?.amount;
        const discount = priceInfo.discount;
        
        let discountHTML = '';
        if (discount && discount.percent_off > 0) {
            discountHTML = `
                <div class="product-discount">
                    <span class="original-price">${Utils.formatPrice(regularPrice.value)} ${regularPrice.currency}</span>
                    <span class="discount-percent">-${discount.percent_off.toFixed(0)}%</span>
                </div>
            `;
        }
        
        let galleryHTML = '';
        if (product.media_gallery_entries && product.media_gallery_entries.length > 0) {
            galleryHTML = '<div class="product-gallery">';
            
            product.media_gallery_entries.forEach((media, index) => {
                const activeClass = index === 0 ? 'active' : '';
                galleryHTML += `
                    <div class="gallery-image ${activeClass}" data-index="${index}">
                        <img src="${media.file}" alt="${media.label || product.name}" 
                            onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                    </div>
                `;
            });
            
            galleryHTML += '</div>';
        }
        
        const html = `
            <div class="product-detail">
                <button class="back-btn" id="back-to-search">
                    <i class="fas fa-arrow-left"></i> Quay lại kết quả tìm kiếm
                </button>
                
                <div class="product-detail-content">
                    <div class="product-detail-image">
                        <img src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" 
                            onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                    </div>
                    
                    <div class="product-detail-info">
                        <h3 class="product-detail-name">${product.name}</h3>
                        <p class="product-detail-sku">SKU: ${product.sku}</p>
                        
                        <div class="product-detail-price">
                            <span class="final-price">${Utils.formatPrice(finalPrice.value)} ${finalPrice.currency}</span>
                            ${discountHTML}
                        </div>
                        
                        <div class="product-detail-unit">
                            <span>Đơn vị: ${product.unit_ecom || 'Cái'}</span>
                        </div>
                        
                        <div class="product-detail-actions">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" id="decrease-quantity">-</button>
                                <input type="number" id="product-quantity" value="1" min="1" max="99">
                                <button class="quantity-btn plus" id="increase-quantity">+</button>
                            </div>
                            
                            <button class="add-to-cart-btn full-width" id="add-detail-to-cart" data-sku="${product.sku}">
                                <i class="fas fa-shopping-cart"></i> Thêm vào giỏ hàng
                            </button>
                        </div>
                    </div>
                </div>
                
                ${galleryHTML}
                
                <div class="product-description">
                    <h4>Mô tả sản phẩm</h4>
                    <div class="description-content">
                        ${product.description?.html || 'Chưa có mô tả cho sản phẩm này.'}
                    </div>
                </div>
            </div>
        `;
        
        this.productContainer.innerHTML = html;
        
        // Add event listeners for gallery images
        setTimeout(() => {
            const galleryImages = document.querySelectorAll('.gallery-image');
            const mainImage = document.querySelector('.product-detail-image img');
            
            if (galleryImages.length > 0 && mainImage) {
                galleryImages.forEach(img => {
                    img.addEventListener('click', function() {
                        // Remove active class from all
                        galleryImages.forEach(i => i.classList.remove('active'));
                        
                        // Add active class to clicked image
                        this.classList.add('active');
                        
                        // Get the source of the clicked image
                        const imgSrc = this.querySelector('img').src;
                        
                        // Update main image
                        mainImage.src = imgSrc;
                    });
                });
            }
        }, 100);
    },
    
    renderCartView(cartData) {
        let cartHtml = '<h4>Giỏ hàng của bạn</h4>';
        
        if (!cartData.data || !cartData.data.cart || !cartData.data.cart.items || cartData.data.cart.items.length === 0) {
            cartHtml += '<div class="no-results">Giỏ hàng trống</div>';
            this.cartContainer.innerHTML = cartHtml;
            return;
        }
        
        const items = cartData.data.cart.items;
        const grandTotal = cartData.data.cart.prices?.grand_total || { value: 0, currency: "VND" };
        
        cartHtml += '<div class="cart-items">';
        
        items.forEach(item => {
            const product = item.product;
            const price = item.prices?.price || { value: 0, currency: "VND" };
            const totalPrice = price.value * item.quantity;
            
            cartHtml += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${product.small_image?.url || 'placeholder-image.png'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                    </div>
                    <div class="cart-item-details">
                        <h5 class="cart-item-name">${product.name}</h5>
                        <p class="cart-item-sku">SKU: ${product.sku}</p>
                        <p class="cart-item-price">${Utils.formatPrice(price.value)} ${price.currency}</p>
                        <div class="cart-item-quantity">
                            Số lượng: ${item.quantity}
                        </div>
                    </div>
                    <div class="cart-item-total">
                        ${Utils.formatPrice(totalPrice)} ${price.currency}
                    </div>
                </div>
            `;
        });
        
        cartHtml += '</div>';
        
        cartHtml += `
            <div class="cart-summary">
                <div class="cart-total">
                    <span>Tổng cộng:</span>
                    <span>${Utils.formatPrice(grandTotal.value)} ${grandTotal.currency}</span>
                </div>
                <button class="checkout-btn" id="checkout-btn">
                    ${AuthService.isLoggedIn ? 'Thanh toán' : 'Đăng nhập & Thanh toán'}
                </button>
            </div>
        `;
        
        this.cartContainer.innerHTML = cartHtml;
    },
    
    updateCartCount(count) {
        const cartCounter = document.getElementById('cart-counter');
        if (cartCounter) {
            cartCounter.textContent = count;
            cartCounter.style.display = count > 0 ? "flex" : "none";
        }
    }
};
export default ProductUI;
// =====================================================================