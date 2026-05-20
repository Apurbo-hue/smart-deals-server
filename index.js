const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 3000;


//middleware
app.use(cors());
app.use(express.json());


// uri
const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.jhmuzak.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// run function
async function run() {
    try {
        await client.connect();

        const db = client.db("smart_db");
        const productsCollection = db.collection("products");
        const bidsCollection = db.collection("bids");
        const usersCollection = db.collection("users");

        //user related api

        //get the users
        app.get("/users", async (req, res) => {
            const cursor = usersCollection.find();
            const users = await cursor.toArray();
            res.send(users);
        })

        //insert new user
        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email:email };
            const checkUser = await usersCollection.findOne(query);
            if (checkUser) {
                res.send({ message: "User already exist, user wasn't inserted" })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);              
            }
        })


        //products related api

        //get the data from the mongoDB
        app.get("/products", async (req, res) => {


            //get the data by the query email
            const email = req.query.email;

            const query = {};
            if (email) {
                query.email = email;
            }

            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        //get the latest products
        app.get("/latest-products", async (req, res) => {
            const cursor = productsCollection.find().sort({created_at:1});
            const result = await cursor.toArray();
            res.send(result);

        })

        //get the specific data by id from the mongoDB
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: id};
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        // insert the data to the mongoDB
        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        })

        //delete the data from the mongoDB
        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        //update(patch) to the mongoDB
        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateInfo = req.body;
            const update = {
                $set: updateInfo
            }
            const options = {};
            const result = await productsCollection.updateOne(query, update, options)
            res.send(result);
        })

        //bids related api

        //get the bids from the mongoDB
        app.get("/bids", async (req, res) => {

            const email = req.query.buyer_email;
            const query = {};
            if (email) {
                query.buyer_email = email
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        //get the bids by the product
        app.get("/products/bids/:productId", async (req, res) => {
            const id = req.params.productId;
            const query = { product : id };
            const cursor = bidsCollection.find(query).sort({bid_price:-1});
            const result = await cursor.toArray();
            res.send(result);
        })

        //post the bids to the mongoDB
        app.post("/bids", async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        })

        //delete the bid from the mongoDB by the product
        app.delete("/bids/:id", async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("connected to the mongoDB");
    }
    finally {

    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello World");
})

app.listen(port, () => {
    console.log(`the site is live on the port${port}`)
})