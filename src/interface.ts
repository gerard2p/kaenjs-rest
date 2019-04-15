import { KaenContext } from "@kaenjs/core";
import { KAENREST } from "./state";
export interface KRestContext extends KaenContext {
    state: {
        KAENREST:KAENREST
    }
}