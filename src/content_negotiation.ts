import { StandardResponseHeaders, StandardRequestHeaders } from "@kaenjs/core/headers";
import { KRestContext } from './interface';
import { parseHeader, toXMl } from "@kaenjs/core/utils";
import { MimeType } from "@kaenjs/core/mime-types";

function getRepresentation(ctx:KRestContext, representation?:string) {
	if (!representation) {
		let [mediatype] = parseHeader(ctx.headers[StandardRequestHeaders.ContentType]);
		representation = (MimeType[mediatype] || 'json').replace('.', '');
	}
	return representation;
}
export async function CONTENT_NEGOTIATION(ctx: KRestContext, _: any, representation?: string) {
	let { CONTENT_RANGE, DATA, serialize } = ctx.state.KAENREST;
	representation = getRepresentation(ctx, representation);
	/**
	 *  Set All Headers
	 */
	if (CONTENT_RANGE) {
		ctx.headers[StandardResponseHeaders.ContentRange] = `${CONTENT_RANGE[0]}-${CONTENT_RANGE[1]}/${CONTENT_RANGE[2]}`;
	}
	ctx.headers[StandardResponseHeaders.AccessControlExposeHeaders] = '*';
	let body = serialize(ctx.status, DATA, representation);
	switch (representation) {
		case 'xml':
			ctx.body = toXMl(body);
			ctx.type = MimeType[".xml"];
			break;
		case 'wxml':
			ctx.body = toXMl(body);
			// ctx.body = toXMl({
			// 	response: {
			// 		code: ctx.status,
			// 		status: ctx.status >= 500 ? 'fail' : (ctx.status >= 400 ? 'error' : 'success'),
			// 		data: DATA,
			// 		message: ''
			// 	}
			// });
			ctx.type = MimeType[".xml"];
			break;
		case 'json':
			ctx.body = body;
			// ctx.body = { data: DATA };
			// ctx.body = DATA;
			break;
		case 'wjson':
			ctx.body = JSON.stringify(body);
			// ctx.body = JSON.stringify({
			// 	code: ctx.status,
			// 	status: ctx.status >= 500 ? 'fail' : (ctx.status >= 400 ? 'error' : 'success'),
			// 	data: DATA,
			// 	message: ''
			// }, null, 2);
			break;
		default:
			ctx.status = 404;
			break;
	}
	ctx.finished = true;
}