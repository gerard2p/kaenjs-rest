import { HTTPVerbs, inflector, KaenContext, Middleware } from "@kaenjs/core";
import { StandardRequestHeaders, StandardResponseHeaders } from "@kaenjs/core/headers";
import { MimeType } from "@kaenjs/core/mime-types";
import { parseHeader, toXMl } from "@kaenjs/core/utils";
import { Router as KNRouter, RouterOptions } from '@kaenjs/router';
import { RegisterHook, RegisterRoute } from '@kaenjs/router/register';
import { posix } from "path";
import 'reflect-metadata';
import { RESTVerbs, STORAGEHOOK } from './decorators';
import { KRestContext } from './interface';
import { REST_DELETE, REST_GET, REST_POST, REST_PUT } from './verbs';
export class Restify<T> {
	CORS:string
	useVersionAsNamespace:boolean = true
	addTrailingSlash:boolean = true
	serialize(status:number, data:any, representation?:string):any {
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
	deserialize (body:any, method:HTTPVerbs, model:string, attributes:any):any {
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
	manipulate(...args:any[]) {
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
		return t.Resource;
	}
	Resource: T
	Subdomain:string
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

export { Routes, Subdomains } from '@kaenjs/router';
export { CORS, REST, ROUTE } from './decorators';
export { REST_GET, REST_POST, REST_PUT, REST_DELETE };

export class Router extends KNRouter{
	constructor(subdomain:string = 'www') {
		super(subdomain);
	}
	common(route:string, ...middleware:Middleware[]):Router {
		super.common(route, ...middleware);
		return this;
	}
	options(route:string, file:string):Router
	options(route:string, options:RouterOptions, file:string):Router
	options(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	options(route:string, ...fn: Middleware[] ):Router
	options(){
		///@ts-ignore
		super.options(...arguments);
		return this;
	}
	get(route:string, file:string):Router
	get(route:string, options:RouterOptions, file:string):Router
	get(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	get(route:string, ...fn: Middleware[] ):Router
	get(){
		///@ts-ignore
		super.get(...arguments);
		return this;
	}
	post(route:string, file:string):Router
	post(route:string, options:RouterOptions, file:string):Router
	post(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	post(route:string, ...fn: Middleware[] ):Router
	post(){
		///@ts-ignore
		super.post(...arguments);
		return this;
	}
	put(route:string, file:string):Router
	put(route:string, options:RouterOptions, file:string):Router
	put(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	put(route:string, ...fn: Middleware[] ):Router
	put(){
		///@ts-ignore
		super.put(...arguments);
		return this;
	}
	patch(route:string, file:string):Router
	patch(route:string, options:RouterOptions, file:string):Router
	patch(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	patch(route:string, ...fn: Middleware[] ):Router
	patch(){
		///@ts-ignore
		super.patch(...arguments);
		return this;
	}
	delete(route:string, file:string):Router
	delete(route:string, options:RouterOptions, file:string):Router
	delete(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	delete(route:string, ...fn: Middleware[] ):Router
	delete(){
		///@ts-ignore
		super.delete(...arguments);
		return this;
	}
	rest<T extends Restify<any>>(model:T):Router
	rest<T extends Restify<any>>(model:T, route:string):Router
	rest<T extends Restify<any>>(model:T, options:RouterOptions):Router
	rest<T extends Restify<any>>(model:T, options:RouterOptions, route:string):Router
	rest<T extends Restify<any>>(restroute:T, arg0?:string|RouterOptions, arg1?:string) {
		let route = (typeof arg0 === 'string' ? arg0 : arg1) || '';
		let options = typeof arg0 === 'number' ? arg0 : 0;
		const Model:any = Restify.getResource(restroute);
		let metadata:any = Reflect.getMetadata("vault-orm:design", Model);
		let relations = Object.getOwnPropertyNames(metadata)
			.filter(p=> metadata[p].kind && metadata[p].kind.constructor && ['RelationSingle', 'HasManyRelation'].includes(metadata[p].kind.constructor.name))
			.map(p=> {
				return {
					Model: metadata[p].kind.parentModel(),
					mode: metadata[p].kind.mode,
					property: p
				};
			});
		//@ts-ignore
		let model_name = Model.name.toLowerCase();
		let base_route =  posix.join('/', restroute.useVersionAsNamespace ? restroute.Version:'', route, inflector.pluralize(model_name));
		let Models = {[model_name]: Model};
		this.SetUpCors<T>(restroute, base_route);
		RegisterRoute(this.Subdomain, RESTVerbs, `${base_route}/?.*\.?:representation?`, [async (ctx:KaenContext)=>{
			let pheader = parseHeader(ctx.headers[StandardRequestHeaders.ContentType]).filter( h=>h.includes('version') ).map( v=>v.replace('version=', '') )[0];
			let url_chunk = ctx.url.path.replace(route, '').replace(/\..*$/, '').split('/')
				.filter(u=>u)
				.filter((e,i)=>i%2===0)
				.map(u=>inflector.singularize(u));
			let Child = Models[url_chunk.pop()];
			if(Child) {
				ctx.state.KAENREST = {
					serialize: restroute.serialize,
					deserialize: restroute.deserialize,
					manipulate: restroute.manipulate,
					MODEL: Child,
					SHOULD_COUNT: true,
					PAGINATION: [0, 25],
					Collection: undefined,
					ISCHILDQUERY: Model !== Child ? relations.filter(m=>m.Model===Child)[0].property : false
				};
				// @ts-ignore
				ctx.state.KAENREST.Collection = Model.prototype.vaultCollection();
				ctx.state.KAENREST.Model = Model;
			}
		}], options);
		RegisterRoute(this.Subdomain, [HTTPVerbs.get], `${base_route}/?:id?\\.?:representation?`, [this.AllowCors<T>(restroute), restroute.read], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.post], `${base_route}/`, [this.AllowCors<T>(restroute),restroute.create], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.put], `${base_route}/:id\\.?:representation?`, [this.AllowCors<T>(restroute),restroute.update], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.delete], `${base_route}/:id`, [this.AllowCors<T>(restroute),restroute.delete], options );
		this.SetUpRelations<T>(relations, Models, base_route, restroute);
		this.SetUpMethods<T>(restroute, base_route);
		return this;
	}
	private AllowCors<T extends Restify<any>>(restroute: T):any {
		let route = this;
		let cors = restroute.CORS.split(',');
		function corsfn(ctx:KaenContext) {
			ctx.headers[StandardResponseHeaders.AccessControlAllowOrigin] = route.validateCORS(ctx, cors);
		}
		return restroute.CORS ? corsfn : undefined;
	}
	private validateCORS(ctx:KaenContext, cors:string[]) {
		let request = ctx.headers[StandardRequestHeaders.Origin]; //.split('//')[1];
		let match = cors.includes('*') || cors.some(origin=>request.includes(origin));
		return match ? ctx.headers[StandardRequestHeaders.Origin] : undefined;
		// console.log(request);

	}
	private SetUpCors<T extends Restify<any>>(restroute: T, base_route:string) {
		if (restroute.CORS) {
			let cors = restroute.CORS.split(',');
			RegisterRoute(this.Subdomain, [HTTPVerbs.options], posix.join(base_route, '.*'), [async (ctx) => {
				ctx.headers[StandardResponseHeaders.AccessControlAllowMethods] = ctx.headers[StandardRequestHeaders.AccessControlRequestMethod];
				ctx.headers[StandardResponseHeaders.AccessControlAllowHeaders] = 'content-type';
				ctx.headers[StandardResponseHeaders.AccessControlAllowOrigin] = this.validateCORS(ctx, cors);
				ctx.status = 200;
			}]);
		}
	}

	private SetUpMethods<T extends Restify<any>>(restroute:T, base_route:String) {
		let rest_methods = Restify.getAllMethods(restroute).filter(f=>!['read','create','update','partial_update', 'delete', 'manipulate'].includes(f));
		for(const rest_method_name of rest_methods) {
			const {method=HTTPVerbs.post, route=posix.join('/', rest_method_name,restroute.addTrailingSlash?'/':'')}  = Reflect.getMetadata('kaen:rest',restroute[rest_method_name]) || {};
			RegisterRoute(this.Subdomain, [method], posix.join(base_route, route), [this.AllowCors<T>(restroute),restroute[rest_method_name]] );
		}
	}
	private SetUpRelations<T extends Restify<any>>( relations: { Model: any; mode: any; property: string; }[], Models: { [x: number]: any; }, base_route: string, restroute:T ) {
		for (const relation of relations) {
			let ChildModel = relation.Model;
			//@ts-ignore
			let model_name = ChildModel.name.toLowerCase();
			Models[model_name] = ChildModel;
			this.rest_related(ChildModel, `${base_route}/:id`, restroute, ['belongsto', 'hasone'].includes(relation.mode));
		}
	}

	private rest_related<T extends Restify<any>>(Model:T, route:string, restroute:T, single:boolean=false) {
		//@ts-ignore
		let name = single ? Model.name.toLowerCase() : inflector.pluralize(Model.name.toLowerCase());
		let path =  `${route}/${name}`;
		RegisterRoute(this.Subdomain, [HTTPVerbs.get], `${path}\\.?:representation?`, [REST_GET, CONTENT_NEGOTIATION] );
	}
}
RegisterHook(()=>{
	for(let hook of Array.from(STORAGEHOOK.keys()) ) {
		//@ts-ignore
		let m = new hook();
		new Router(m.Subdomain).rest(m);
	}
});
