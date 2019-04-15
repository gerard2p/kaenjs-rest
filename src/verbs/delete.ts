import { KRestContext } from "../interface";
import 'reflect-metadata';

export async function REST_DELETE(ctx:KRestContext, _id:string) {
	let KAEN = ctx.state.KAENREST;
	if (!KAEN) return;
	const {Collection} = KAEN;
	let record = await Collection.findOne(_id);
	if(record) {
		let res = await record.delete();
		if(res) {
			ctx.status = 204;
		} else {
			ctx.status = 500;
		}
	} else {
		ctx.status = 404;
	}
}