// =====================================================================
// Cart Service
// =====================================================================
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
            const token = AuthService.getToken();
            
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
    
    async addToCart(sku, quantity = 1) {
        if (!this.cartId) {
            // Create a cart if we don't have one
            if (AuthService.isLoggedIn) {
                const token = AuthService.getToken();
                await this.createAuthenticatedCart(token);
            } else {
                await this.createGuestCart();
            }
            
            if (!this.cartId) {
                return { error: "Failed to create cart" };
            }
        }
        
        try {
            const token = AuthService.isLoggedIn ? AuthService.getToken() : null;
            
            // First try backend API
            try {
                const result = await ApiService.request('/cart/add', 'POST', {
                    cart_id: this.cartId,
                    sku: sku,
                    quantity: quantity
                }, token);
                
                await this.getCart();
                return result;
            } catch (backendError) {
                console.warn("Backend add to cart failed, trying direct GraphQL:", backendError);
            }
            
            // If backend fails, try direct GraphQL communication
            const graphqlQuery = `
            mutation {
                addProductsToCart(
                    cartId: "${this.cartId}",
                    cartItems: [
                        {
                            quantity: ${quantity},
                            sku: "${sku}"
                        }
                    ]
                ) {
                    cart {
                        itemsV2 {
                            items {
                                product {
                                    name
                                    sku
                                }
                                quantity
                            }
                        }
                    }
                    user_errors {
                        code
                        message
                    }
                }
            }`;
            
            const graphqlResult = await ApiService.graphqlRequest(graphqlQuery, null, token);
            console.log("GraphQL add to cart result:", graphqlResult);
            
            if (graphqlResult.errors && graphqlResult.errors.length > 0) {
                return { error: graphqlResult.errors[0].message };
            }
            
            if (graphqlResult.data && graphqlResult.data.addProductsToCart) {
                if (graphqlResult.data.addProductsToCart.user_errors && 
                    graphqlResult.data.addProductsToCart.user_errors.length > 0) {
                    return { error: graphqlResult.data.addProductsToCart.user_errors[0].message };
                }
                
                await this.getCart();
                return graphqlResult;
            }
            
            return { error: "Failed to add item to cart" };
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { error: "Failed to add item to cart: " + error.message };
        }
    },
    
    async transferCartItems(sourceCartId, targetCartId) {
        try {
            // Get items from source cart
            const sourceCart = await this.getCart(sourceCartId);
            
            if (sourceCart.error || !sourceCart.data || !sourceCart.data.cart || !sourceCart.data.cart.items) {
                return false;
            }
            
            const items = sourceCart.data.cart.items;
            const token = AuthService.getToken();
            
            // Add each item to target cart
            for (const item of items) {
                await ApiService.request('/cart/add', 'POST', {
                    cart_id: targetCartId,
                    sku: item.product.sku,
                    quantity: item.quantity
                }, token);
            }
            
            return true;
        } catch (error) {
            console.error("Error transferring cart items:", error);
            return false;
        }
    },
    
    async getCheckoutUrl() {
        if (!this.cartId) return null;
        
        try {
            const result = await ApiService.request('/checkout/start', 'POST', { cart_id: this.cartId });
            
            if (result.success && result.redirect_url) {
                return result.redirect_url;
            }
            
            return null;
        } catch (error) {
            console.error("Error getting checkout URL:", error);
            return null;
        }
    }
};
export default CartService;
// =====================================================================
// END OF CART SERVICE
// =====================================================================