const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const admin = require("firebase-admin");

const serviceAccount = require("./smart-deals-firebase-admins.json");

const port = process.env.PORT || 3000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
    console.log("This is the logger functions");
    next();
}


//verify firebase token 
const verifyFireBaseToken = async (req, res, next) => {

    //check if there is authorization in the headers
    if (!req.headers.authorization) {
        console.log('No authorization found');
        return res.status(401).send({ message: "Unauthorized Access" });
    }

    //getting the token inside of the authorization
    const token = req.headers.authorization.split(" ")[1];

    //check if there is token in the headers
    if (!token) {
        console.log('No token found');
        return res.status(401).send({ message: "Unauthorized access" });
    }

    // if token is found then verify the token 
    try {
        const userInfo = await admin.auth().verifyIdToken(token)
        req.token_email = userInfo.email;
        console.log(userInfo)
        next();
    }
    catch {
        return res.status(401).send({ message: "Unauthorzed access" });
    }

}

//verify custom jwt token
// const verifyJWTToken = (req, res, next) => {
//     if (!req.headers.authorization) {
//         return res.status(401).send({ message: "Unauthorized access" });
//     }
//     const token = req.headers.authorization.split(" ")[1];
//     if (!token) {
//         return res.status(401).send({ message: "Unauthorized Access" });
//     }
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//         if (err) {
//             return res.status(403).send({ message: "Access Denied" });
//         }
//         console.log(decoded)
//         next();
//     })
//  }



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
        console.log("mongodb connected")

        const db = client.db("smart_db");
        const productsCollection = db.collection("products");
        const bidsCollection = db.collection("bids");
        const usersCollection = db.collection("users");

        //jwt related api
        // app.post("/getToken", (req, res) => {
        //     const loggedUser = req.body;
        //     const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '7d' })
        //     res.send({ token });
        //     console.log("token", token)
        // })

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
            const query = { email: email };
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
            const cursor = productsCollection.find().sort({ created_at: 1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);

        })

        //get the specific data by id from the mongoDB
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        // insert the data to the mongoDB
        app.post("/products",verifyFireBaseToken, async (req, res) => {
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

        //get the bids from the mongodb with the custom jwt token
        // app.get("/bids",verifyJWTToken, async(req, res) => {
        //     const email = req.query.email;
        //     const query = {}
        //     if (email) {
        //         query.buyer_email = email;
        //     }
        //     const result = await bidsCollection.find(query).toArray();
        //     res.send(result);
        // })


        //get the bids from the mongoDB with the firebase verification
        app.get("/bids", verifyFireBaseToken, async (req, res) => {
            const email = req.query.buyer_email;
            console.log("this is the user email",email);
            const query = {};
            if (email) {
                query.buyer_email = email;
                if (email !== req.token_email) {
                    return res.status(403).send({ message: "Access Denied" });
                }
            }
            const result = await bidsCollection.find(query).toArray();
            res.send(result);
        })

        //get the bids by the product
        // app.get("/products/bids/:productId",logger,verifyFireBaseToken, async (req, res) => {
        //     const id = req.params.productId;
        //     const query = { product: id };
        //     const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        app.get("/products/bids/:productId",async (req, res) => {
            const id = req.params.productId;
            const query = { product: id };
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
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
            const query = { _id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("routes registered");
    }
    catch (err)  {
        console.log(err)
    }
}

run().catch((err) => {
    console.error("Fatal run error ",err)
});

app.get("/", (req, res) => {
    res.send("Hello World");
})

app.listen(port, () => {
    console.log(`the site is live on the port${port}`)
})

