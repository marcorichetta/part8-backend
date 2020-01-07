const User = require('../../models/user')
const { UserInputError } = require('apollo-server')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JSON_SECRET_KEY

const userResolvers = {
    Query: {
        me: (root, args, context) => {
            return context.currentUser
        },
    },
    Mutation: {
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
            if (!user || args.password !== 'secret') {
                throw new UserInputError('Wrong credentials')
            }

            // Use these credentials for crafting the token
            const credentialsForToken = {
                username: user.username,
                id: user._id
            }

            // Send it to the user
            return { value: jwt.sign(credentialsForToken, JWT_SECRET) }
        }
    }
}

module.exports = {
    userResolvers
}