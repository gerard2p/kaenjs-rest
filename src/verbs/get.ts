import { StandardRequestHeaders } from "@kaenjs/core/headers";
import { targetPathNoSrc } from "@kaenjs/core/utils";
import { isRegExp } from "util";
import { KRestContext } from "../interface";
import 'reflect-metadata';
export async function REST_GET(ctx: KRestContext, id: any = null) {
	if (!ctx.state.KAENREST) return;
	let { Collection, ISCHILDQUERY, SHOULD_COUNT, PAGINATION, manipulate } = ctx.state.KAENREST;
	let offset, limit, count, search: string, sort: string, total;
	let CountQuery;
	if (id) {
		let data = await Collection.findOne(id);
		if (ISCHILDQUERY) {
			data = await data[ISCHILDQUERY]();
		}
		ctx.state.KAENREST.DATA = data.json();
	} else {
		let Range: string = ctx.headers[StandardRequestHeaders.Range];
		let query = Collection;
		({ offset=0, limit, search, sort } = ctx.params.query);
		delete ctx.params.query.offset;
		delete ctx.params.query.limit;
		delete ctx.params.query.search;
		delete ctx.params.query.sort;
		if ((!limit && !offset) && Range) {
			([offset = 0, limit] = Range.split('=')[1].split('-'));

		}
		// else if ((!limit && !offset)) {
		// 	([offset, limit] = PAGINATION);
		// }
		offset = parseInt(offset) || 0;
		limit = parseInt(limit) || 0;
		if (offset) {
			query = query.skip(parseInt(offset));
		}
		if (limit) {
			query = query.limit(parseInt(limit));
		}
		if (search) {
			// console.log(search);
			let exp = /([^\":\|]*)::([^\|":]*)/g;
			let res;
			while (res = exp.exec(search)) {
				let [_, key, value] = res;
				if (value.includes('ObjectId_')) {
					const OId = require(targetPathNoSrc('node_modules/mongodb')).ObjectId
					value = new OId(value.replace('ObjectId_', ''));
				}
				if (value.includes('reg\'') ) {
					let r = new RegExp(value.replace('reg\'', ''));
					value = isRegExp(r)  ? r : value;
				}
				query = query.where({ [key]: value });
			}
		}
		if (manipulate)query = manipulate(query, ctx.params.query);
		for(const key of Object.keys(ctx.params.query)) {
			let value = ctx.params.query[key];
			if (value.includes('ObjectId_')) {
				const OId = require(targetPathNoSrc('node_modules/mongodb')).ObjectId
				value = new OId(value.replace('ObjectId_', ''));
			}
			if (value.includes('reg\'') ) {
				let r = new RegExp(value.replace('reg\'', ''));
				value = isRegExp(r)  ? r : value;
			}
			query = query.where({ [key]: value });
		}
		if (sort) {
			let dir = sort.includes('-') ? -1 : 1;
			sort = sort.replace('-', '');
			query = query.sort(sort, dir);
		}
		count = true; //SHOULD_COUNT ? Collection.count() : '*';
		CountQuery = query;
		let find_query = await query.find();
		ctx.state.KAENREST.DATA = Promise.all(find_query.map(r => r.json()));
	}
	let data = await ctx.state.KAENREST.DATA;
	if (count && limit) {
		total = SHOULD_COUNT ? await CountQuery.count() : '*';
		ctx.state.KAENREST.CONTENT_RANGE = [offset, offset + limit, total];
	}
	ctx.state.KAENREST.DATA = data;
}