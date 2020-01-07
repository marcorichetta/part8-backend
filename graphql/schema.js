const { makeExecutableSchema } = require('graphql-tools')

const { authorType } = require('./types/authorType')
const { bookType } = require('./types/bookType')
const { tokenType } = require('./types/tokenType')
const { userType } = require('./types/userType')

const { authorResolvers } = require('./resolvers/authorResolvers')
const { bookResolvers } = require('./resolvers/bookResolvers')
const { userResolvers } = require('./resolvers/userResolvers')

const Query = `
    type Query {
        bookCount: Int!
        authorCount: Int!
        allBooks(author: String, genre: String): [Book!]!
        allAuthors: [Author!]!
        me: User
    }
`

const Mutation = `
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
`


const Subscription = `
    type Subscription {
        bookAdded: Book!
    }
`

const schema = makeExecutableSchema({
    typeDefs: [
        Query,
        Mutation,
        Subscription,
        authorType,
        bookType,
        tokenType,
        userType
    ],
    resolvers: [ userResolvers, bookResolvers, authorResolvers ]
})

module.exports = {
    schema
}