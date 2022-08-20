const productModel = require("../models/productModel");
const curency = require("currency-symbol-map");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const aws = require("../aws/aws");


// ---------------- Validations  ------------------------------
const validRequest = function(requestBody){
    return Object.keys(requestBody).length > 0 ;
}

const isValid = function(value){
    if(typeof value === 'undefined' || value === null)  return false
    if(typeof value === 'string' && value.trim().length === 0) return false
    return true
}

const isValidNumber = function (value) {
    if (!isNaN(value)) return true
    return false
}


// ----------------------  Create Product  -----------------------------------------
const createProduct = async function(req,res){
    try{
        const requestBody = req.body;
        const productImage = req.files;

        if(!validRequest(requestBody)){
            return res.status(400).send({status:false,msg:"Invalid request parameters, Provide product details"})
        }

        const { title, description, price, currencyId,currencyFormat, isFreeShipping, availableSizes,style, installments } = requestBody

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: "title is required" })
        }
        
        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: "description is required" })
        }

        if (!isValid(price)) {
            return res.status(400).send({ status: false, message: "price is required" })
        }
        if (!isValidNumber(price)) {
            return res.status(400).send({ status: false, message: "price should be a number" })
        }
        if (price <= 0) {
            return res.status(400).send({ status: false, message: "price should be greater than 0" })
        }

        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: "currencyId is required" })
        }
        if (!(currencyId == 'INR')) {
            return res.status(400).send({ status: false, message: "currencyId should be INR" })
        }
        
        // currency symbol
        if(currencyFormat){
            
            if(currencyFormat != "₹"){
                return res.status(400).send({ status: false, message: "currencyFormat should be ₹" })
            }

        }else{
            requestBody['currencyFormat'] = curency(currencyId)
        }
        
        if(isFreeShipping){
            if (!((isFreeShipping == 'true') || (isFreeShipping == 'false'))) {
                return res.status(400).send({ status: false, message: "isFreeShipping should be true/false" })
            }
        }

        if (!isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: "availableSizes is required" })
        }

        let sizeArray = availableSizes.trim().toUpperCase().split(",").map(x => x.trim())
        
        for (let i = 0; i < sizeArray.length; i++) {
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizeArray[i]))) {
                return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
            }
        }
        requestBody['availableSizes'] = sizeArray


        if (productImage && productImage.length > 0) {
            let uploadedFileURL = await aws.uploadFile(productImage[0])
            requestBody['productImage'] = uploadedFileURL
        }
        else {
            return res.status(400).send({ status: false, message: "productImage is required" })
        }

        if(style){
            if(!isValid(style)){
                return res.status(400).send({status:false,msg:"Enter a valid value for style"})
            }        
        }
        if(installments){
            if (!(/^[0-9]*$/.test(installments))) {
                return res.status(400).send({ status: false, message: "Installment should be a whole number" })
            }
        }

        let uniqueTitle = await productModel.findOne({ title: title })
        if (uniqueTitle) {
            return res.status(400).send({ status: false, message: "Title already exists" })
        }

        const product = await productModel.create(requestBody);
        return res.status(201).send({status:true,msg:"Product created successfully",data:product});

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }

}

// ---------------------------------------  get product by filter -----------------------------------

const getProduct = async function(req,res){
    try{
        const queryData = req.query

        const filter = {isDeleted:false};

        if(!validRequest(queryData)){
            const productsNotDeleted = await productModel.find(filter);
            if (productsNotDeleted.length == 0) {
                return res.status(404).send({ status: false, message: "product not found" })
            }
            return res.status(200).send({ status: true, message: 'product list', data: productsNotDeleted })
    
        }

        const { size, name, priceGreaterThan, priceLessThan, priceSort} = queryData;

        if(size){
            const avlSize = size.trim().toUpperCase().split(",").map(x=>x.trim())
            for(let i=0;i<avlSize.length;i++){
                if(!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(avlSize[i]))){
                    return res.status(400).send({status:false,msg:`${avlSize[i]} size is not available`})
                }
            }
            filter['availableSizes'] = {$all:avlSize}
        }

        if(name){
            if(!isValid(name)){
                return res.status(400).send({status:false,msg:"Enter a valid value"})
            }
                filter['title'] = {}
                filter['title']['$regex'] = name
                filter['title']['$options'] = 'i'
            
        }

        if (priceGreaterThan || priceLessThan) {

            filter.price = {}

            if (priceGreaterThan) {
                if (!isValidNumber(priceGreaterThan)) {
                    return res.status(400).send({ status: false, message: "PriceGreaterThan must be a number " })
                }
                if (priceGreaterThan <= 0) {
                    return res.status(400).send({ status: false, message: "PriceGreaterThan should be greter than 0" })
                }
                filter['price']['$gte'] =  priceGreaterThan
            }     
    
            if (priceLessThan) {
                if (!isValidNumber(priceLessThan)) {
                    return res.status(400).send({ status: false, message: "PriceLesserThan must be a number " })
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: "priceLesserThan should be greter than 0" })
                }
                filter['price']['$lte']= priceLessThan 
            }
        }
    
        let productsData ;
        if (priceSort) {
            if (!(priceSort == "1" || priceSort == "-1")) {
                return res.status(400).send({ status: false, message: "You can sort price by 1 or -1" })
            }

            productsData = await productModel.find(filter).sort({ price: priceSort })
        }
        else{    
            productsData = await productModel.find(filter);
        }     
    
        if (productsData.length == 0) {
            return res.status(404).send({ status: false, message: "product not found" })
        }
        return res.status(200).send({ status: true, message: 'product list', data: productsData })
       
    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

