import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { headers } from "next/headers";
import { User } from "../../generated/prisma";
import { auth } from "@clerk/nextjs/server";


const GET_ME = gql`
query Me {
  me {
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
        const a: any = await auth();
        const userId = a?.userId;
        if(!userId){
            // Not signed in; don't call GraphQL (would redirect HTML)
            return null;
        }
        // Avoid SSR call to /api/graphql to prevent redirect HTML; just return a minimal user
        return { id: userId } as unknown as User;
    }catch(err){
        console.error(err);
        return null;
    }
}