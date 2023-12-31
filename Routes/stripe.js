// const express = require("express");
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
// const Stripe = require("stripe");
// const { Order } = require("../models/Order");

dotenv.config();
const stripe = Stripe(process.env.STRIPE_KEY);

const router = express.Router();


router.post("/create-checkout-session", async (req, res) => {
    const customer = await stripe.customers.create({
      metadata: {
        userId: req.body.userId,
       
        cart: JSON.stringify(req.body.cartItems),
      },
    });
    console.log(customer)
    const line_items = req.body.packages.map((item) => {
      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
            images: [item.img],
           
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      };
    });
  
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      shipping_address_collection: {
        allowed_countries: ["IN", "CA", "KE"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 0,
              currency: "inr",
            },
            display_name: "Free shipping",
            // Delivers between 5-7 business days
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 5,
              },
              maximum: {
                unit: "business_day",
                value: 7,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 1500,
              currency: "inr",
            },
            display_name: "Next day air",
            // Delivers in exactly 1 business day
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 1,
              },
              maximum: {
                unit: "business_day",
                value: 1,
              },
            },
          },
        },
      ],
      phone_number_collection: {
        enabled: true,
      },
      line_items,
      mode: "payment",
      customer: customer.id,
      success_url: `${process.env.CLIENT_URL}`,
      cancel_url: `${process.env.CLIENT_URL}/packages`,
    });
  
    // res.redirect(303, session.url);
    res.send({ url: session.url });
  });

export default router;
