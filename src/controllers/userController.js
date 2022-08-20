const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const aws = require("../aws/aws");


// ------------------------------------------  VALIDATION -------------------------------------------
const validRequest = function(requestBody){
    return Object.keys(requestBody).length > 0 ;
}

const isValid = function(value){
    if(typeof value === 'undefined' || value === null)  return false
    if(typeof value === 'string' && value.trim().length === 0) return false
    return true
}

const isValidEmail = function(mail){
  return /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(mail);
}

const isValidphone = function (phone) {
  return /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone)
}
const isValidPass = function (pass) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,15}$/.test(pass)
}

const isValidString = function(value){
    return /^[A-Za-z]+$/.test(value)
}

const isValidPincode = function (value) {
  if (!isNaN(value) && value.toString().length == 6) 
    return true 
  return false  
}

// -------------------------------------  CREATE USER -----------------------------------------------------
const createUser = async function(req,res){
    try{
        const requestBody = req.body;
        const profileImage = req.files;

        if(!validRequest(requestBody)){
            return res.status(400).send({status:false,msg:"Invalid request parameters, Provide user details to register"})
        }

        const { fname, lname, email, phone, password } = requestBody         //destructuring

        if(!isValid(fname)){
            return res.status(400).send({status:false,msg:"Fname (First name) required"})
        }
        if(!isValidString(fname)){
          return res.status(400).send({status:false,msg:"First name is not valid, Only alphabets are allowed"})
        }
        if(!isValid(lname)){
            return res.status(400).send({status:false,msg:"Lname (Last name) required"})
        }
        if(!isValidString(lname)){
          return res.status(400).send({status:false,msg:"Last name is not valid, Only alphabets are allowed"})
        }
        if(!isValid(email)){
            return res.status(400).send({status:false,msg:"Email required"})
        }
        if(!isValidEmail(email)){
            return res.status(400).send({status:false,msg:"Email address is not valid"})
        }
        if(!isValid(phone)){
            return res.status(400).send({status:false,msg:"Phone number required"})
        }
        if (!isValidphone(phone)) {
            return res.status(400).send({ status: false, message: "Enter valid phone number" });
        }
        if(!isValid(password)){
            return res.status(400).send({status:false,msg:"Password required"})
        }
        if(!(isValidPass(password))){
            return res.status(400).send({status:false,msg:"Password should contain 8-15 characters and atleast one number"})
        }

        // hashing
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        requestBody.password = hashedPassword

        if(!requestBody.address || Object.keys(requestBody.address).length==0){
          return res.status(400).send({ status: false, message: "Please provide the Address" }) 
        }

        const address = JSON.parse(requestBody.address) 

        if(!address.shipping || !address.shipping.street || !address.shipping.city || !address.shipping.pincode){
            return res.status(400).send({status:false,msg:"Shipping Address required, Enter street, city and pincode"})
        }
        if(!isValidPincode(address.shipping.pincode)){
            return res.status(400).send({status:false,msg:"Enter 6 digits valid pincode for shipping address"})
        }
        if(!address.billing || !address.billing.street || !address.billing.city || !address.billing.pincode){
            return res.status(400).send({status:false,msg:"Billing Address required, Enter street, city and pincode"})
        }
        if(!isValidPincode(address.billing.pincode)){
            return res.status(400).send({status:false,msg:"Enter 6 digits valid pincode for billing address"})
        }
        requestBody.address = address

        // file upload 
        if(profileImage && profileImage.length > 0){
            let uploadedFileURL = await aws.uploadFile( profileImage[0] )
            requestBody['profileImage'] = uploadedFileURL
        }
        else{
            return res.status(400).send({status:false, msg:"profile image required" })
        }

        const newEmail = email.toLowerCase();
        const uniqueEmail = await userModel.findOne({email:newEmail})
        if(uniqueEmail){
            return res.status(400).send({status:false,msg:`${newEmail} email address already exist`})
        }
        const uniquePhone = await userModel.findOne({phone})
        if(uniquePhone){
            return res.status(400).send({status:false,msg:`${phone} number is already exist`})
        }

        const user = await userModel.create(requestBody);
        return res.status(201).send({status:true,msg:"User registered successfully",data:user});

    }
    catch(error){
        return res.status(500).send({status:false,message:error.message})
    }
}


// --------------------------------------------- login user ----------------------------------------------

const loginUser = async function (req, res) {
    try {
      const requestBody = req.body;
  
      if(!validRequest(requestBody)) {
        return res.status(400).send({status: false,message: "Invalid details please provide login details"});
      }
  
      let { email, password } = requestBody;

      if (!isValid(email)) {
        return res.status(400).send({ status: false, message: "Email is mandatory for login" });
      }
  
      if(!isValidEmail(email)){
        return res.status(400).send({status:false,msg:"Email should be valid"})
      }
  
      if (!isValid(password)) {
        return res.status(400).send({ status: false, message: "Password is mandatory for login" });
      }

      email = email.toLowerCase();
  
      const findUser = await userModel.findOne({ email });
  
      if (!findUser) {
        return res.status(401).send({status: false,message: "Incorrect email"});
      }

      const validUserPassword = await bcrypt.compare(
        password,
        findUser.password
    );
    if (!validUserPassword) {
        return res.status(401).send({ status: false, message: "Incorrect password" });
    }

  
      let token = jwt.sign(
        {
          userId: findUser._id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60,
        },
        "uranium-secretekey"
      );
      
      // res.header("x-api-key", token);
  
      return res.status(200).send({status:true,message: "logIn successful.",data: { userId:findUser._id, token }});
    } 
    catch (error) {
      return res.status(500).send({ status: false, message: error.message });
    }
  }


