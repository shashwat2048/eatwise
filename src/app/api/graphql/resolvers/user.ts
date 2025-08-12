import { getUserFromCookies } from "@/lib/helper";
import { signToken } from "@/services/jwt";
import db from "@/services/prisma"
import { cookies } from "next/headers";

export async function loginUser(_:any, args:{
    email: string,
    password: string
}){
    try{
        const {email, password} = args;
        const user = await db.user.findUnique({
            where:{
                email
            }
        })
        if(!user){
            return {
                success: false,
                message: "User not found"
            };
        }
        if(user?.password !== password){
            return {
                success: false,
                message: "Invalid password or username"
            };
        }
        const token = signToken({id: user.id});
        if(!token){
            return {
                success: false,
                message: "Failed to create token"
            };
        }
        const cookieStore = await cookies();
        cookieStore.set("token", token);
        return {
            success: true,
            message: "Login successful"
        };
    }catch(err){
        console.error(err);
        return {
            success: false,
            message: "Failed to login"
        };
    }
}

export async function getUser(_:any, args:{
    id:string
}){
    try{
        const {id} = args;
        const user = await db.user.findUnique({
            where:{
                id
            }
        })
        if(!user){
            return null;
        }
        return user;
    }catch(err){
        console.error(err);
        return null;
    }
}


export async function signupUser(_:any, args:{
    email: string,
    name: string,
    password: string,
}){
    try{
        const user = await db.user.create({
            data: args
        })
        if(!user){
            return {
                success: false,
                message: "Failed to create user"
            };
        }
        return {
            success: true,
            message: "User created successfully"
        };
    }catch(err){
        console.error(err);
        return {
            success: false,
            message: "Failed to create user"
        };
    }
}
export async function updateUser(_:any, args:{
    id: string,
    name: string,
    avatar: string,
    fitnessGoal: string,
    allergies: string[]
}){
    try{
        // const {id, name, avatar, fitnessGoal, allergies} = args;
        const user = await db.user.update({
            where:{
                id: args.id
            },
            data: args
        })
    }catch(err){
        console.error(err);
        return {
            success: false,
            message: "Failed to update user"
        };
    }
}
export async function deleteUser(_:any, args:{
    id: string
}){
    try{
        const {id} = args;
        const currentUser = await getUserFromCookies();
        if(currentUser?.id !== id){
            return {
                success: false,
                message: "invalid action"
            };
        }
        await db.user.delete({
            where:{
                id
            }
        })
        return {
            success: true,
            message: "User deleted successfully"
        };
    }catch(err){
        console.error(err);
        return {
            success: false,
        }
    }
}