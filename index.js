const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

const mySecret = process.env["MONGO_URI"];

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

const exercisesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model("Exercise", exercisesSchema);

// Routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username,
  });

  try {
    const user = await userObj.save();
    console.log(user);
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("_id username");
    if (!users) {
      res.send("No users");
    } else {
      res.json(users);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });
      const exercise = await exerciseObj.save();
      res.json({
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
        _id: user._id,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("There was an error saving the exercise");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const id = req.params._id;
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
      return;
    }

    let dateObj = {};
    if (from) {
      dateObj["$gte"] = new Date(from);
    }
    if (to) {
      dateObj["$lte"] = new Date(to);
    }

    let filter = {
      user_id: id,
    };

    if (from || to) {
      filter.date = dateObj;
    }

    const exercises = await Exercise.find(filter).limit(limit ? +limit : 500);

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server Error");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
