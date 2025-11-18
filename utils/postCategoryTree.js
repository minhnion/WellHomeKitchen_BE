import PostCategory from "../models/postCategory.model.js";
import mongoose from "mongoose";

export const getDescendantCategoryIds = async (categoryId) => {
  const descendants = [];
  const queue = [categoryId];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    descendants.push(currentId);

    const children = await PostCategory.find({ parent: currentId }).select(
      "_id"
    );
    queue.push(...children.map((child) => child._id.toString()));
  }

  return descendants;
};

export const getPostCategoryPath = async (postCategoryId) => {
  if (!mongoose.isValidObjectId(postCategoryId)) {
    return { path: "", categories: [] };
  }

  const categories = [];
  const visited = new Set();

  const buildPath = async (postCatId) => {
    if (!postCatId || visited.has(postCatId.toString())) return;
    visited.add(postCatId.toString());
    const postCategory = await PostCategory.findById(postCatId).select(
      "name slug parent"
    );
    if (!postCategory) return;
    categories.unshift({
      _id: postCategory._id,
      name: postCategory.name,
      slug: postCategory.slug,
      parent: postCategory.parent,
    });
    if (postCategory.parent) {
      await buildPath(postCategory.parent);
    }
  };

  await buildPath(postCategoryId);
  const path = categories.map((cat) => cat.slug).join("/");

  return { path, categories };
};

export const checkCircularReference = async (categoryId, parentId) => {
  if (!parentId || categoryId === parentId) return true;

  let currentId = parentId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === categoryId) return true;

    const category = await PostCategory.findById(currentId).select("parent");
    if (!category) break;
    currentId = category.parent?.toString();
  }

  return false;
};
