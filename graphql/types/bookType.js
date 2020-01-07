const bookType = `
    type Book {
        title: String!
        published: Int!
        author: Author!
        genres: [String!]
        id: ID!
    }
`

module.exports = {
    bookType
}