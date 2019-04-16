import { HTTPVerbs } from "@kaenjs/core";
import 'reflect-metadata';
export const RESTVerbs = [HTTPVerbs.get, HTTPVerbs.post, HTTPVerbs.put, HTTPVerbs.patch, HTTPVerbs.delete];
export type DATABASEMODEL = { new(...args: any[]): {} };
export function Route(route:string, method: HTTPVerbs=HTTPVerbs.post) {
	return function (target: any, key: string, descriptor) {
		console.log(method, route);
		Reflect.defineMetadata('kaen:rest', {method, route} ,target[key]);
	}
}
export function Verb(method: HTTPVerbs) {
	return function (target: any, key: string, descriptor) {

	}
}
export function Resource(Model: any) {
	return function Resource<T extends DATABASEMODEL>(constructor: T) {
		return class extends constructor {
			Resource = Model;
		}
	}
}
export function Domain(subdomain: string = 'api', version: string = '1.0') {
	return function Domain<T extends DATABASEMODEL>(constructor: T) {
		return class extends constructor {
			Subdomain = process.env.KAEN_INTERNAL_SUBDOMAIN;
			Version = version;
		}
	}
}
export function REST(Model: DATABASEMODEL, subdomain: string = 'api', version: string = '1.0') {
	return function REST<T extends DATABASEMODEL>(constructor: T) {
		return class extends constructor {
			Resource = Model;
			Subdomain = process.env.KAEN_INTERNAL_SUBDOMAIN;
			Version = version;
		} as T;
	}
}

export function OKRest<T>(Model:T, version:string='1.0') {

}