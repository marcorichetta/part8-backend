const { ApolloServer, gql } = require('apollo-server')
const uuid = require('uuid/v1')

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
        author: String!
        id: ID!
        genres: [String!]
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
        bookCount: () => books.length,
        authorCount: () => authors.length,
        allBooks: (root, args) => {

            const byGenre = (book) =>
                book.genres.includes(args.genre)

            const byAuthor = (book) =>
                book.author === args.author

            // All books
            if (!args.genre && !args.author) {
                return books
            }

            // Filter by genre AND author
            if (args.genre && args.author) {
                return books.filter(byGenre).filter(byAuthor)
            }

            // By genre, else by author
            if (args.genre) {
                return books.filter(byGenre)
            } else {
                return books.filter(byAuthor)
            }
        },
        allAuthors: () => {
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
        addBook: (root, args) => {
            console.log('Book', args)
            // Si el autor NO existe
            if (authors.find(a => a.name !== args.author)) {
                // Crear el autor
                const newAuthor = {
                    name: args.author,
                    id: uuid(),
                    bookCount: 1
                }
                // Agregarlo a la lista de autores
                authors = authors.concat(newAuthor)
            }

            // Lo mismo para el libro
            const newBook = { ...args, id: uuid() }

            books = books.concat(newBook)

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
            const updatedAuthor = { ...args, born: args.setBornTo }

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