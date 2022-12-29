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

        if (sortby === "createdTime") {
            const users = await collection.find({}).sort({ createdTime: -1 }).toArray();
            ctx.body = users;
        } else if (sortby === "lastModified") {
            const users = await collection.find({ lastModified: { $exists: true } }).sort({ lastModified: -1 }).toArray();
            ctx.body = users;

        } else if (sortby === "specificName") {
            const name = ctx.request.body.name;
            const users = await collection.find({ name: name }).toArray();
            ctx.body = users;
        }


        if (role != "regular" && role != "admin" && role != "superAdmin" && sortby === undefined && role === undefined) {
            ctx.body = " No such identity, please re-enter.... ";
        } else if (role === "regular" || role === "admin" || role === "superAdmin") {
            const users = await collection.find({ role: role }).toArray();
            ctx.body = users;
        }

        if (sortby === undefined && role === undefined) {
            const users = await collection.find({}).toArray();
            ctx.body = users;
        }


    },
    async register(ctx: Koa.Context) {
        try {
            const name = ctx.request.body.name;
            const studentId = ctx.request.body.studentId;
            const email = ctx.request.body.email;
            const password = ctx.request.body.password;
            const phone = ctx.request.body.phone;
            const user = await userManager.register(name, studentId, email, password, phone);
            ctx.body = user;
        } catch (e) {
            APIUtils.handleError(ctx, e);
        }
    },

    async editUsers(ctx: Koa.Context) {

        const name = ctx.request.body.name;
        const phone = ctx.request.body.phone;
        const email = ctx.request.body.email;
        const oldPassword = ctx.request.body.oldPassword;
        const newPassword = ctx.request.body.newPassword;

        const userId = ctx.state.user;
        ctx.request.body.lastModified = new Date();
        const lastModified = ctx.request.body.lastModified;
        const collection = await database.getCollection("users");
        const objectId = require('mongodb').ObjectId;


        if ((await collection.find({ _id: objectId(userId) }).toArray()).length != 0) {

            if (name != undefined) {
                await collection.updateOne({ _id: objectId(userId) }, {
                    $set: {
                        name: name,
                        lastModified: lastModified,
                    },
                });
            }
            if (email != undefined) {
                await collection.updateOne({ _id: objectId(userId) }, {
                    $set: {
                        email: email,
                        lastModified: lastModified,
                    },
                });
            }
            if (phone != undefined) {
                await collection.updateOne({ _id: objectId(userId) }, {
                    $set: {
                        phone: phone,
                        lastModified: lastModified,
                    },
                });
            }

            ctx.body = await collection.find({ _id: objectId(userId) }).toArray();
        }


        if ((newPassword != undefined && oldPassword === undefined) || (newPassword === undefined && oldPassword != undefined)) {
            ctx.body = "you didn't offer enough information to change your password";
        } else if (newPassword != undefined && oldPassword != undefined) {

            //hash newPassword 
            const hashPwd = hashMethod.createHash('sha256')
                .update(newPassword)
                .digest('hex');

            //hash oldPassword 
            const hashOldPwd = hashMethod.createHash('sha256')
                .update(oldPassword)
                .digest('hex');

            if ((await collection.find({ password: hashOldPwd, _id: objectId(userId) }).toArray()).length === 0) {
                ctx.body = "your old password is incorrect, please try again";
            } else {
                await collection.updateOne({ _id: objectId(userId) }, {
                    $set: {
                        password: hashPwd,
                        lastModified: lastModified,
                    },
                });
                ctx.body = await collection.find({ _id: objectId(userId) }).toArray();
            }
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