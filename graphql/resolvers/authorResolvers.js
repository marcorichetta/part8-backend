const Author = require('../../models/author')
const Book = require('../../models/book')
const { AuthenticationError, UserInputError } = require('apollo-server')

const authorResolvers = {
    Query: {
        authorCount: () => Author.collection.countDocuments(),
        allAuthors: async () => {

            // Find authors on MongoDB
            let authors = await Author.find({})


            // Calcular bookCount para cada autor
            const authorsPromises = authors.map(async a => {

                // Encontrar los libros en los que el campo author sea === a.id
                const authorBooks = await Book.find({ author: { $in: a.id } })

                // Modificar bookCount para cada autor con la cantidad de libros
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
        }
    }
}

module.exports = {
    authorResolvers
}