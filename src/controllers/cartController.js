const cartModel = require("../models/cartModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// ---------------- VALIDATION  -----------------------------------------
const validRequest = function(requestBody){
    return Object.keys(requestBody).length > 0 ;
}

// ----------------------- Create Cart ------------------------------------

const createCart = async function(req,res){
    try{
        const userId = req.params.userId;
        const requestBody = req.body;

        if(! ObjectId.isValid(userId)){
            return res.status(400).send({status:false,msg:"Invalid userId"});
        }
        const userExist = await userModel.findOne({_id:userId});
        if(!userExist){
            return res.status(404).send({status:false,msg:"User not found"})
        }

        //AUTHORIZATION
        if(req.userId != userId){
            return res.status(401).send({status:false,msg:"Unauthorized access"})
        }

        if(!validRequest(requestBody)){
            return res.status(400).send({status:false,msg:"Provide product details to add to cart"});
        }

        const { cartId, productId, quantity } = requestBody;

        if(! ObjectId.isValid(productId)){
            return res.status(400).send({status:false,msg:"Invalid productId"});
        }
        const productExist = await productModel.findOne({_id:productId,isDeleted:false});
        if(!productExist){
            return res.status(404).send({status:false,msg:"Product not found"})
        }

        let productQuantity =1
        if(quantity){
            if(!(quantity > 0)){
                return res.status(400).send({status:false,msg:"Product quantity should be greater than zero"})
            }
            productQuantity = quantity
        }
            
        const cartExist = await cartModel.findOne({userId});
        if(!cartExist){
            const newCart = {
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: productQuantity
                }],
                totalPrice: productExist.price*productQuantity,
                 totalItems: 1,
            };
    
            const cartData = await cartModel.create(newCart)
            return res.status(201).send({status:true,msg:"cart created successfully",data:cartData})
        }
        //return res.status(400).send({status:false,msg:"Cart already exist,Enter cartId to add product to cart"});

        if(cartId){
            if(! ObjectId.isValid(cartId)){
                return res.status(400).send({status:false,msg:"Invalid cartId"});
            }
            const cart = await cartModel.findOne({_id:cartId});
            if(!cart){
                return res.status(404).send({status:false,msg:"cart not found"})
            }
            if(cartExist._id != cartId){
                return res.status(404).send({status:false,msg:"Cart not belongs to this user"});
            }
        }

        const total = (cartExist.totalPrice + (productExist.price*productQuantity) );
        const cartArr = cartExist.items;
        for(i in cartArr){
            if(cartArr[i].productId == productId){
                cartArr[i].quantity+=productQuantity
                const dataToUpdate = {items:cartArr,totalPrice:total,totalItems:cartArr.length}
                const updatedCart =  await cartModel.findOneAndUpdate({userId:userId}, dataToUpdate ,{new:true})
                return res.status(200).send({status:true,msg:"cart details",data:updatedCart})
            }
        }
        cartArr.push({productId:productId,quantity:productQuantity})

        const dataToUpdate = {items:cartArr,totalPrice:total,totalItems:cartArr.length}
        const updatedCart =  await cartModel.findOneAndUpdate({userId:userId}, dataToUpdate  ,{new:true})
        return res.status(200).send({status:true,msg:"cart details",data:updatedCart});

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

// -------------------------  Get Cart  -----------------------------------------
const getCart = async function(req,res){
    try{
        const userId = req.params.userId;
        
        if(! ObjectId.isValid(userId)){
            return res.status(400).send({status:false,msg:"Invalid userId"});
        }
        const userExist = await userModel.findOne({_id:userId});
        if(!userExist){
            return res.status(404).send({status:false,msg:"User not found"})
        }

        //AUTHERIZATION
        if(req.userId != userId){
            return res.status(401).send({status:false,msg:"Unauthorized access"})
        }

        const cartData = await cartModel.findOne({userId});
        if(!cartData){
            return res.status(404).send({status:false,msg:"Cart not found"});
        }

        return res.status(200).send({status:true,msg:"Cart Details",data:cartData})

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

// -------------------------  Update Cart ----------------------------------------
const updateCart = async function(req,res){
    try{
        const userId = req.params.userId;
        const requestBody = req.body;

        if(! ObjectId.isValid(userId)){
            return res.status(400).send({status:false,msg:"Invalid userId"});
        }
        const userExist = await userModel.findOne({_id:userId});
        if(!userExist){
            return res.status(404).send({status:false,msg:"User not found"})
        }

        //AUTHORIZATION
        if(req.userId != userId){
            return res.status(401).send({status:false,msg:"Unauthorized access"})
        }

        if(!validRequest(requestBody)){
            return res.status(400).send({status:false,msg:"Provide Cart details"});
        }

        const { cartId, productId, removeProduct } = requestBody;

        if (!(removeProduct == 0 || removeProduct == 1)) {
            return res.status(400).send({ status: false, msg: "removeProduct value should be either 0 or 1" })
        }

        if(! ObjectId.isValid(productId)){
            return res.status(400).send({status:false,msg:"Invalid productId"});
        }
        if(! ObjectId.isValid(cartId)){
            return res.status(400).send({status:false,msg:"Invalid cartId"});
        }

        const productExist = await productModel.findOne({_id:productId,isDeleted:false});
        if(!productExist){
            return res.status(404).send({status:false,msg:"Product not found"})
        }
        
        const cartExist = await cartModel.findOne({_id:cartId,userId:userId});
        if(!cartExist){
            return res.status(404).send({status:false,msg:"Cart not found"});
        }
        if (cartExist.totalItems == 0) {
            return res.status(400).send({ status: false, message: "This cart is empty" })
        }
        if(removeProduct == 1){
            const itemArr = cartExist.items;
            for(let i=0;i<itemArr.length;i++){
                if(itemArr[i].productId == productId){
                    newPrice = (cartExist.totalPrice - productExist.price)
                    if(itemArr[i].quantity > 1){
                        itemArr[i].quantity-=1

                        let updateCartDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemArr, totalPrice: newPrice }, { new: true })
                        return res.status(200).send({ status: true, msg: "cart updated successfully", data: updateCartDetails })
                    }
                    else{
                        totalItem = cartExist.totalItems - 1 ;
                        itemArr.splice(i, 1)

                        let updateCartDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemArr, totalPrice:newPrice, totalItems:totalItem }, { new: true })
                        return res.status(200).send({ status: true, msg: "cart updated successfully", data: updateCartDetails })
                    }
                }
            }
            return res.status(400).send({ status: true, msg: "This product not present in cart" })
        }
        
        if(removeProduct == 0 ){
            const itemArr = cartExist.items;
            for(let i=0;i<itemArr.length;i++){
                if(itemArr[i].productId == productId){
                    newPrice = (cartExist.totalPrice - (productExist.price*itemArr[i].quantity))
                    totalItems=cartExist.totalItems-1
                    itemArr.splice(i,1)
                    let updateCartDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemArr, totalPrice:newPrice, totalItems:totalItems }, { new: true })
                    return res.status(200).send({ status: true, msg: "cart updated successfully", data: updateCartDetails })

                }
            }
            return res.status(400).send({ status: true, msg: "This product not present in cart" })
        }       

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}


// --------------------------  Delete Cart ------------------------------------

const deleteCart = async function(req,res){
    try{
        const userId = req.params.userId;
        
        if(! ObjectId.isValid(userId)){
            return res.status(400).send({status:false,msg:"Invalid userId"});
        }
        const userExist = await userModel.findOne({_id:userId});
        if(!userExist){
            return res.status(404).send({status:false,msg:"User not found"})
        }

        //AUTHERIZATION
        if(req.userId != userId){
            return res.status(401).send({status:false,msg:"Unauthorized access"})
        }

        const cartExist = await cartModel.findOne({userId});
        if(!cartExist){
            return res.status(404).send({status:false,msg:"Cart not found"});
        }
        if (cartExist.totalItems == 0) {
            return res.status(400).send({ status: false, message: "This cart is empty" })
        }

        const cartData = { items:[],totalPrice:0,totalItems:0};

        const data = await cartModel.findOneAndUpdate({userId},cartData,{new:true})
        return res.status(200).send({status:true,msg:"Cart deleted successfully",data:data})

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}
module.exports = { createCart, getCart, updateCart, deleteCart }; 