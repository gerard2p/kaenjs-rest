import { HTTPVerbs } from "@kaenjs/core";
import { STORAGEHOOK, DATABASEMODEL } from "@kaenjs/router";
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
