import { HTTPVerbs, inflector, KaenContext, Middleware } from "@kaenjs/core";
import { StandardRequestHeaders, StandardResponseHeaders } from "@kaenjs/core/headers";
import { parseHeader } from "@kaenjs/core/utils";
import { Router as KNRouter, RouterOptions, RESTVerbs } from '@kaenjs/router';
import { RegisterRoute } from '@kaenjs/router/register';
import { posix } from "path";
import 'reflect-metadata';
import { CONTENT_NEGOTIATION } from "./content_negotiation";
import { RouterModel } from "./model";
import { REST_DELETE, REST_GET, REST_POST, REST_PUT } from './verbs';
import { getMetadata, setMetadata } from '@kaenjs/router/metadata';
import { definitionFor, getSchemaFor } from "@gerard2p/vault-orm";


export { Routes, Subdomains } from '@kaenjs/router';
export * from './decorators';
export * from '@kaenjs/router/decorator';
export { REST_GET, REST_POST, REST_PUT, REST_DELETE, RouterModel as Restify, RouterModel };

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
	rest<T extends RouterModel<any>>(model:T):Router
	rest<T extends RouterModel<any>>(model:T, route:string):Router
	rest<T extends RouterModel<any>>(model:T, options:RouterOptions):Router
	rest<T extends RouterModel<any>>(model:T, options:RouterOptions, route:string):Router
	rest<T extends RouterModel<any>>(restroute:T, arg0?:string|RouterOptions, arg1?:string) {
		let route = (typeof arg0 === 'string' ? arg0 : arg1) || '';
		let options = typeof arg0 === 'number' ? arg0 : 0;
		const Model:any = RouterModel.getResource(restroute);
		let md = definitionFor(Model);
		let {related, defined, masked, naked} = getSchemaFor(Model);
		// let rels = ;
		let metadata:any = Reflect.getMetadata("vault-orm:design", Model);
		let relations = Object.getOwnPropertyNames(md)
			.filter(p=> typeof(md[p].kind) === 'function')
			.map(p=> {
				return {
					Model: metadata[p].kind.childResolver(),
					mode: metadata[p].kind.constructor.name,
					property: p
				};
			});
		//@ts-ignore
		let model_name = Model.name.toLowerCase();
		let root_route = posix.join('/', restroute.useVersionAsNamespace ? restroute.Version:'', route );
		let base_route =  posix.join('/', restroute.useVersionAsNamespace ? restroute.Version:'', route, inflector.pluralize(model_name));
		let Models = {[model_name]: Model};
		RegisterRoute(this.Subdomain, RESTVerbs, `${base_route}/?.*\.?:representation?`, [async (ctx:KaenContext)=>{
			let pheader = parseHeader(ctx.headers[StandardRequestHeaders.ContentType]).filter( h=>h.includes('version') ).map( v=>v.replace('version=', '') )[0];
			let url_chunk = ctx.url.path.replace(root_route, '').replace(/\..*$/, '').split('/')
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
		}], options, undefined, true);
		RegisterRoute(this.Subdomain, [HTTPVerbs.get], `${base_route}/?:id?\\.?:representation?`, [ restroute.read], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.post], `${base_route}/`, [restroute.create], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.put], `${base_route}/:id\\.?:representation?`, [restroute.update], options );
		RegisterRoute(this.Subdomain, [HTTPVerbs.delete], `${base_route}/:id`, [restroute.delete], options );
		this.SetUpRelations<T>(relations, Models, base_route, restroute);
		this.SetUpMethods<T>(restroute, base_route);
		return this;
	}
	private SetUpMethods<T extends RouterModel<any>>(restroute:T, base_route:String) {
		let rest_methods = RouterModel.getAllMethods(restroute).filter(f=>!['read','create','update','partial_update', 'delete', 'manipulate'].includes(f));
		for(const rest_method_name of rest_methods) {
			const {method=HTTPVerbs.post, route=posix.join('/', rest_method_name,restroute.addTrailingSlash?'/':'')}  = getMetadata(restroute[rest_method_name]);
			RegisterRoute(this.Subdomain, [method], posix.join(base_route, route), [restroute[rest_method_name]] );
		}
	}
	private SetUpRelations<T extends RouterModel<any>>( relations: { Model: any; mode:string; property: string; }[], Models: { [x: number]: any; }, base_route: string, restroute:T ) {
		for (const relation of relations) {
			let ChildModel = relation.Model;
			//@ts-ignore
			let model_name = ChildModel.name.toLowerCase();
			Models[model_name] = ChildModel;
			this.rest_related(ChildModel, `${base_route}/:id`, restroute, ['BelongsToeRelation', 'HasOneRelation'].includes(relation.mode));
		}
	}
	private rest_related<T extends RouterModel<any>>(Model:T, route:string, restroute:T, single:boolean=false) {
		//@ts-ignore
		let name = single ? Model.name.toLowerCase() : inflector.pluralize(Model.name.toLowerCase());
		let path =  `${route}/${name}`;
		RegisterRoute(this.Subdomain, [HTTPVerbs.get], `${path}\\.?:representation?`, [REST_GET, CONTENT_NEGOTIATION] );
	}
}
RouterModel.setup = (model:RouterModel<any>)=>{
	for(const method_name of RouterModel.getAllMethos(model) ) {
		let defined_headers = model.CORS ? (model.CORS.headers||[]) : [];
		defined_headers.push('Content-Type');
		if(method_name === 'read') {
			defined_headers.push('Range');
		}
		defined_headers = defined_headers.filter((h,i)=>defined_headers.indexOf(h)===i);
		setMetadata(model[method_name], {
			access_control_allow: model.CORS
		});
		setMetadata(model[method_name], {
			access_control_allow: {
				headers: defined_headers,
				methods:true
			}
		});
	}
	new Router(model.Subdomain).rest(model);
}