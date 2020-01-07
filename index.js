require('dotenv').config()
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { ApolloServer } = require('apollo-server')

const User = require('./models/user')

const { schema } = require('./graphql/schema')

// Mongoose flag
mongoose.set('useFindAndModify', false)
mongoose.set('useUnifiedTopology', true)

// Get .env variables
let MONGO_PROD_URI = process.env.GRAPHQL_PROD_MONGODB_URI
const JWT_SECRET = process.env.JSON_SECRET_KEY

// Mongoose connection
mongoose.connect(MONGO_PROD_URI, { useNewUrlParser: true })
    .then(() => {
        console.log('Connected to MongoDB')
    })
    .catch((error) => {
        console.log('Error on connection to MongoDB:', error.message)
    })

const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
        // Sets auth with the auth header value or undefined
        const auth = req ? req.headers.authorization : null
        
        // Check for correctness of auth header
        if (auth && auth.toLowerCase().startsWith('bearer ')) {

            // Decode token with jwt_secret
            const decodedToken = jwt.verify(
                auth.substring(7), JWT_SECRET
            )

            // Find the current user with the decoded data id
            const currentUser = await User.findById(decodedToken.id)

            // The object returned by context is given to all resolvers as their 3rd parameter
            return { currentUser }
        }
    }
})

server.listen().then(({ url, subscriptionsUrl }) => {
    console.log(`Server ready at ${url}`)
    console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})