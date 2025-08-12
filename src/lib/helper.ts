import gqlClient from "@/services/gql";
import { verifyToken } from "@/services/jwt";
import gql from "graphql-tag";
import { cookies } from "next/headers";
import { User } from "../../generated/prisma";


const GET_USER = gql`
query GetUser($id: String!) {
  getUser(id: $id) {
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
        const cookiesStore = await cookies();
        const token = cookiesStore.get("token")?.value;
        if(!token){
            return null;
        }
        const data = verifyToken(token);
        if(!data){
            return null;
        }
        const user : User = await gqlClient.request(GET_USER, {
            id: data.id
        })
        return user;
    }catch(err){
        console.error(err);
        return null;
    }
}