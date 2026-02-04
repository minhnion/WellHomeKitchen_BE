import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product from "../models/product.model.js";

const OLD_BRAND_REGEX = /kitchen\s*care/gi;
const NEW_BRAND_NAME = "Bếp An Phú";

async function run() {
    try {
        // 1. Check ENV
        if (!process.env.MONGODB_URI) {
            throw new Error("❌ MONGODB_URI is missing in .env");
        }

        // 2. Connect MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connected");

        // 3. Find products containing Kitchen Care
        const products = await Product.find({
            "introductionContent.data.text": OLD_BRAND_REGEX,
        });

        console.log(`🔍 Found ${products.length} products`);

        let updatedCount = 0;

        // 4. Update intro content
        for (const product of products) {
            let changed = false;

            product.introductionContent = product.introductionContent.map(block => {
                if (
                    ["paragraph", "heading"].includes(block.type) &&
                    typeof block.data?.text === "string"
                ) {
                    const newText = block.data.text.replace(
                        OLD_BRAND_REGEX,
                        NEW_BRAND_NAME
                    );

                    if (newText !== block.data.text) {
                        changed = true;
                    }

                    return {
                        ...block.toObject(),
                        data: {
                            ...block.data,
                            text: newText,
                        },
                    };
                }

                return block;
            });

            if (changed) {
                await product.save();
                updatedCount++;
                console.log(`✅ Updated product: ${product._id}`);
            }
        }

        console.log(`🎉 DONE – Updated ${updatedCount} products`);

        // 5. Disconnect
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ ERROR:", error);
        process.exit(1);
    }
}

run();
