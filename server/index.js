import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get("/email", async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ email: data.email });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
