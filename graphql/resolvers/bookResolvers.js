const Book = require('../../models/book')
const Author = require('../../models/author')
const { AuthenticationError, UserInputError } = require('apollo-server')
const { PubSub } = require('apollo-server')

// Object used to publish-subscribe
const pubsub = new PubSub()

const bookResolvers = {
    Query: {
        bookCount: () => Book.collection.coun,
        allBooks: async (root, args) => {

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
        }
    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
        }
    }
}

module.exports = {
    bookResolvers
}