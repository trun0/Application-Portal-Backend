dotenv.config();
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import * as routes from "./routes.js";
import path from "path";
const __dirname = path.resolve();

const app = express();
const PORT = process.env.PORT || 8000;

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (request, file, cb) => {
        if (file.mimetype == "application/pdf") {
            cb(null, true);
        } else {
            request.body.dontAcceptFile = true;
            cb(null, false);
            // console.log(req.body)
            // return cb(new Error('Only pdf format allowed!'));
        }
    },
});

//middlewares

app.use(cors());
app.use(express.json());

//ROUTES

app.post("/adminServer", routes.adminLogin);

app.post("/signupServer", routes.userSignup);

app.post("/loginServer", routes.userLogin);

app.get("/userServer/:id", routes.getUser);

app.post("/userServer/:id", upload.single("resume"), routes.addUser);

app.put("/userServer/:id", upload.single("resume"), routes.updateUserResume);

app.get("/applicationsServer/:cas", routes.getApplications);

app.put("/applicationsServer/:id", routes.updateApplicationStatus);

if (process.env.NODE_ENV === "production") {
    app.use(express.static("client/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
}

app.listen(PORT, () => {
    console.log("Server running on PORT " + PORT);
});
