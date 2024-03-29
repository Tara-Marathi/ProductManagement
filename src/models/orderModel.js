const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const orderSchema = new mongoose.Schema({
    userId: {
        type:ObjectId, 
        ref:"User", 
        required:true
    },
    items: [{
      productId: {type:ObjectId, ref:"Product", required:true},
      quantity: {type:Number, required:true,min:1},
      _id:false
    }],
    totalPrice: {                 
        type:Number,
        required:true
    },                      
    totalItems: {                
        type:Number,
        required:true
    },
    totalQuantity: {type:Number,required:true},
    cancellable: {type:Boolean, default: true},
    status: {
        type:String, 
        default: 'pending', 
        enum:["pending", "completed", "canceled"]
    },
    isDeleted: {
        type:Boolean, 
        default: false
    },
    deletedAt:Date

}, {timestamps:true});


module.exports = mongoose.model("Order",orderSchema);
