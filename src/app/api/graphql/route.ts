import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { NextRequest } from "next/server";
import { gql } from "graphql-tag";
import { deleteUser, getUser, loginUser, signupUser, updateUser } from "./resolvers/user";

const typeDefs = gql`
  type Query {
    loginUser(email: String!, password: String!): Response
    getUser(id: String!): User
  }
  type Mutation {
    signupUser(email: String!, name: String!, password: String!): Response
    updateUser(id: String!, name: String, avatar: String, fitnessGoal: String, allergies: [String]): Response
    deleteUser(id: String!): Response
  }
  type Response {
    success: Boolean
    message: String
  }
  type User {
    id: String
    name: String
    email: String
    avatar: String
    fitnessGoal: String
    allergies: [String]
  }
`;

const resolvers = {
  Query: {
    loginUser: loginUser,
    getUser: getUser,
  },
  Mutation: {
    signupUser: signupUser,
    updateUser: updateUser,
    deleteUser: deleteUser,
  },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Typescript: req has the type NextRequest
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
    context: async req => ({ req }),
});

export { handler as GET, handler as POST };