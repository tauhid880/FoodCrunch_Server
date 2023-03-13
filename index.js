const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ezb7aqf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const jwtVerify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized user" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden user" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const serviceCollection = client.db("Project").collection("services");
    const reviewCollection = client.db("Project").collection("reviews");
    const blogCollection = client.db("Project").collection("blog");

    // get jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN, { expiresIn: "24h" });
      res.send({ token });
    });

    // services api start
    app.get("/services", async (req, res) => {
      const productSize = parseInt(req.query.productSize);
      const pageSize = parseInt(req.query.pageSize);
      const size = parseInt(req.query.size);
      let result = [];
      if (size) {
        result = await serviceCollection
          .find()
          .sort({ _id: -1 })
          .limit(size)
          .toArray();
      } else {
        result = await serviceCollection
          .find({})
          .skip(pageSize * productSize)
          .limit(productSize)
          .toArray();
      }
      console.log(result);
      const count = await serviceCollection.count();
      res.send({
        count: count,
        status: true,
        data: result,
      });
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const result = await serviceCollection.findOne({ _id: ObjectId(id) });
      res.send({
        status: true,
        data: result,
      });
    });

    // add a service
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // review api start
    app.get("/reviews", async (req, res) => {
      const id = req.query.serviceId;
      const query = { serviceId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send({
        status: true,
        data: result,
      });
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // get my reviews
    app.get("/myreviews", jwtVerify, async (req, res) => {
      const decoded = req.decoded.email;
      const emailAdd = req.query.email;
      if (decoded !== emailAdd) {
        return res.status(403).send({ message: "Forbidden user" });
      }
      const query = { email: emailAdd };
      const result = await reviewCollection.find(query).toArray();

      res.send({
        status: true,
        data: result,
      });
    });

    app.delete("/myreviews/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/myreviews/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const reviews = req.body;

      const filter = { _id: ObjectId(id) };
      const updateReview = {
        $set: reviews,
      };
      const result = await reviewCollection.updateOne(filter, updateReview);
      res.send(result);
    });

    // get blog data
    app.get("/blog", async (req, res) => {
      const result = await blogCollection.find({}).toArray();
      res.send({
        status: true,
        data: result,
      });
    });
  } finally {
  }
}
run().catch((error) => console.error(error));

app.listen(port, () => {
  console.log(`Project server is running on ${port}`);
});
