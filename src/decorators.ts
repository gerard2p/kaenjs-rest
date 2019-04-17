import { HTTPVerbs } from "@kaenjs/core";
import 'reflect-metadata';
import { Router } from ".";
export const RESTVerbs = [HTTPVerbs.get, HTTPVerbs.post, HTTPVerbs.put, HTTPVerbs.patch, HTTPVerbs.delete];
export type DATABASEMODEL = { new(...args: any[]): {} };
export function ROUTE(method: HTTPVerbs=HTTPVerbs.post, route?:string) {
	return function (target: any, key: string, descriptor) {
		Reflect.defineMetadata('kaen:rest', {method, route} ,target[key]);
	}
}
export const STORAGEHOOK = new Map<object, any>();
export function REST(Model: DATABASEMODEL, version: string = '1.0', subdomain: string = 'api') {
	return function REST<T extends DATABASEMODEL>(constructor: T) {
		class model extends constructor {
			Resource = Model;
			Subdomain = subdomain;
			Version = version;
		};
		if ( STORAGEHOOK.has(constructor) ) {
			STORAGEHOOK.delete(constructor);
		}
		STORAGEHOOK.set(model, 'rest');
		return model;
	}
}
export function CORS(origin:string) {
	return function CORS<T extends DATABASEMODEL>(constructor: T) {
		class model extends constructor {
			CORS= origin;
		};
		if ( STORAGEHOOK.has(constructor) ) {
			STORAGEHOOK.delete(constructor);
		}
		STORAGEHOOK.set(model, 'cors');
		return model;
	}
}
