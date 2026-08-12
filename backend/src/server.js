import app from "./app.js";

const port = Number(process.env.PORT || 30000);

app.listen(port, () => {
  console.log(`ForkFlow backend running on http://localhost:${port}`);
});
