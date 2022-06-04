const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");
const userModel = require("../models/userModel");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


// ---------------- VALIDATION  -----------------------------------------
const validRequest = function(requestBody){
    return Object.keys(requestBody).length > 0 ;
}

// --------------  CREATE ORDER ------------------------------------------
const createOrder = async function(req,res){
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
            return res.status(400).send({status:false,msg:"Provide Cart details to order product"});
        }
        const { cartId, cancellable, status } = requestBody;

        if (cancellable) {
            if (!(typeof (cancellable) == 'boolean')) {
                return res.status(400).send({ status: false, message: "Cancellable must be a boolean value" });
            }
        }

        if (status) {
            if (['pending', 'completed', 'cancelled'].indexOf(status) == -1) {
                return res.status(400).send({ status: false, message: "Status sould be one of the pending, completed, cancelled" });
            }
        }

        if(! ObjectId.isValid(cartId)){
            return res.status(400).send({status:false,msg:"Invalid cartId"});
        }

        const cart = await cartModel.findOne({_id:cartId,userId:userId});
        if(!cart){
            return res.status(404).send({status:false,msg:"Cart not found,Info missmatch"});
        }

        const itemArr = cart.items;

        if(!(itemArr.length)){
            return res.status(400).send({status:false,msg:"Cart is empty,add products to the cart to order"});
        }

        let totalQuant  = 0;
        for(let i=0;i<itemArr.length;i++){
            totalQuant += itemArr[i].quantity 
        }

        const cartDetails = {
            userId,
            items:itemArr,
            totalPrice:cart.totalPrice,
            totalItems:cart.totalItems,
            totalQuantity:totalQuant
        }
        const orderData = await orderModel.create(cartDetails);

        await cartModel.findOneAndUpdate({ userId: userId },{ $set: { items: [], totalPrice: 0, totalItems: 0 } } );

        return res.status(201).send({status:true,msg:"Order placed successfully",data:orderData});

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

// -------------------------  UPDATE ORDER --------------------------------------------
const updateOrder = async function(req,res){
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
            return res.status(400).send({status:false,msg:"Provide OrderId to update order"});
        }
        const { orderId, status } = requestBody;

        if(! ObjectId.isValid(orderId)){
            return res.status(400).send({status:false,msg:"Invalid orderId"});
        }

        const orderExist = await orderModel.findOne({_id:orderId,userId:userId,isDeleted:false})
        if(!orderExist){
            return res.status(404).send({status:false,msg:"Order not found"})
        }
        
        if(!status) {
            return res.status(400).send({ status: false, message: "Enter status" });
        }

        if (['pending', 'completed', 'cancelled'].indexOf(status) == -1) {
            return res.status(400).send({ status: false, message: "status sould be one of the pending, completed, cancelled" });
        }

        if (orderExist.status == "completed") {
            return res.status(400).send({ status: false, message: "order is already get completed" });
        }

        if (orderExist.status == "cancelled") {
            return res.status(400).send({ status: false, message: "order is already cancelled" });
        }
        if(orderExist.cancellable == false && status=="cancelled"){
            return res.status(400).send({status:false,msg:"You cant cancel order"})
        }

        if (orderExist.status == "pending") {
            let updatedData = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })
            return res.status(200).send({ status: true, message: "Order cancelled Successfully", data: updatedData });
        }
    
    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { createOrder, updateOrder };