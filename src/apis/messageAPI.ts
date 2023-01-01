import * as Koa from 'koa';
import Container from 'typedi';
import database from '../database/mongoDatabase';
import { MessageManager } from '../usecases/messageManager';
import { APIUtils } from './apiUtils';

const messageManager = Container.get(MessageManager);

export default {
    async getMessages (ctx: Koa.Context) {
        const courtName = ctx.request.body.courtName;
        const collection = await database.getCollection('messages');
        //const messages = await collection.find( {courtName : courtName}).project( {  _id: 0, courtName: 0,}).toArray();
        const messages = await collection.find({ courtName : courtName }).toArray();

        ctx.body = messages;
    },

    async createMessages (ctx: Koa.Context) {
        try {
            const userId = APIUtils.getAuthUserId(ctx);
            const courtId = APIUtils.getBodyAsString(ctx, 'courtId');
            const content = APIUtils.getBodyAsString(ctx, 'content');
            const message = await messageManager.addMessage({courtId, userId, content});
            ctx.body = message;
        } catch (e) {
            APIUtils.handleError(ctx, e);
        }
    },
    async editMessages (ctx: Koa.Context) {
        const messageContent = ctx.request.body.messageContent;
        const messageId = ctx.request.body.messageId;
        const collection = await database.getCollection('messages');
        //record lastmodified?????

        if ((await collection.find({ messageId : messageId }).toArray()).length === 0) {
            ctx.body = "Warning : Can't find the message!";
        } else {
            await collection.updateOne({ messageId : messageId },{
                $set: {
                    messageContent : messageContent,
                },
            });
                ctx.body = await collection.find({ messageId : messageId }).toArray();
        }

    },

    async deleteMessages (ctx: Koa.Context) {
        const messageId = ctx.request.body.messageId;
        const collection = await database.getCollection('messages');

        if((await collection.find({ messageId : messageId}).toArray()).length === 0) {
            ctx.body = "Warning:Can't find the message!";
        } else {
            await collection.deleteOne({messageId : messageId});
            ctx.body = "The message has been deleted.";
        }
    } 
}