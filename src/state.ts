import { HTTPVerbs } from "@kaenjs/core";
import { VaultCollection } from "@gerard2p/vault-orm/collection";
import { VaultModel } from "@gerard2p/vault-orm/model";

export interface KAENREST {
	serialize: (status:number, data:any, representation?: string) => any
	deserialize: (data:any, method:HTTPVerbs, model:string, attributes:any) => any
	manipulate:(...args:any[]) => any
	SHOULD_COUNT: boolean
	PAGINATION: [number, number]
	Collection: VaultCollection<VaultModel<any>>
	Model:VaultModel<any>
	CONTENT_RANGE: [number, number, number | string]
	ISCHILDQUERY: string,
	DATA: any
}