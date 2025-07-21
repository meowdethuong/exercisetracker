require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const User = require('./models/user');
const Exercise = require('./models/exercise');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set('bufferCommands', false);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const savedUser = await user.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.status(404).send('User not found');

  const { description, duration, date } = req.body;
  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  });

  const savedExercise = await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString()
  });
});

// GET /api/users/:_id/logs

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.status(404).send('User not found');

  let filter = { userId: user._id };
  let dateFilter = {};
  if (from) dateFilter["$gte"] = new Date(from);
  if (to) dateFilter["$lte"] = new Date(to);
  if (from || to) filter.date = dateFilter;

  let query = Exercise.find(filter).select('description duration date');
  if (limit) query = query.limit(parseInt(limit));

  const exercises = await query.exec();

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }))
  });
});


// START SERVER
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('App is listening on port ' + listener.address().port);
});