// --------------------------------------- get product by id  -----------------------------------------------

const getProductById = async function(req,res){
    try{
        const productId = req.params.productId;

        if(! ObjectId.isValid(productId)){
            return res.status(400).send({status:false,msg:"Invalid productId"});
        }
        const productExist = await productModel.findOne({_id:productId,isDeleted:false});
        if(!productExist){
            return res.status(404).send({status:false,msg:"Product not found"})
        }
        return res.status(200).send({status:true,msg:"Product details",data:productExist});

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}

// ---------------------------------- Update Product ----------------------------------------
const updateProduct = async function(req,res){
    try{
        const productId = req.params.productId;

        if(! ObjectId.isValid(productId)){
            return res.status(400).send({status:false,msg:"Invalid productId"});
        }
        const productExist = await productModel.findOne({_id:productId,isDeleted:false});
        if(!productExist){
            return res.status(404).send({status:false,msg:"Product not found"})
        }

        const requestBody = req.body;
        const productImage = req.files;

        if(!validRequest(requestBody) && !productImage){
            return res.status(400).send({status:false,msg:"Provide data to update product"})
        }

        const { title, description,currencyId,price, isFreeShipping, availableSizes,style,installments } = requestBody;
        
        const productData = { }

        if(title){
            if(!isValid(title)){
                return res.status(400).send({status:false,msg:"Enter a valid title"})
            }
            const titleExist = await productModel.findOne({title});
            if(titleExist) {
                return res.status(400).send({status:false,msg:"Title already exist"})
            }
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['title']=title
            productData['title'] = title;            
        }

        if(description){
            if(!isValid(description)){
                return res.status(400).send({status:false,msg:"Enter a valid value for description"})
            }
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['description']=description
            productData['description'] = description;
            
        }
        if(currencyId){
            if(currencyId != "INR"){
                return res.status(400).send({status:false,msg:"CurrencyId sould be INR"})
            }
             // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['currencyId']=currencyId
            productData['currencyId'] = currencyId;
            
        }
        if(price){
            if(!isValidNumber(price)){
                return res.status(400).send({status:false,msg:"Price should be a number"})
            }
            if(price <= 0){
                return res.status(400).send({status:false,msg:"Price should be greater than zero"})
            }
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['price']=price;
            productData['price'] = price;
            
        }
        if(isFreeShipping){
            if(!((isFreeShipping == "true") || (isFreeShipping == "false"))){ 
                return res.status(400).send({status:false,msg:"isFreeShipping should be (true/false)"})
            }   
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['isFreeShipping']=isFreeShipping
            productData['isFreeShipping'] = isFreeShipping;         
        }

        // if((isFreeShipping == "true") || (isFreeShipping == "false")){ 
        //     productData['$set']['isFreeShipping'] = isFreeShipping;
        // }

        if(installments){                                      // /^[0-9]*$/
            if(!(/^[0-9]*$/.test(installments))){  
                return res.status(400).send({status:false,msg:"Installment should be a number"})  
            }  
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['installments']=installments                          
            productData['installments'] = installments;
                                                                 
        }
        if(style){
            if(!isValid(style)){
                return res.status(400).send({status:false,msg:"Enter a valid value for style"})
            }
            // if(!Object.prototype.hasOwnProperty.call(productData, '$set'))  productData['$set']={}
            // productData['$set']['style']=style
            productData['style'] = style;          
            
        }
        if(availableSizes){
            const sizeArray = availableSizes.trim().toUpperCase().split(",").map(x=>x.trim());
            for(let i=0;i<sizeArray.length;i++){
                if(!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizeArray[i]))){
                    return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}`})
                }
            }
            // if(!Object.prototype.hasOwnProperty.call(productData, '$addToSet'))  productData['$addToSet']={}
            // productData['$addToSet']['availableSizes']={$each:sizeArray}
            productData['availableSizes'] = sizeArray;
        }

       
        if (productImage && productImage.length > 0) {
            let uploadedFileURL = await aws.uploadFile(productImage[0])
            productData['productImage'] = uploadedFileURL      
        }
       
        if(!(Object.keys(productData).length)){
            return res.status(400).send({ status: true, message: "data is not passed to modify product details" })
        }
        const updatedProduct = await productModel.findByIdAndUpdate({_id:productId},productData,{new:true});
        return res.status(200).send({status:true,msg:"Product updated successfully",data:updatedProduct})
        
    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }

}

// ----------------------------------  delete product  ---------------------------------------

const deleteProduct = async function(req,res){
    try{
        const productId = req.params.productId;

        if(! ObjectId.isValid(productId)){
            return res.status(400).send({status:false,msg:"Invalid productId"});
        }
        const productExist = await productModel.findOneAndUpdate({_id:productId,isDeleted:false},{$set:{isDeleted:true,deletedAt:new Date()}});
        if(!productExist){
            return res.status(404).send({status:false,msg:"Product not found"})
        }
        return res.status(200).send({status:true,msg:"Product deleted successfully"});

    }
    catch(error){
        return res.status(500).send({ status: false, message: error.message });
    }
}


module.exports = { createProduct, getProduct, getProductById, updateProduct, deleteProduct }


