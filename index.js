require('dotenv').config()
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { ApolloServer, UserInputError, AuthenticationError, gql } = require('apollo-server')
const { PubSub } = require('apollo-server')

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

// Object used to publish-subscribe
const pubsub = new PubSub()

// Mongoose flag
mongoose.set('useFindAndModify', false)

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

const typeDefs = gql`

    type User {
        username: String!
        favoriteGenre: String!
        id: ID!
    }

    type Token {
        value: String!
    }

    type Author {
        name: String!
        id: ID!
        born: Int
        bookCount: Int!
    }

    type Book {
        title: String!
        published: Int!
        author: Author!
        genres: [String!]
        id: ID!
    }

    type Query {
        bookCount: Int!
        authorCount: Int!
        allBooks(author: String, genre: String): [Book!]!
        allAuthors: [Author!]!
        me: User
    }

    type Mutation {
        addBook(
            title: String!
            published: Int!
            author: String
            genres: [String]
        ): Book
        editAuthor(
            name: String!
            setBornTo: Int!
        ): Author
        createUser(
            username: String!
            password: String!
            favoriteGenre: String!
        ): User
        login(
            username: String!
            password: String!
        ): Token
    }

    type Subscription {
        bookAdded: Book!
    }
`

const resolvers = {
    Query: {
        me: (root, args, context) => {
            return context.currentUser
        },
        bookCount: () => Book.collection.countDocuments(),
        authorCount: () => Author.collection.countDocuments(),
        allBooks: async (root, args) => {

            const byGenre = (book) =>
                book.genres.includes(args.genre)

            const byAuthor = (book) =>
                book.author === args.author

            // All books
            if (!args.genre && !args.author) {
                // USE POPULATE TO FILL THE RELATED FIELDS OF THE BOOK
                let allBooks = await Book.find({}).populate('author')

                return allBooks
            }

            // Filter by genre
            if (args.genre) {

                let booksByGenre = await Book
                    .find({ genres: { $in: [args.genre] } })
                    .populate('author')

                return booksByGenre
            }

            /* // Filter by genre AND author
            if (args.genre && args.author) {
                return books.filter(byGenre).filter(byAuthor)
            }

            // By genre, else by author
             else {
                return books.filter(byAuthor)
            } */
        },
        allAuthors: async () => {

            let authors = await Author.find({})


            // Calculate the book count for each author
            const authorsPromises = authors.map(async a => {

                // Encontrar los libros en los que el campo author sea === a.id
                const authorBooks = await Book.find({ author: { $in: a.id } })

                // Modify the book count for each author
                a.bookCount = authorBooks.length
            })

            /* 
                Cada map crea su propia operación async
                AllAuthors no espera a que terminen de ejecutarse
            */

            // Esperar a que se complete CADA promesa en authorsPromises
            await Promise.all(authorsPromises)

            return authors
        }
    },
    Mutation: {
        addBook: async (root, args, context) => {

            // Get the current logged user
            const currentUser = context.currentUser

            if (!currentUser) {
                throw new AuthenticationError("Not authenticated")
            }

            // Buscar el autor
            let author = await Author.findOne({ name: args.author })

            // Si el autor no existe lo creamos y guardamos
            if (!author) {
                author = new Author({
                    name: args.author,
                    bookCount: 1
                })
            }

            // Crear el libro con el autor encontrado o creado
            const newBook = new Book({
                ...args,
                author: author
            })

            try {
                // Guardamos en el backend
                // 1ro el author por 
                await author.save()
                await newBook.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }

            // Publish a notification with the added book
            pubsub.publish('BOOK_ADDED', { bookAdded: newBook })

            return newBook
        },
        editAuthor: async (root, args, context) => {

            const currentUser = context.currentUser

            if (!currentUser) {
                throw new AuthenticationError("Not authenticated")
            }

            // Encontrar al autor
            const author = await Author.findOne({ name: args.name })

            if (!author) {
                return null
            }

            // Update the author data
            author.born = args.setBornTo

            // Replace it in the list
            try {
                await author.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }

            return author
        },
        createUser: async (root, args) => {
            const user = new User({ 
                username: args.username,
                favoriteGenre: args.favoriteGenre
            })

            try {
                return user.save()
            }
            catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            // Fixed password "secret"
            if ( !user || args.password !== 'secret' ) {
                throw new UserInputError('Wrong credentials')
            }

            // Use these credentials for crafting the token
            const credentialsForToken = {
                username: user.username,
                id : user._id
            }

            // Send it to the user
            return { value: jwt.sign(credentialsForToken, JWT_SECRET) }
        }
    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
        }
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
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