// --------------------------------------------  get User Details ---------------------------------------------

const getUserProfile = async function(req,res){
  try{
      const userId = req.params.userId;

      if(! ObjectId.isValid(userId)){
        return res.status(400).send({status:false,msg:"Invalid UserId"});
      }

      const userExist = await userModel.findOne({_id:userId});
      if(!userExist){
        return res.status(404).send({status:false,msg:"User not found"});
      }
      //AUTHORIZATION
      if(req.userId != userId){
        return res.status(401).send({status:false,msg:"Unauthorized access"})
      }
      
      return res.status(200).send({ status: true, message: "User profile details", data: userExist })
  }
  catch(error){
      return res.status(500).send({ status: false, message: error.message });
  }

}

// ------------------------- update profile  ------------------------------------

const updateProfile = async function (req, res) {
  try {
      const userId = req.params.userId
      // let userIdFromToken = req.userId

      if (!userId) { return res.status(400).send({ status: false, message: "userid required" }) }

      if (!ObjectId.isValid(userId)) {
          return res.status(400).send({ status: false, message: "UserId not a valid ObjectId" })
      }

      let userData = await userModel.findById(userId)
      if (!userData) {
          return res.status(404).send({ status: false, message: "User not found" })
      }

      //AUTHORIZATION
      if(req.userId != userId){
        return res.status(401).send({status:false,msg:"Unauthorized access"})
      }

      const data = req.body;
      const profileImage = req.files;

      if (!validRequest(data) && !profileImage) {
        return res.status(400).send({ status: true, message: "No data passed to modify the user profile" })
      }

      const { fname, lname, email, phone, password } = data;

      const updatedData = {}

      if (fname) {
          if (!isValidString(fname)) {
              return res.status(400).send({ status: false, message: "Enter valid fname" })
          }
          updatedData['fname'] = fname
      }

      if (lname) {
        if (!isValidString(lname)) {
          return res.status(400).send({ status: false, message: "Enter valid lname" })
        } 
          updatedData['lname'] = lname
      }

      if (email) {
          if (!isValidEmail(email)) {
              return res.status(400).send({ status: false, msg: "Invalid Email address" })
          }
          const dupEmail = await userModel.findOne({ email })
          if (dupEmail) {
              return res.status(400).send({ status: false, message: "email already present" })
          }
          updatedData['email'] = email
      }

      if (phone) {
          if (!isValidphone(phone)) {
            return res.status(400).send({ status: false, msg: "Invalid PhoneNumber" })
          }
          const dupPhone = await userModel.findOne({ phone })
          if (dupPhone) {
            return res.status(400).send({ status: false, message: "phone number already present" })
          }
          updatedData['phone'] = phone
      }

      if (password) {
        if(!(isValidPass(password))){
          return res.status(400).send({status:false,msg:"Password should contain 8-15 characters and atleast one number"})
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
      
        updatedData['password'] = hashedPassword
      }


      if(profileImage && profileImage.length > 0) {
          let uploadedFileURL = await aws.uploadFile(profileImage[0])
          updatedData['profileImage'] = uploadedFileURL
      }

      if (data.address) {
          const address=JSON.parse(data.address)

          if(Object.keys(address).length>0){
            const shippingAddress=address.shipping
            const billingAddress = address.billing

            if (shippingAddress) {

              if(shippingAddress.street){
                if (!isValid(shippingAddress.street)) {
                    return res.status(400).send({status:false,msg:"Enter valid value for street"})
                }
                updatedData['address.shipping.street'] = shippingAddress.street
              }

              if (shippingAddress.city) {
                  if (!isValidString(shippingAddress.city)) {
                      return res.status(400).send({ status: false, message: "Please mention valid shipping city" })
                  }
                  updatedData['address.shipping.city'] = shippingAddress.city
              }

              if (shippingAddress.pincode) {
                  if (!isValidPincode(shippingAddress.pincode)) {
                      return res.status(400).send({ status: false, message: "Pincode should be numeric and length is 6" })
                  }
                  updatedData['address.shipping.pincode'] = shippingAddress.pincode
              }
            }
            if (billingAddress) {

              if(billingAddress.street){
                if (!isValid(billingAddress.street)) {
                  return res.status(400).send({status:false,msg:"Enter valid value for street in billing address"})
                }
                updatedData['address.billing.street'] = billingAddress.street
              }

              if (billingAddress.city) {
                if (!isValidString(billingAddress.city)) {
                    return res.status(400).send({ status: false, message: "Please mention valid billing city" })
                }
                updatedData['address.billing.city'] = billingAddress.city
              }

              if (billingAddress.pincode){
                if (!isValidPincode(billingAddress.pincode)) {
                    return res.status(400).send({ status: false, message: "Pincode should be numeric and length is 6" })
                }
                updatedData['address.billing.pincode'] = billingAddress.pincode
              }
            }
          }
      }
      // console.log(updatedData)
      if(!(Object.keys(updatedData).length)){
        return res.status(400).send({ status: true, message: "data is not passed to modify the user profile" })
      }
    let updatedDetails = await userModel.findByIdAndUpdate({_id:userId}, updatedData , { new: true })
    return res.status(200).send({ status: true, message: "User profile updated", data: updatedDetails })

  }
  catch (error) {
      return res.status(500).send({ status: false, message: error.message })
  }
}

  
module.exports = { createUser, loginUser, getUserProfile, updateProfile }