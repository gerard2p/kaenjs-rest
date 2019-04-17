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
export function REST(Model: DATABASEMODEL, version: string = '1.0', subdomain: string = 'api') {
	return function REST<T extends DATABASEMODEL>(constructor: T) {
		class model extends constructor {
			Resource = Model;
			Subdomain = process.env.KAEN_INTERNAL_SUBDOMAIN;
			Version = version;
		};
		// @ts-ignore
		new Router(subdomain).rest(new model);
		return model;
	}
}