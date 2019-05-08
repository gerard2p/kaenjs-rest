import { REST_GET, REST_POST, REST_PUT, REST_DELETE } from "./verbs";
import { KaenContext, HTTPVerbs } from "@kaenjs/core";
import { CONTENT_NEGOTIATION } from "./content_negotiation";
import { RouterModel, Ignore } from "@kaenjs/router";

export class Restify<T> extends RouterModel {
	useVersionAsNamespace:boolean = true
	addTrailingSlash:boolean = true
	@Ignore serialize(status:number, data:any, representation?:string):any {
		switch (representation) {
			case 'xml':
				return { response: {data} };
			case 'wxml':
				return {
					response: {
						code: status,
						status: status >= 500 ? 'fail' : (status >= 400 ? 'error' : 'success'),
						data,
						message: ''
					}
				};
			case 'json':
				return {data};
			case 'wjson':
				return {
					code: status,
					status: status >= 500 ? 'fail' : (status >= 400 ? 'error' : 'success'),
					data,
					message: ''
				};
			default:
				return undefined;
		}
	}
	@Ignore deserialize (body:any, method:HTTPVerbs, model:string, attributes:any):any {
		for(const key of Object.keys(body)) {
			if( attributes[key] )
			switch(attributes[key].kind) {
				case 'number':
						body[key] = parseFloat(body[key]);
						break;
                    case 'date':
                        body[key] = new Date(body[key]);
						break;
					default:
					if (typeof attributes[key].kind === 'function') {
						let {kind} = attributes[key];
						let Collection;
						switch(kind.mode) {
							case 'belongsto':
								// Collection = kind.sourceModel.prototype.vaultCollection()
								body[key] = body[key].id ? body[key].id : body[key];
								// body[attributes[key].kind.childKey] = Collection.toId(body[key]);
								// delete body[key];
								break;
							case 'hasmany':
								// Collection = kind.parentModel.prototype.vaultCollection()
								body[key] = body[key].map(id=>(id.id ? id.id:id));
								break;

						}
					}
						break;
			}
		}
		return body;
	}
	@Ignore manipulate(...args:any[]) {
		return args[0];
	}
	static getAllMethods = (obj) => {
		let props = []

		do {
			const l = Object.getOwnPropertyNames(obj)
				// .concat(Object.getOwnPropertySymbols(obj).map(s => s.toString()))
				.sort()
				.filter((p, i, arr) =>
					typeof obj[p] === 'function' &&  //only the methods
					!['constructor', 'Resource',
					'read',
					'create',
					'update',
					'partial_update',
					'delete',
					'serialize',
					'deserialize'].includes(p) &&
					(i == 0 || p !== arr[i - 1]) &&  //not overriding in this prototype
					props.indexOf(p) === -1          //not overridden in a child
				)
			props = props.concat(l)
		}
		while (
			(obj = Object.getPrototypeOf(obj)) &&   //walk-up the prototype chain
			Object.getPrototypeOf(obj)              //not the the Object prototype methods (hasOwnProperty, etc...)
		)

		return props
	}
	static getResource<K>(t: Restify<K>) {
		return t.Resource.Model;
	}
	Resource: {Model:T}
	Version: string
	async read(ctx:KaenContext, id:string, representation:string) {
		await REST_GET(ctx, id);
		await CONTENT_NEGOTIATION(ctx, id, representation);
	}
	async create(ctx:KaenContext, id:string, representation:string) {
		await REST_POST(ctx);
		await CONTENT_NEGOTIATION(ctx, id, representation);
	}
	async update(ctx:KaenContext, id:string, representation:string) {
		await REST_PUT(ctx, id, representation);
		// await CONTENT_NEGOTIATION(ctx, id, representation);
	}
	async partial_update(ctx:KaenContext, id:string, representation:string) {
		await REST_PUT(ctx, id, representation);
		// await CONTENT_NEGOTIATION(ctx, id, representation);
	}
	async delete(ctx:KaenContext, id:string, representation:string) {
		await REST_DELETE(ctx, id);
		// await CONTENT_NEGOTIATION(ctx, id, representation);
	}
}