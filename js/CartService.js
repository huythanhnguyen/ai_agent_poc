// js/CartService.js
import CONFIG from './Config.js';
import Utils from './Utils.js';
import ApiService from './ApiService.js';
import AuthService from './AuthService.js'; // Thêm import này

const CartService = {
    _cartId: null,
    _guestCartId: null,
    _cartItems: [],
    
    get cartId() {
        return this._cartId || Utils.getLocalStorageItem(CONFIG.CART_ID_KEY);
    },
    
    set cartId(id) {
        this._cartId = id;
        Utils.setLocalStorageItem(CONFIG.CART_ID_KEY, id);
    },
    
    get guestCartId() {
        return this._guestCartId;
    },
    
    set guestCartId(id) {
        this._guestCartId = id;
    },
    
    get cartItems() {
        return this._cartItems;
    },
    
    set cartItems(items) {
        this._cartItems = items;
    },
    
    get itemCount() {
        return this._cartItems.reduce((total, item) => total + item.quantity, 0);
    },
    
    async createGuestCart() {
        try {
            const result = await ApiService.request('/cart/create', 'POST', {});
            if (result.cart_id) {
                this._guestCartId = result.cart_id;
                this.cartId = this._guestCartId;
                return result.cart_id;
            }
            return null;
        } catch (error) {
            console.error("Error creating guest cart:", error);
            return null;
        }
    },
    
    async createAuthenticatedCart(token) {
        try {
            // First try to use the backend API
            try {
                const result = await ApiService.request('/cart/create', 'POST', { customer_token: token }, token);
                if (result.cart_id) {
                    this.cartId = result.cart_id;
                    return result.cart_id;
                }
            } catch (error) {
                console.warn("Backend API cart creation failed, trying direct GraphQL:", error);
            }
            
            // If backend fails, try direct GraphQL communication
            const query = `
            mutation CreateCartAfterSignIn {
                cartId: createEmptyCart
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(query, null, token);
            
            if (graphqlResult.data && graphqlResult.data.cartId) {
                this.cartId = graphqlResult.data.cartId;
                console.log("Cart created via direct GraphQL:", this.cartId);
                return this.cartId;
            }
            
            return null;
        } catch (error) {
            console.error("Error creating authenticated cart:", error);
            return null;
        }
    },
    
    async getCart(specificCartId = null) {
        const cartId = specificCartId || this.cartId;
        if (!cartId) return { error: "No cart ID available" };
        
        try {
            const token = AuthService.getToken(); // Dòng gây lỗi - Cần import AuthService
            
            // First try backend API
            try {
                const result = await ApiService.request(`/cart/${cartId}`, 'GET', null, token);
                
                if (result.data && result.data.cart) {
                    this._cartItems = result.data.cart.items || [];
                }
                
                return result;
            } catch (backendError) {
                console.warn("Backend get cart failed, trying direct GraphQL:", backendError);
            }
            
            // If backend fails, try direct GraphQL
            const graphqlQuery = `
            query GetCart($cartId: String!) {
                cart(cart_id: $cartId) {
                    items {
                        id
                        product {
                            name
                            sku
                            small_image {
                                url
                            }
                        }
                        quantity
                        prices {
                            price {
                                value
                                currency
                            }
                        }
                    }
                    prices {
                        grand_total {
                            value
                            currency
                        }
                    }
                }
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(
                graphqlQuery, 
                { cartId: cartId }, 
                token
            );
            
            if (graphqlResult.data && graphqlResult.data.cart) {
                this._cartItems = graphqlResult.data.cart.items || [];
                return { data: graphqlResult.data };
            }
            
            return { error: "Failed to get cart via GraphQL" };
        } catch (error) {
            console.error("Error getting cart:", error);
            return { error: "Failed to get cart: " + error.message };
        }
    },
    
    // Các phương thức còn lại...
};

export default CartService;