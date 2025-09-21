import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { headers } from "next/headers";
import { User } from "../../generated/prisma";
import { auth } from "@clerk/nextjs/server";


const GET_USER = gql`
query GetUser($clerkId: String!) {
  getUser(clerkId: $clerkId) {
    id
    name
    email
    avatar
    fitnessGoal
    allergies
  }
}
`
export async function getUserFromCookies(){
    try{
        const { userId } = await auth();
        if(!userId){
            return null;
        }
        type GetUserResponse = { getUser: User | null };
        const hdrs = await headers();
        const host = hdrs.get("host") || "localhost:3000";
        const proto = hdrs.get("x-forwarded-proto") || "http";
        const endpoint = `${proto}://${host}/api/graphql`;
        const cookie = hdrs.get("cookie") || "";
        const client = new GraphQLClient(endpoint, { headers: { cookie } });
        const result = await client.request<GetUserResponse>(GET_USER, { clerkId: userId })
        return result.getUser ?? null;
    }catch(err){
        console.error(err);
        return null;
    }
}