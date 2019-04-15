import { HTTPVerbs } from "@kaenjs/core";
import { StandardRequestHeaders, StandardResponseHeaders } from "@kaenjs/core/headers";
import 'reflect-metadata';
import { KRestContext } from "../interface";
export async function REST_POST(ctx:KRestContext) {
	let KAEN = ctx.state.KAENREST;
	if (!KAEN) return;
	const {deserialize, Collection, Model} = ctx.state.KAENREST;
	let attr = Reflect.getMetadata('vault-orm:design', Model);
	//@ts-ignore
	let data = deserialize(ctx.params.body, ctx.req.method as HTTPVerbs, Model.name, attr);
	// let representation = getRepresentation(ctx);
	//@ts-ignore
	let model = new Model(data);
	if (await model.save()) {
		ctx.status = 201;
		//@ts-ignore
		ctx.headers[StandardResponseHeaders.Location] = `${ctx.req.connection.encrypted ? 'https':'http'}://${ctx.headers[StandardRequestHeaders.Host]}${ctx.url.path}${model.id}`;
		ctx.state.KAENREST.DATA = await model.json();
	} else {
		ctx.status = 500;
	}
}