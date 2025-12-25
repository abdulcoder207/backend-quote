const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const PORT = process.env.PORT || 3000

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
)

const app = express()
app.use(express.json())
app.use(cors())

const SECRET = process.env.JWT_SECRET

app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    const { data, error } = await supabase
        .from("users")
        .insert([{ username, email, password }])
        .select()
        .single();

    if (error) {
        return res.status(400).json(error);
    }

    const token = jwt.sign(
        { id: data.id, username: data.username },
        SECRET,
        { expiresIn: "1h" }
    )

    res.json({
        message: "register berhasil",
        token: token
    });
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;


    const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

    // if (username !== "admin" || password !== "123"){
    //     return res.status(401).json({message:"login gagal"})
    // }

    // // data yang disimpan di jwt
    // const payload = {
    //     username: username
    // };

    if (!user || user.password !== password) {
        return res.status(401).json({ message: "login gagal" })
    }

    console.log("login body:", req.body)
    console.log("user db:", user)
    // buat jwt
    const token = jwt.sign(
        {
            id: user.id, username: user.username
        }, SECRET,
        { expiresIn: "1h" }
    );

    res.json({
        message: "login berhasil",
        token: token
    })
})

function auth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "token tidak ada" })
    }

    const token = authHeader.split(" ")[1];

    try {
        const decode = jwt.verify(token, SECRET);
        req.user = decode;//simpan data user
        next()
    } catch {
        return res.status(403).json({ message: "token tidak valid" })
    }
}

// app.get("/dashboard", auth, (req, res) => {
//     res.json({
//         message: "selamat datang",
//         user: req.user
//     })
// })

app.get("/quotes", async (req, res) => {
    const { data, error } = await supabase
        .from("quotes")
        .select(`content, created_at, users(username)`)
        .order("created_at", { ascending: false })

    if (error) {
        console.log("SUPABASE ERROR: ", error)
        return res.status(500).json({ message: error.message })
    }

    res.json(data)
})

app.post("/quotes", auth, async (req, res) => {
    const { content } = req.body;

    const { error } = await supabase
        .from("quotes")
        .insert([{
            content,
            user_id: req.user.id
        }])
    if (error) {
        return res.status(400).json(error)
    }

    res.json({ message: "quote diupload" })
})

app.put("/quotes/:id", auth, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const { error } = await supabase
        .from("quotes")
        .update({ content })
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
        return res.status(400).json({ message: error.message })
    }

    res.json({ message: "berhasil di update" })
})

app.delete("/quotes/:id", auth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
        return res.status(400).json({ message: error.message })
    }

    res.json({ message: "quote dihapus" })
})

app.get("/my-quotes", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("quotes")
        .select("id, content, created_at")
        .eq("user_id", req.user.id)
        .order("created_at", {ascending: false})

    if (error) {
        return res.status(500).json({ message: error.message });
    }

    res.json(data);
});

app.get("/me", auth, (req, res) => {
    res.json({
        username: req.user.username
    });
});

app.listen(PORT, () => {
    // console.log(`http://localhost:3000`);
    console.log("Server running on port ", PORT)
})