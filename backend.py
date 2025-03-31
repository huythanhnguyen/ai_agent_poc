#!/usr/bin/env python3
import requests
import json
import os
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from datetime import datetime

# =====================================================================
# Configuration
# =====================================================================
class Config:
    """Base configuration."""
    DEBUG = False
    TESTING = False
    API_URL = "https://online.mmvietnam.com/graphql"
    ECOMMERCE_URL = "https://online.mmvietnam.com"
    HEADERS = {
        "Content-Type": "application/json",
        "Store": "b2c_10010_vi"
    }

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Load configuration
config_name = 'production'
active_config = config[config_name]

# =====================================================================
# Utility Functions
# =====================================================================
def format_response(success=True, data=None, error=None):
    """Format a standard API response."""
    response = {
        "success": success,
        "timestamp": datetime.now().isoformat()
    }
    
    if data is not None:
        response["data"] = data
    
    if error is not None:
        response["error"] = error
    
    return response

def log_api_call(method, url, headers=None, data=None, response=None, error=None):
    """Log API calls for debugging."""
    print(f"[API Call] {method} {url}")
    if headers:
        print(f"Headers: {json.dumps(headers, indent=2)}")
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    if response:
        print(f"Response: {json.dumps(response, indent=2)}")
    if error:
        print(f"Error: {error}")

# =====================================================================
# GraphQL Client
# =====================================================================
class GraphQLClient:
    """Client for interacting with the GraphQL API."""
    def __init__(self, url=None, headers=None):
        self.url = url or active_config.API_URL
        self.headers = headers or active_config.HEADERS.copy()
    
    def execute(self, query, variables=None, headers=None):
        """Execute a GraphQL query."""
        payload = {
            "query": query
        }
        
        if variables:
            payload["variables"] = variables
        
        request_headers = self.headers.copy()
        if headers:
            request_headers.update(headers)
        
        try:
            response = requests.post(
                self.url,
                headers=request_headers,
                json=payload
            )
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"GraphQL request error: {e}")
            raise e
    
    def set_auth_token(self, token):
        """Set the authentication token in the headers."""
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        else:
            if "Authorization" in self.headers:
                del self.headers["Authorization"]

# =====================================================================
# Services
# =====================================================================
class ProductService:
    """Service for handling product-related operations."""
    def __init__(self):
        self.client = GraphQLClient()
    
    def search_products(self, keyword):
        """Search for products using a keyword."""
        query = """
        query ProductSearch($keyword: String!) {
            products(search: $keyword, sort: { relevance: DESC }) {
                items {
                    id
                    sku
                    name
                    small_image {
                        url
                    }
                    price_range {
                        maximum_price {
                            final_price {
                                currency
                                value
                            }
                            discount {
                                amount_off
                                percent_off
                            }
                        }
                    }
                }
                total_count
            }
        }
        """
        
        variables = {
            "keyword": keyword
        }
        
        return self.client.execute(query, variables)
    
    def get_product_details(self, sku):
        """Get detailed information about a specific product."""
        query = """
        query GetProductDetails($sku: String!) {
            products(filter: { sku: { eq: $sku } }) {
                items {
                    id
                    uid
                    sku
                    name
                    price {
                        regularPrice {
                            amount {
                                currency
                                value
                            }
                        }
                    }
                    price_range {
                        maximum_price {
                            final_price {
                                currency
                                value
                            }
                            discount {
                                amount_off
                                percent_off
                            }
                        }
                    }
                    media_gallery_entries {
                        uid
                        label
                        position
                        disabled
                        file
                    }
                    small_image {
                        url
                    }
                    unit_ecom
                    description {
                        html
                    }
                }
            }
        }
        """
        
        variables = {
            "sku": sku
        }
        
        return self.client.execute(query, variables)
    
    def filter_by_article_number(self, article_number):
        """Filter products by article number."""
        query = """
        query {
            products(
                filter: {mm_art_no: {eq: "ARTICLE_NUMBER"}}
            ) {
                items {
                    id
                    sku
                    name
                }
                total_count
            }
        }
        """.replace("ARTICLE_NUMBER", article_number)
        
        return self.client.execute(query)

class CartService:
    """Service for handling shopping cart operations."""
    def __init__(self):
        self.client = GraphQLClient()
    
    def create_guest_cart(self):
        """Create a new cart for a guest user."""
        query = """
        mutation {
            createGuestCart {
                cart {
                    id
                }
            }
        }
        """
        
        result = self.client.execute(query)
        
        if "data" in result and "createGuestCart" in result["data"] and "cart" in result["data"]["createGuestCart"]:
            return result["data"]["createGuestCart"]["cart"]["id"]
        
        return None
    
    def create_empty_cart(self, auth_token):
        """Create a new cart for an authenticated user."""
        query = """
        mutation CreateCartAfterSignIn {
            cartId: createEmptyCart
        }
        """
        
        client = GraphQLClient()
        client.set_auth_token(auth_token)
        
        result = client.execute(query)
        
        if "data" in result and "cartId" in result["data"]:
            return result["data"]["cartId"]
        
        return None
    
    def add_to_cart(self, cart_id, sku, quantity=1, auth_token=None):
        """Add a product to the cart."""
        query = """
        mutation AddToCart($cartId: String!, $sku: String!, $quantity: Float!) {
            addProductsToCart(
                cartId: $cartId,
                cartItems: [
                    {
                        quantity: $quantity,
                        sku: $sku
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
        }
        """
        
        variables = {
            "cartId": cart_id,
            "sku": sku,
            "quantity": quantity
        }
        
        client = GraphQLClient()
        if auth_token:
            client.set_auth_token(auth_token)
        
        return client.execute(query, variables)
    
    def get_cart(self, cart_id, auth_token=None):
        """Get the contents of a cart."""
        query = """
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
        }
        """
        
        variables = {
            "cartId": cart_id
        }
        
        client = GraphQLClient()
        if auth_token:
            client.set_auth_token(auth_token)
        
        return client.execute(query, variables)
    
    def get_checkout_url(self, cart_id):
        """Generate the checkout URL for a cart."""
        return f"{active_config.ECOMMERCE_URL}/checkout/cart/?cart_id={cart_id}"

