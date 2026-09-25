import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get("/doctors", async (req, res) => {
  const { data, error } = await supabase.from("doctors").select("*");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});


app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
