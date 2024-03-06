require("express-async-errors");
require("dotenv/config");
const AppError = require("./utils/AppError");
const express = require("express");
const sqliteConnection = require("./database/sqlite");
const routes = require("./routes/");
const uploadConfig = require("./configs/upload");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/files", express.static(uploadConfig.UPLOADS_FOLDER));
app.use(routes);
sqliteConnection();

app.use((error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: "error",
      statusCode: error.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
});

const PORT = process.env.PORT;

app.listen(PORT, () => console.log(`server is running in PORT: ${PORT}`));
