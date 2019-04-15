import { KRestContext } from "../interface";
import 'reflect-metadata';
export async function REST_PUT(ctx:KRestContext, _id:string, representation?:string) {
	let KAEN = ctx.state.KAENREST;
	if (!KAEN) return;
	const {deserialize, Collection, Model} = KAEN;
	let attr = Reflect.getMetadata('vault-orm:design', Model);
	//@ts-ignore
	let data = deserialize(ctx.params.body, ctx.req.method as HTTPVerbs, Model.name, attr);
	//@ts-ignore
	if ( await new Model(data).save() ) {
		ctx.status = 204;
	} else {
		ctx.status = 500;
	}
}