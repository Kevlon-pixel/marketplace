require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const NODE_ENV = process.env.NODE_ENV || "development";
if (NODE_ENV === "development") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Example app listening: http://localhost:${PORT}`);
  });
}
