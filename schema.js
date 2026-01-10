const joi = require("joi");
/*const review = require("./Models/review");*/

module.exports.listingSchema = joi.object({
    Listing : joi.object({
        title : joi.string().required(),
        description : joi.string().required(),
        image : joi.string().allow("",null),
        price : joi.number().required(),
        location : joi.string().required(),
        country : joi.string().required(),
        category : joi.string().allow("", null).optional()
    }).required(),
    
    // Also accept top-level fields from form submission
    title : joi.string().optional(),
    description : joi.string().optional(),
    image : joi.string().allow("",null).optional(),
    price : joi.number().optional(),
    location : joi.string().optional(),
    country : joi.string().optional(),
    category : joi.string().optional()
});

module.exports.reviewSchema = joi.object({
    review : joi.object({
        rating : joi.number().required().min(1).max(5),
        comment : joi.string().required()
    }).required(),
});