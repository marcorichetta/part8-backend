# [Part 8 | Fullstack course](https://fullstackopen.com/en/part8/graph_ql_server)
## GraphQL Backend

The frontend is [here](https://github.com/marcorichetta/part8-frontend)

- The library system allows users to add books
- The documents (Authors, Books and Users) are hosted in a MongoDB Cluster at https://cloud.mongodb.com
- To run on your machine, 
    1. `git clone`
    2. Create a `.env` file on the root of the project with these env variables:
        1. `JSON_SECRET_KEY`= String used to sign JWT tokens
        2. `GRAPHQL_PROD_MONGODB_URI`= Your MongoDB URI (First create an account on the link above)
    3. `yarn install`
    4. `yarn watch`

## Contents

### [Schemas](https://www.apollographql.com/docs/apollo-server/getting-started/#step-3-define-your-graphql-schema)
- Describe the structure of the data clients can query
- Describe the fields type
```js
type Author {
        name: String!
        id: ID!
        born: Int
        bookCount: Int!
    }
```

### [Queries](https://www.apollographql.com/docs/react/data/queries/) - Fetch data
- Describe the structure of the query itself
- Example: Query named `allAuthors` returns an array of `Author` objects
```js
// Schema Definition
type Query {
    allAuthors: [Author!]!
}

// This query returns the name and the born year for every Author
query {
  allAuthors {
    name
    born
  }
}
```

### [Resolvers](https://www.apollographql.com/docs/apollo-server/data/data/#resolver-map)
- Defines **how** GraphQL queries are responded
- If you don't define resolvers for all the fields, GraphQL will use a default one
- Example: When the client queries `allAuthors`, the resolver will return all authors  
```js
const resolvers = {
  Query: {
      allAuthors: () => authors,
  }
}
```

### [Mutations](https://www.apollographql.com/docs/react/data/mutations/) - Update data
- Describe the operations allowed to create or update data on the server
- Also describe the values returned after the mutation is completed
- Mutations also require a resolver
- Example: `createUser` has 3 not-null parameters of type *String* and returns an object of type **User**
```js
// Schema Definition
type Mutation {
    createUser(
        username: String!
        password: String!
        favoriteGenre: String!
    ) User
}

// Simplified resolver
const resolvers = {
  // ...
  Mutation: {
    createUser: (root, args) => {
      const newUser = { ...args, id: uuid() }
      users = users.concat(user)
      return user
    }
  }
}

// Create a user with the values given and return the username and favoriteGenre only
mutation {
  createUser(
    username: "Marco"
    password: "secret"
    favoriteGenre: "Fiction"
  ) {
    username
    favoriteGenre
  }
}
```

### [Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions/) - Realtime data with Websockets
- Subscriptions are a way to push data from the server to the **clients that choose to listen** to real time messages from the server
- On the server the subscription must be added to the schema 

```js
// Schema Definition
type Subscription {
    bookAdded: Book!
}

const resolvers = {

    // addBook resolver must be modified to send a notification to subscribers
    Mutation: {
        addBook: {
            //...
        
            pubsub.publish('BOOK_ADDED', { bookAdded: newBook })
            return newBook
        }
    },  

    // 
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
        },
    },
}
```