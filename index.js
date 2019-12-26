require('dotenv').config()
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { ApolloServer, UserInputError, gql } = require('apollo-server')

const Book = require('./models/book')
const Author = require('./models/author')

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

let authors = [
    {
        name: 'Robert Martin',
        id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
        born: 1952,
    },
    {
        name: 'Martin Fowler',
        id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
        born: 1963
    },
    {
        name: 'Fyodor Dostoevsky',
        id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
        born: 1821
    },
    {
        name: 'Joshua Kerievsky', // birthyear not known
        id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    },
    {
        name: 'Sandi Metz', // birthyear not known
        id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    },
]

/*
 * It would be more sensible to associate book and the author by saving 
 * the author id instead of the name to the book.
 * For simplicity we, however, save the author name.
*/
let books = [
    {
        title: 'Clean Code',
        published: 2008,
        author: 'Robert Martin',
        id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Agile software development',
        published: 2002,
        author: 'Robert Martin',
        id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
        genres: ['agile', 'patterns', 'design']
    },
    {
        title: 'Refactoring, edition 2',
        published: 2018,
        author: 'Martin Fowler',
        id: "afa5de00-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Refactoring to patterns',
        published: 2008,
        author: 'Joshua Kerievsky',
        id: "afa5de01-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'patterns']
    },
    {
        title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
        published: 2012,
        author: 'Sandi Metz',
        id: "afa5de02-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'design']
    },
    {
        title: 'Crime and punishment',
        published: 1866,
        author: 'Fyodor Dostoevsky',
        id: "afa5de03-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'crime']
    },
    {
        title: 'The Demon',
        published: 1872,
        author: 'Fyodor Dostoevsky',
        id: "afa5de04-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'revolution']
    },
]

const typeDefs = gql`

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
    }
`

const resolvers = {
    Query: {
        bookCount: () => Book.collection.countDocuments(),
        authorCount: () => Author.collection.countDocuments(),
        allBooks: async (root, args) => {

            const byGenre = (book) =>
                book.genres.includes(args.genre)

            const byAuthor = (book) =>
                book.author === args.author

            // USE POPULATE TO FILL THE RELATED FIELDS OF THE BOOK
            let books = await Book.find({}).populate('author')

            // All books
            if (!args.genre && !args.author) {
                return books
            }

            /* // Filter by genre AND author
            if (args.genre && args.author) {
                return books.filter(byGenre).filter(byAuthor)
            }

            // By genre, else by author
            if (args.genre) {
                return books.filter(byGenre)
            } else {
                return books.filter(byAuthor)
            } */
        },
        allAuthors: () => {

            return Author.find({})

            // Calculate the book count for each author
            authors.map(a => {
                const authorBooks = books.filter(b => b.author === a.name)
                // Modify the author field
                a.bookCount = authorBooks.length
            })

            return authors
        }
    },
    Mutation: {
        addBook: async (root, args) => {

            // Buscar el autor
            let author = await Author.findOne({ name: args.author })

            // Si el autor no existe lo creamos y guardamos
            if (!author) {

                author = new Author({
                    name: args.author,
                    bookCount: 1
                })

                try {
                    // Guardarlo en el backend
                    await author.save()
                } catch (error) {
                    throw new UserInputError(error.message, {
                        invalidArgs: args
                    })
                }
            } 
            
            // Crear el libro con el autor encontrado o creado
            const newBook = new Book({ 
                ...args,
                author: author
            })

            try {
                // Guardarlo en el backend
                await newBook.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        
    

            return newBook
        },
        editAuthor: (root, args) => {
            console.log('Author', args)
            // Encontrar al autor
            const author = authors.find(a => a.name === args.name)

            if (!author) {
                return null
            }

            // Update the author data
            const updatedAuthor = { ...author, born: args.setBornTo }

            console.log('UPDATE', updatedAuthor)
            // Replace it in the list
            authors = authors.map(a => a.name === args.name ? updatedAuthor : a)

            return updatedAuthor
        }
    },
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
})

server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`)
})