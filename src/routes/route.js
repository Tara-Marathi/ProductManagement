const express = require('express');
const router = express.Router();


// --------------------- Controllers --------------------------
const userController = require("../controllers/userController.js");
const productController = require("../controllers/productController.js");
const cartController = require("../controllers/cartController.js");
const orderController = require("../controllers/orderController.js");
const middleware = require("../middleware/auth");


// ------------------  USER ------------------------------
router.post("/register", userController.createUser);  

router.post("/login", userController.loginUser);  

router.get("/user/:userId/profile",middleware.authentication, userController.getUserProfile);

router.put("/user/:userId/profile",middleware.authentication, userController.updateProfile);


// ---------------------- PRODUCT -----------------------
router.post("/products", productController.createProduct); 

router.get("/products", productController.getProduct);

router.get("/products/:productId", productController.getProductById );

router.put("/products/:productId", productController.updateProduct );

router.delete("/products/:productId", productController.deleteProduct );


// ----------------------- CART ---------------------------------
router.post("/users/:userId/cart", middleware.authentication,cartController.createCart); 

router.get("/users/:userId/cart",middleware.authentication, cartController.getCart);

router.put("/users/:userId/cart", middleware.authentication,cartController.updateCart );

router.delete("/users/:userId/cart", middleware.authentication,cartController.deleteCart );


//------------------------ ORDER --------------------------------
router.post("/users/:userId/orders",middleware.authentication, orderController.createOrder); 

router.put("/users/:userId/orders",middleware.authentication, orderController.updateOrder);


module.exports = router;