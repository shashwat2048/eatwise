import jwt from "jsonwebtoken";

type payload = {
    id: string;
}

export function signToken(payload: payload){
    try{
        const token = jwt.sign(payload, process.env.JWT_SECRET as string);
        return token;   
    }catch(err){
        console.error(err);
        return null;
    }
}

export function verifyToken(token: string){
    try{
        const data = jwt.verify(token, process.env.JWT_SECRET as string);
        return data as payload;
    }
    catch(err){
        console.error(err);
        return null;
    }
}
