import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { NextRequest } from "next/server";
import { gql } from "graphql-tag";
import { getUser, me, updateUser, getProfile, createOrUpdateProfile } from "./resolvers/user";
import { updateUserProfile } from "./resolvers/user";
import { analyzeLabel } from "./resolvers/user";
import { myReports, getReports } from "./resolvers/user";
import { getAuth } from "@clerk/nextjs/server";
import { signToken } from "@/services/jwt";

export const runtime = "nodejs";

const typeDefs = gql`
  type Query {
    me: User
    getUser(clerkId: String!): User
    getProfile: Profile
    getReports(clerkId: String!): [AnalysisReport!]
    myReports: [AnalysisReport!]
  }
  type Mutation {
    updateUser(id: String!, name: String, avatar: String, fitnessGoal: String, allergies: [String]): Response
    createOrUpdateProfile(fitnessGoal: String, allergies: [String]): Response
    updateUserProfile(allergies: [String], fitnessGoal: String): Response
    analyzeLabel(imageBase64: String!): AnalyzeResult
  }
  type Response {
    success: Boolean
    message: String
  }
  type AnalyzeResult {
    imageUrl: String
    ingredients: [String]
    allergens: [String]
    possibleAllergens: [String]
    grade: String
    isAllergic: Boolean
    allergensMatched: [String]
    analysisJson: String
    explanation: String
    saved: Boolean
    reportId: String
  }
  type AnalysisReport {
    id: String
    ingredients: [String]
    allergensFound: [String]
    createdAt: String
    imageUrl: String
    content: String
  }
  type Profile {
    name: String
    fitnessGoal: String
    allergies: [String]
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
    me: me,
    getUser: getUser,
    getProfile: getProfile,
    getReports: getReports,
    myReports: myReports,
  },
  Mutation: {
    updateUser: updateUser,
    createOrUpdateProfile: createOrUpdateProfile,
    updateUserProfile: updateUserProfile,
    analyzeLabel: analyzeLabel,
  },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Typescript: req has the type NextRequest
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
    context: async (req) => ({ req, auth: getAuth(req) }),
});

function setOrClearAuthCookie(req: NextRequest, res: Response) {
  const { userId } = getAuth(req);
  if (userId) {
    const token = signToken({ id: userId });
    if (token) {
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      res.headers.append(
        "Set-Cookie",
        `token=${token}; Path=/; SameSite=Lax${secure}`
      );
    }
  } else {
    res.headers.append(
      "Set-Cookie",
      "token=; Path=/; Max-Age=0"
    );
  }
}

export async function GET(req: NextRequest) {
  const res = await handler(req);
  setOrClearAuthCookie(req, res);
  return res;
}

export async function POST(req: NextRequest) {
  const res = await handler(req);
  setOrClearAuthCookie(req, res);
  return res;
}