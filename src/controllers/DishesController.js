const AppError = require("../utils/AppError");
const knex = require("../database/knex");
const DiskStorage = require("../providers/DiskStorage");

class DishesController {
  async create(req, res) {
    const { name, description, category, price, ingredients } = req.body;
    const checkDishAlreadyExists = await knex("dishes").where({ name }).first();

    if (checkDishAlreadyExists) {
      throw new AppError("Este produto já existe no seu cardápio");
    }

    const imageFileName = req.file.filename;
    const diskStorage = new DiskStorage();
    const filename = await diskStorage.saveFile(imageFileName);

    const [dish_id] = await knex("dishes").insert({
      image: filename,
      name,
      description,
      category,
      price,
    });

    const hasOnlyOneIngredient = typeof ingredients === "string";

    let ingredientsInsert;

    if (hasOnlyOneIngredient) {
      ingredientsInsert = {
        dish_id,
        name: ingredients,
      };
    } else if (ingredients.length > 1) {
      ingredientsInsert = ingredients.map((name) => {
        return {
          dish_id,
          name,
        };
      });
    }

    await knex("ingredients").insert(ingredientsInsert);

    return res.status(201).json();
  }

  async update(req, res) {
    const { dish_id } = req.params;
    const { name, description, category, price, ingredients, image } = req.body;
    const imageFileName = req.file.filename;
    const diskStorage = new DiskStorage();

    const dish = await knex("dishes").where({ id: dish_id }).first();

    if (dish.image) {
      await diskStorage.deleteFile(dish.image);
    }

    const filename = await diskStorage.saveFile(imageFileName);

    dish.image = image ?? filename;
    dish.name = name ?? dish.name;
    dish.description = description ?? dish.description;
    dish.category = category ?? dish.category;
    dish.price = price ?? dish.price;

    await knex("dishes").where({ id: dish_id }).update(dish);

    const hasOnlyOneIngredient = typeof ingredients === "string";

    let ingredientsInsert;

    if (hasOnlyOneIngredient) {
      ingredientsInsert = {
        dish_id,
        name: ingredients,
      };
    } else if (ingredients.length > 1) {
      ingredientsInsert = ingredients.map((name) => {
        return {
          dish_id,
          name,
        };
      });
    }

    await knex("ingredients").where({ dish_id }).delete();
    await knex("ingredients").where({ dish_id }).insert(ingredientsInsert);
    return res.status(202).json(dish);
  }

  async show(req, res) {
    const { id } = req.params;
    const dish = await knex("dishes").where({ id }).first();
    const ingredients = await knex("ingredients")
      .where({ dish_id: id })
      .orderBy("name");

    return res.status(201).json({ ...dish, ingredients });
  }

  async index(req, res) {
    const { name, ingredients } = req.query;
    let dishes;

    if (ingredients) {
      const filterIngredients = ingredients
        .split(",")
        .map((ingredient) => ingredient.trim());

      dishes = await knex("ingredients")
        .select([
          "dishes.id",
          "dishes.name",
          "dishes.description",
          "dishes.category",
          "dishes.price",
        ])
        .whereLike("dishes.name", `%${name}%`)
        .whereIn("name", filterIngredients)
        .innerJoin("dishes", "dishes.id", "ingredients.dish_id")
        .groupBy("dishes.id")
        .orderBy("dishes.name");
    } else {
      dishes = await knex("dishes")
        .whereLike("name", `%${name}%`)
        .orderBy("name");
    }

    const dishesIngredients = await knex("ingredients");
    const dishesWithIngredients = dishes.map((dish) => {
      const dishIngredient = dishesIngredients.filter(
        (ingredient) => ingredient.dish_id === dish.id
      );

      return {
        ...dish,
        ingredients: dishIngredient,
      };
    });

    return res.status(200).json(dishesWithIngredients);
  }

  async delete(req, res) {
    const { id } = req.params;
    const dish = await knex("dishes").where({ id }).first();

    await diskStorage.deleteFile(dish.image);
    await knex("dishes").where({ id }).delete();
    res.status(202).json();
  }
}

module.exports = DishesController;
