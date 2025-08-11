import { GraphQLClient } from "graphql-request";

const gqlClient = new GraphQLClient(process.env.GQL_URL as string);

export default gqlClient;