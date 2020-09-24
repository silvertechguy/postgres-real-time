const express = require("express");
const cors = require("cors");
const pg = require("pg");
const events = require("events");
const eventEmitter = new events.EventEmitter();

const db = new pg.Pool({
  connectionString: "postgres://postgres:123456@localhost:5432/movies",
});

const app = express();
app.use(express.json());
app.use(cors());

app.get("/movies", async (req, res) => {
  const movies = await db.query("SELECT * FROM movies");
  res.status(200).json({ movies: movies.rows });
});

app.post("/movies", async (req, res) => {
  const movies = await db.query(
    "INSERT INTO movies (title) VALUES ($1) RETURNING id, title",
    [req.body.title]
  );
  res.status(201).json({ movies: movies.rows });

});

app.delete("/movies/:id", async (req, res) => {
  const movies = await db.query(
    "DELETE FROM movies WHERE id = $1 RETURNING id, title",
    [req.params.id]
  );
  res.status(200).json({ movies: movies.rows });
});

const server = app.listen(8080, () => console.log(`Server is up on 8080`));

db.connect((err, client) => {
  if (err) return console.log(err);

  client.on("notification", (msg) => {
    eventEmitter.emit("movies", {
      channel: msg.channel,
      payload: JSON.parse(msg.payload),
    });
  });

  Promise.all([
    client.query("LISTEN insert_movies"),
    client.query("LISTEN delete_movies"),
  ]);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  eventEmitter.on("movies", (data) => {
    switch (data.channel) {
      case "insert_movies":
        socket.emit("insert_movies", data.payload);
        break;

      case "delete_movies":
        socket.emit("delete_movies", data.payload);
        break;

      default:
        break;
    }
  });
});
