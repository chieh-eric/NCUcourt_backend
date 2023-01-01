import * as Koa from 'koa';
import Container from 'typedi';
import database from '../database/mongoDatabase';
import { UserManager } from '../usecases/userManager';
import { APIUtils } from './apiUtils';
const hashMethod = require('crypto');

const userManager = Container.get(UserManager);

export default {

    async getUsers(ctx: Koa.Context) {
        
        const sortby = ctx.query.sortby;
        const role = ctx.query.role;
        const collection = await database.getCollection('users');
        const objectId = require('mongodb').ObjectId;
        const userId = ctx.state.user;

        if (sortby === "specificName") {
            const name = ctx.request.body.name;
            const users = await collection.find({ name: name }).toArray();
            ctx.body = users;
        }

        if (role != "regular" && role != "admin" && role != "superAdmin" && sortby === undefined && role === undefined) {
            ctx.body = " No such identity, please re-enter.... ";
        } else if (role === "regular" || role === "admin" || role === "superAdmin") {
            
            if (sortby === "createdTime") {
                const users = await collection.find({ role: role }).sort({ createdTime: -1 }).toArray();
                ctx.body = users;
            } else if (sortby === "lastModified") {
                const users = await collection.find({ lastModified: { $exists: true }, role: role }).sort({ lastModified: -1 }).toArray();
                ctx.body = users;
            }
        }

        if ((sortby === undefined && role === undefined && await collection.find({ _id: objectId(userId) }).toArray()).length != 0) {
            const users = await collection.find({ _id: objectId(userId) }).toArray();
            ctx.body = users;
        }

    },
    async register(ctx: Koa.Context) {
        try {
            const name = APIUtils.getBodyAsString(ctx, 'name');
            const studentId = APIUtils.getBodyAsString(ctx, 'studentId');
            const email = APIUtils.getBodyAsString(ctx, 'email');
            const password = APIUtils.getBodyAsString(ctx, 'password');
            const phone = APIUtils.getBodyAsString(ctx, 'phone');
            const user = await userManager.register(name, studentId, email, password, phone);
            ctx.body = user;
        } catch (e) {
            APIUtils.handleError(ctx, e);
        }
    },

    async editUsers(ctx: Koa.Context) {
        try {
            const id = APIUtils.getAuthUserId(ctx);
            const name = APIUtils.getBodyAsString(ctx, 'name');
            const phone = APIUtils.getBodyAsString(ctx, 'phone');
            const email = APIUtils.getBodyAsString(ctx, 'email');
            const oldPassword = APIUtils.getBodyAsString(ctx, 'oldPassword');
            const newPassword = APIUtils.getBodyAsString(ctx, 'newPassword');
            await userManager.editUser({
                id, name, phone, email, oldPassword, newPassword
            });
            ctx.body = { message: 'update user profile successfully.' };
        } catch (e) {
            APIUtils.handleError(ctx, e);
        }
    },

    // 
    async deleteUsers(ctx: Koa.Context) {
        const userId = ctx.state.user;
        const collection = await database.getCollection("users");
        const objectId = require('mongodb').ObjectId;

        // check if the target exist
        if ((await collection.find({ _id: objectId(userId) }).toArray()).length === 0) {
            ctx.body = "Warning: Can't find the user!";
        } else {
            await collection.deleteOne({ _id: objectId(userId) });
            ctx.body = "The user had been deleted";
        }
    }



}


// HTTP request method
// get 取得資料
// post 新增資料
// put 更新資料
// delete 刪除資料