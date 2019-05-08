import { HTTPVerbs } from "@kaenjs/core";
import { STORAGEHOOK } from "@kaenjs/router";
export const RESTVerbs = [HTTPVerbs.get, HTTPVerbs.post, HTTPVerbs.put, HTTPVerbs.patch, HTTPVerbs.delete];
export type DATABASEMODEL = { new(...args: any[]): {} };
export function REST(Model: DATABASEMODEL, version: string = '1.0', subdomain: string = 'api') {
	return function REST<T extends DATABASEMODEL>(constructor: T) {
		class model extends constructor {
			Resource = {Model};
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