class AuthService:
    """Service for handling authentication operations."""
    def __init__(self):
        self.client = GraphQLClient()
    
    def login(self, email, password):
        """Login a customer with email and password."""
        query = """
        mutation GenerateToken($email: String!, $password: String!) {
            generateCustomerToken(
                email: $email,
                password: $password
            ) {
                token
            }
        }
        """
        
        variables = {
            "email": email,
            "password": password
        }
        
        return self.client.execute(query, variables)
    
    def mcard_login(self, input_data):
        """Login using MCard information."""
        query = """
        mutation generateLoginMcardInfo($input: GenerateLoginMcardInfoInput) {
            generateLoginMcardInfo(input: $input) {
                customer_token
                store_view_code
            }
        }
        """
        
        variables = {
            "input": input_data
        }
        
        return self.client.execute(query, variables)
    
    def get_token_lifetime(self):
        """Get the customer token lifetime from store config."""
        query = """
        query GetStoreConfigData {
            storeConfig {
                customer_access_token_lifetime
            }
        }
        """
        
        return self.client.execute(query)
    

# =====================================================================
# Initialize Services
# =====================================================================
product_service = ProductService()
cart_service = CartService()
auth_service = AuthService()

# =====================================================================
# Flask Application and Routes
# =====================================================================
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Product routes
@app.route('/search', methods=['POST'])
def search_product():
    data = request.json
    keyword = data.get('keyword')
    
    if not keyword:
        return jsonify({"error": "Keyword is required"}), 400
    
    try:
        response = product_service.search_products(keyword)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/product/<sku>', methods=['GET'])
def get_product_details(sku):
    if not sku:
        return jsonify({"error": "SKU is required"}), 400
    
    try:
        response = product_service.get_product_details(sku)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/product/article/<article_number>', methods=['GET'])
def filter_by_article_number(article_number):
    if not article_number:
        return jsonify({"error": "Article number is required"}), 400
    
    try:
        response = product_service.filter_by_article_number(article_number)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500


    
# Add this method to the CartService class in backend.py

def create_empty_cart_via_graphql(self, auth_token):
    """Create a new cart directly via GraphQL."""
    query = """
    mutation CreateCartAfterSignIn {
        cartId: createEmptyCart
    }
    """
    
    client = GraphQLClient(url=active_config.ECOMMERCE_URL + "/graphql")
    client.set_auth_token(auth_token)
    
    try:
        result = client.execute(query)
        
        if "data" in result and "cartId" in result["data"]:
            return result["data"]["cartId"]
    except Exception as e:
        print(f"GraphQL error creating cart: {str(e)}")
    
    return None

# And update the /cart/create route to try both methods
@app.route('/cart/create', methods=['POST'])
def create_cart():
    data = request.json or {}
    customer_token = data.get('customer_token')
    
    try:
        if customer_token:
            # First try the standard Magento API
            cart_id = cart_service.create_empty_cart(customer_token)
            
            # If that fails, try direct GraphQL
            if not cart_id:
                cart_id = cart_service.create_empty_cart_via_graphql(customer_token)
        else:
            # Create guest cart
            cart_id = cart_service.create_guest_cart()
        
        if cart_id:
            return jsonify({"cart_id": cart_id})
        else:
            return jsonify({"error": "Failed to create cart"}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/cart/add', methods=['POST'])
def add_to_cart():
    data = request.json
    cart_id = data.get('cart_id')
    sku = data.get('sku')
    quantity = data.get('quantity', 1)
    auth_header = request.headers.get('Authorization')
    auth_token = None
    
    if auth_header and auth_header.startswith('Bearer '):
        auth_token = auth_header.split(' ')[1]
    
    if not cart_id or not sku:
        return jsonify({"error": "Cart ID and SKU are required"}), 400
    
    try:
        response = cart_service.add_to_cart(cart_id, sku, quantity, auth_token)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/cart/<cart_id>', methods=['GET'])
def get_cart(cart_id):
    if not cart_id:
        return jsonify({"error": "Cart ID is required"}), 400
    
    auth_header = request.headers.get('Authorization')
    auth_token = None
    
    if auth_header and auth_header.startswith('Bearer '):
        auth_token = auth_header.split(' ')[1]
    
    try:
        response = cart_service.get_cart(cart_id, auth_token)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/checkout/start', methods=['POST'])
def start_checkout():
    data = request.json
    cart_id = data.get('cart_id')
    
    if not cart_id:
        return jsonify({"error": "Cart ID is required"}), 400
    
    checkout_url = cart_service.get_checkout_url(cart_id)
    return jsonify({
        "success": True,
        "cart_id": cart_id,
        "redirect_url": checkout_url
    })

# Authentication routes
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    try:
        response = auth_service.login(email, password)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/mcard-login', methods=['POST'])
def mcard_login():
    data = request.json
    input_data = data.get('input')
    
    if not input_data:
        return jsonify({"error": "Input data is required"}), 400
    
    try:
        response = auth_service.mcard_login(input_data)
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

@app.route('/token-lifetime', methods=['GET'])
def get_token_lifetime():
    try:
        response = auth_service.get_token_lifetime()
        return jsonify(response)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "API error", "details": str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# =====================================================================
# Main
# =====================================================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=active_config.DEBUG)
