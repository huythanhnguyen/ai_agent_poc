// =====================================================================
// Search Service
// =====================================================================
const SearchService = {
    async searchProduct(keyword) {
        try {
            const result = await ApiService.request('/search', 'POST', { keyword });
            return result;
        } catch (error) {
            console.error(`Search error for "${keyword}":`, error);
            return { error: "Search failed", details: error.toString() };
        }
    },
    
    async getProductDetails(sku) {
        try {
            const result = await ApiService.request(`/product/${sku}`, 'GET');
            return result;
        } catch (error) {
            console.error(`Error getting product details for "${sku}":`, error);
            return { error: "Failed to get product details", details: error.toString() };
        }
    },
    
    processSearchResults(result) {
        if (result.error) {
            return {
                error: result.error,
                details: result.details
            };
        }
        
        if (result.data && result.data.products) {
            return {
                total_count: result.data.products.total_count,
                products: result.data.products.items.map(item => ({
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    small_image: item.small_image || { url: "placeholder-image.png" },
                    price_range: item.price_range || {
                        maximum_price: {
                            final_price: {
                                value: Math.floor(Math.random() * 1000000) + 100000, // Fallback random price
                                currency: "VND"
                            },
                            discount: {
                                amount_off: 0,
                                percent_off: 0
                            }
                        }
                    }
                }))
            };
        }
        
        return {
            error: "Invalid search results",
            details: "Data not in expected format"
        };
    }
};
export default SearchService;
// =====================================================================
// End of SearchService.js
// =====================================================================