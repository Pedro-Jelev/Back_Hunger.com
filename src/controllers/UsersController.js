const AppError = require("../utils/AppError");
const sqliteConnection = require("../database/sqlite");
const knex = require("../database/knex");
const { hash, compare } = require("bcryptjs");

class UsersController {
  async create(req, res) {
    const { name, email, password } = req.body;

    const checkUserExists = await knex("users").where({ email }).first();

    if (checkUserExists) {
      throw new AppError("Ops, parece que alguém já está usando este e-mail");
    }

    if (password.length < 6) {
      throw new AppError(
        "Para sua segurança a senha deve ser igual ou maior a 6 caracteres"
      );
    }

    const password_hash = await hash(password, 8);

    await knex("users").insert({
      name,
      email,
      password_hash,
    });

    return res.status(201).json();
  }

  async update(req, res) {
    const { user_id } = req.params;
    const { name, email, password, old_password } = req.body;
    const database = await sqliteConnection();
    const user = await knex("users").where({ id: user_id }).first();

    /*     const user = await database.get("SELECT * FROM users WHERE id = (?)", [
      user_id,
    ]);
 */
    if (!user) {
      throw new AppError("Usuário não encontrado");
    }

    const userWithUpdatedEmail = await database.get(
      "SELECT * FROM users WHERE email = (?)",
      [email]
    );

    if (userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
      throw new AppError("Este e-mail já está em uso");
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;

    if (password && !old_password) {
      throw new AppError(
        "Para atualizar a senha você precisa informar a antiga"
      );
    }

    if (password && old_password) {
      const checkOldPassword = await compare(old_password, user.password_hash);

      if (!checkOldPassword) throw new AppError("A senha antiga não confere");

      user.password_hash = await hash(password, 8);
    }

    await database.run(
      "UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
      [user.name, user.email, user.password_hash, user_id]
    );

    return res.status(202).json(user);
  }
}

module.exports = UsersController;
